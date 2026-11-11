import {MongoError, ObjectId} from "mongodb";
import {escapeRegex} from "@coreModule/utilities/helpers";
import type {ClientSession} from "mongoose";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {ServerError} from "armonia/src/modules/core/types";
import type {PayPosOrderFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/payPosOrder.form.validator";
import type {RefundPosOrderFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/refundPosOrder.form.validator";
import type {CashMovePosSessionFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/cashMovePosSession.form.validator";
import type {ClosePosSessionFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/closePosSession.form.validator";
import {userService} from "@coreModule/database/schemas/user/user.service";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import type {IPosConfig} from "@eCommerceModule/database/schemas/posConfig/posConfig";
import {posConfigService} from "@eCommerceModule/database/schemas/posConfig/posConfig.service";
import PosSession from "@eCommerceModule/database/schemas/posSession/posSession";
import {posSessionService} from "@eCommerceModule/database/schemas/posSession/posSession.service";
import PosOrder, {IPosOrder, type IPosOrderLine} from "@eCommerceModule/database/schemas/posOrder/posOrder";
import {posOrderService} from "@eCommerceModule/database/schemas/posOrder/posOrder.service";
import {posPaymentMethodService} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod.service";
import {productVariantService, variantOptionsLabel} from "@eCommerceModule/database/schemas/productVariant/productVariant.service";
import {fiscalConfigService} from "@financeModule/database/schemas/fiscalConfig/fiscalConfig.service";
import {inventoryMovementService} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.service";
import {paymentTransactionService} from "@financeModule/database/schemas/paymentTransaction/paymentTransaction.service";
import {generateOrderNumber} from "@eCommerceModule/utilities/services/orderNumberService";
import {posOrderToDTO} from "@eCommerceModule/utilities/mappers/posOrder/posOrderMapper.dto";
import {posSessionToDTO} from "@eCommerceModule/utilities/mappers/posSession/posSessionMapper.dto";
import {posConfigToDTO} from "@eCommerceModule/utilities/mappers/posConfig/posConfigMapper.dto";
import {
    buildDraftLines,
    buildReceiptFromPosOrder,
    getPosSessionReconciliation,
    rebuildPaidPosResult,
    refToId,
} from "@eCommerceModule/workflows/posTillOps";
import {warehouseIdsFromPosConfig} from "@eCommerceModule/utilities/services/warehousePosConfigGuard";
import {
    assertPosTillMutable,
    clearInFlightTerminalCharge,
    getCompanyPosLock,
    isCompanyPosLockActive,
    registerInFlightTerminalCharge,
} from "@eCommerceModule/utilities/services/posKillSwitch";
import {buildPosTerminalUrl, normalizePosTerminalPath} from "@eCommerceModule/utilities/services/posTerminalUrl";
import {decimal128FromMinor} from "@coreModule/utilities/helpers/money";
import {allocateMinor, fromMinor, minorToNumber, percentOfMoney, prorateMoney, roundToCurrency, subtractMoney, sumMinor, sumMoney, toMinor, type MoneyInput} from "armonia/src/modules/core/helpers/money";
import {currencyDecimalPlaces} from "@financeModule/utilities/services/currencyDecimals";
import {posLineRefundTotal, posRefundAmount} from "armonia/src/modules/eCommerce/helpers/posRefundAmount";
import {POS_UNSELLABLE_TYPES} from "@eCommerceModule/utilities/services/posLinePrice";
import {isStockTracked, trackedStockLines} from "@eCommerceModule/utilities/services/inventoryReservationService";
import {calculateInclusiveTax} from "@eCommerceModule/utilities/services/taxCalculationService";
import {fiscalizePosOrder} from "@eCommerceModule/utilities/fiscalization/posFiscalization";
import {runInTransaction} from "@coreModule/utilities/middlewares/runInTransaction";

/** What a POS order DTO and receipt read. */
const POS_ORDER_POPULATE = "session config cashier customer payments.paymentMethod";

type Ctx = {
    logger: any;
    languageCode: string;
    company: {_id: ObjectId; name?: string; vat?: string};
    userId: ObjectId;
    session?: ClientSession;
};


async function generatePosOrderName(companyId: ObjectId, session?: ClientSession): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `POS/${year}/`;
    const [last] = await posOrderService.find(
        {company: companyId, name: {$regex: `^${prefix.replace(/\//g, "\\/")}`}},
        {session},
        undefined,
        "name",
        {createdAt: -1},
        1,
    );
    let sequence = 1;
    if (last?.name) {
        const parts = last.name.split("/");
        const lastSeq = parseInt(parts[parts.length - 1], 10);
        if (!isNaN(lastSeq)) sequence = lastSeq + 1;
    }
    return `${prefix}${String(sequence).padStart(5, "0")}`;
}

async function generateSessionName(configName: string, companyId: ObjectId, session?: ClientSession): Promise<string> {
    const day = new Date().toISOString().slice(0, 10);
    const prefix = `${configName}/${day}/`;
    const count = await posSessionService.count({company: companyId, name: {$regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`}}, {session});
    return `${prefix}${count + 1}`;
}

/** Direct POS sale: decrement on-hand without prior reservation. */
async function consumePosStock(params: {
    productId: ObjectId;
    variantId?: ObjectId;
    warehouseId: ObjectId;
    quantity: number;
    companyId: ObjectId;
    posOrderId: ObjectId;
    auditUserId: ObjectId;
    allowOversell?: boolean;
    ctx: Ctx;
}): Promise<void> {
    const {productId, variantId, warehouseId, quantity, companyId, posOrderId, auditUserId, allowOversell, ctx} =
        params;
    const filter: Record<string, unknown> = {
        product: productId,
        warehouse: warehouseId,
        company: companyId,
        variant: variantId ?? null,
        deletedAt: null,
    };

    const before = await inventoryService.findOne(filter, {session: ctx.session}, undefined, "quantityOnHand quantityReserved");
    const onHand = before?.quantityOnHand ?? 0;
    const reserved = before?.quantityReserved ?? 0;
    if (!allowOversell && onHand - reserved < quantity) {
        throw apiValidationException("pos_insufficient_stock", "quantity", null, ctx.languageCode);
    }

    const updated = await inventoryService.takeStock(
        {product: productId, variant: variantId, warehouse: warehouseId, company: companyId},
        quantity,
        !!allowOversell,
        ctx,
    );
    if (!updated) {
        throw apiValidationException("pos_insufficient_stock", "quantity", null, ctx.languageCode);
    }

    const quantityAfter = updated.quantityOnHand;
    await inventoryMovementService.create(
        {
            inventory: updated?._id,
            product: productId,
            variant: variantId,
            warehouse: warehouseId,
            quantity: -quantity,
            reason: "sale",
            quantityBefore: onHand,
            quantityAfter,
            performedBy: auditUserId,
            referenceType: "PosOrder",
            referenceId: posOrderId,
            company: companyId,
        },
        {logger: ctx.logger, languageCode: ctx.languageCode, session: ctx.session, auditUserId},
    );
}

/** Allocate a sale across the till's warehouses (fill from each until quantity is met). */
async function consumePosStockAcrossWarehouses(params: {
    productId: ObjectId;
    variantId?: ObjectId;
    warehouseIds: ObjectId[];
    quantity: number;
    companyId: ObjectId;
    posOrderId: ObjectId;
    auditUserId: ObjectId;
    allowOversell?: boolean;
    ctx: Ctx;
}): Promise<void> {
    const {warehouseIds, quantity, allowOversell, ctx, ...rest} = params;
    if (!warehouseIds.length) {
        throw apiValidationException("pos_config_warehouse_required", "warehouses", null, ctx.languageCode);
    }

    let remaining = quantity;
    for (let i = 0; i < warehouseIds.length; i++) {
        if (remaining <= 0.0001) break;
        const warehouseId = warehouseIds[i]!;
        const isLast = i === warehouseIds.length - 1;
        const filter: Record<string, unknown> = {
            product: rest.productId,
            warehouse: warehouseId,
            company: rest.companyId,
            variant: rest.variantId ?? null,
            deletedAt: null,
        };
        const before = await inventoryService.findOne(filter, {session: ctx.session}, undefined, "quantityOnHand quantityReserved");
        const available = Math.max(0, (before?.quantityOnHand ?? 0) - (before?.quantityReserved ?? 0));
        let take = Math.min(remaining, available);
        if (allowOversell && isLast) take = remaining;
        if (take <= 0.0001) continue;

        await consumePosStock({
            ...rest,
            warehouseId,
            quantity: take,
            allowOversell: !!(allowOversell && isLast),
            ctx,
        });
        remaining = roundQuantity(remaining - take);
    }

    if (remaining > 0.0001) {
        throw apiValidationException("pos_insufficient_stock", "quantity", null, ctx.languageCode);
    }
}

async function restockPosStock(params: {
    productId: ObjectId;
    variantId?: ObjectId;
    warehouseId: ObjectId;
    quantity: number;
    companyId: ObjectId;
    posOrderId: ObjectId;
    auditUserId: ObjectId;
    ctx: Ctx;
}): Promise<void> {
    const {productId, variantId, warehouseId, quantity, companyId, posOrderId, auditUserId, ctx} = params;
    const filter: Record<string, unknown> = {
        product: productId,
        warehouse: warehouseId,
        company: companyId,
        variant: variantId ?? null,
        deletedAt: null,
    };
    const before = await inventoryService.findOne(filter, {session: ctx.session}, undefined, "quantityOnHand");
    const onHand = before?.quantityOnHand ?? 0;
    const updated = await inventoryService.addStock(
        {product: productId, variant: variantId, warehouse: warehouseId, company: companyId},
        quantity,
        ctx,
    );
    await inventoryMovementService.create(
        {
            inventory: updated._id,
            product: productId,
            variant: variantId,
            warehouse: warehouseId,
            quantity,
            reason: "return",
            quantityBefore: onHand,
            quantityAfter: onHand + quantity,
            performedBy: auditUserId,
            referenceType: "PosOrder",
            referenceId: posOrderId,
            company: companyId,
        },
        {logger: ctx.logger, languageCode: ctx.languageCode, session: ctx.session, auditUserId},
    );
}

/** Where a till sells: its first warehouse's address, which decides the VAT rates. */
function posTaxAddress(config: Pick<IPosConfig, "warehouses">): {country: string; state?: string; postalCode?: string} | null {
    const warehouse = config.warehouses?.[0];
    const country = nestedEntityToRef(warehouse?.address?.country);
    if (!country) return null;
    const state = nestedEntityToRef(warehouse?.address?.state);
    return {country: country.toString(), state: state?.toString(), postalCode: warehouse?.address?.postalCode};
}

function stockKeyOf(productId: unknown, variantId?: unknown): string {
    return `${String(productId)}:${variantId ? String(variantId) : ""}`;
}

/**
 * Per stock key, how much each warehouse can still take back from a POS sale:
 * the sale's `sale` movements minus the `return` movements of its earlier refunds.
 */
async function returnableByWarehouse(posOrderId: ObjectId, ctx: Ctx): Promise<Map<string, Map<string, number>>> {
    const refunds = await posOrderService.find({refundOf: posOrderId, company: ctx.company._id}, {session: ctx.session}, undefined, "_id");
    const movements = await inventoryMovementService.find(
        {
            company: ctx.company._id,
            referenceType: "PosOrder",
            $or: [
                {referenceId: posOrderId, reason: "sale"},
                {referenceId: {$in: refunds.map(refund => refund._id)}, reason: "return"},
            ],
        },
        {session: ctx.session, logger: ctx.logger, languageCode: ctx.languageCode},
    );

    const returnable = new Map<string, Map<string, number>>();
    for (const movement of movements) {
        const key = stockKeyOf(nestedEntityToRef(movement.product), nestedEntityToRef(movement.variant));
        const warehouse = String(nestedEntityToRef(movement.warehouse));
        const perWarehouse = returnable.get(key) ?? new Map<string, number>();
        // Sales are negative movements (adds to what can come back), returns positive
        perWarehouse.set(warehouse, roundQuantity((perWarehouse.get(warehouse) ?? 0) - movement.quantity));
        returnable.set(key, perWarehouse);
    }
    return returnable;
}


/** Stock quantities are not money: plain rounding to two places, as before. */
function roundQuantity(value: number): number {
    return Math.round(value * 100) / 100;
}

export async function openPosSession(
    body: {configId: string; openingBalance?: number; notes?: string},
    ctx: Ctx,
) {
    const config = await posConfigService.findOne({
        _id: body.configId,
        company: ctx.company._id,
    }, {withDeleted: false}, "paymentMethods warehouses currency managers fiscalConfig");

    if (!config) throw apiValidationException("pos_config_not_found", "configId", null, ctx.languageCode);

    await assertPosTillMutable(config, ctx);

    const currencyId = nestedEntityToRef(config.currency);
    if (!currencyId) {
        throw apiValidationException("pos_currency_required", "currency", null, ctx.languageCode);
    }

    const existing = await posSessionService.findOne({
        company: ctx.company._id,
        config: config._id,
        state: {$in: ["opening_control", "opened", "closing_control"]},
    }, {withDeleted: false});
    if (existing) {
        throw apiValidationException("pos_session_already_open", "configId", null, ctx.languageCode);
    }

    const openingBalance = roundToCurrency(body.openingBalance ?? 0, await currencyDecimalPlaces(currencyId, ctx.session));
    const name = await generateSessionName(config.name, ctx.company._id, ctx.session);
    const now = new Date();

    const doc = new PosSession({
        name,
        config: config._id,
        currency: currencyId,
        state: "opened",
        openedBy: ctx.userId,
        openedAt: now,
        openingBalance,
        expectedCash: openingBalance,
        cashRegisterBalance: openingBalance,
        cashMoves: [],
        orderCount: 0,
        totalSales: 0,
        totalCash: 0,
        totalCard: 0,
        notes: body.notes,
        company: ctx.company._id,
    });
    await doc.save({session: ctx.session});

    const populated = await posSessionService.findById(doc._id, {session: ctx.session}, "config currency openedBy");
    const companyLock = await getCompanyPosLock(ctx.company._id, ctx.session);
    const companyLockActive = isCompanyPosLockActive(companyLock);
    return {
        session: posSessionToDTO(populated!),
        config: posConfigToDTO(config, {
            companyLockActive,
            companyPauseReason: companyLock?.pauseReason ?? null,
        }),
    };
}

export async function getCurrentPosSession(configId: string | undefined, ctx: Ctx) {
    const filter: Record<string, unknown> = {
        company: ctx.company._id,
        state: {$in: ["opening_control", "opened", "closing_control"]},
    };
    if (configId) {
        if (!ObjectId.isValid(configId)) {
            throw apiValidationException("pos_config_not_found", "configId", null, ctx.languageCode);
        }
        filter.config = new ObjectId(configId);
    }

    const [session] = await posSessionService.find(filter, {withDeleted: false}, "config currency openedBy closedBy", undefined, {openedAt: -1, createdAt: -1}, 1);
    if (!session) return null;

    const config = await posConfigService.findOne({_id: session.config}, {}, "paymentMethods warehouses currency managers pausedBy fiscalConfig");
    const companyLock = await getCompanyPosLock(ctx.company._id);
    const companyLockActive = isCompanyPosLockActive(companyLock);
    return {
        session: posSessionToDTO(session),
        config: config
            ? posConfigToDTO(config, {
                  companyLockActive,
                  companyPauseReason: companyLock?.pauseReason ?? null,
              })
            : undefined,
    };
}

export async function cashMovePosSession(body: CashMovePosSessionFormType, ctx: Ctx) {
    const sessionDoc = await posSessionService.findOne({
        _id: body._id,
        company: ctx.company._id,
    }, {withDeleted: false});
    if (!sessionDoc) throw apiValidationException("pos_session_not_found", "_id", null, ctx.languageCode);
    if (sessionDoc.state !== "opened") {
        throw apiValidationException("pos_session_not_opened", "_id", null, ctx.languageCode);
    }
    const decimals = await currencyDecimalPlaces(nestedEntityToRef(sessionDoc.currency), ctx.session);

    {
        const gateConfig = await posConfigService.findOne({_id: sessionDoc.config});
        if (!gateConfig) throw apiValidationException("pos_config_not_found", "_id", null, ctx.languageCode);
        await assertPosTillMutable(gateConfig, ctx);
    }

    if (body.type === "out") {
        const config = await posConfigService.findOne({_id: sessionDoc.config});
        const {hasAnyManagerPin, managerPinMatchesForUser} = await import(
            "@eCommerceModule/utilities/services/posManagerPin"
        );
        if (config?.pinForCashOut && hasAnyManagerPin(config)) {
            const approvedBy = body.managerId
                ? await managerPinMatchesForUser(config, body.managerId, body.managerPin || "")
                : null;
            if (!body.managerPin || !body.managerId || !approvedBy) {
                throw apiValidationException("pos_manager_pin_invalid", "managerPin", null, ctx.languageCode);
            }
        }
    }

    const amount = roundToCurrency(body.amount, decimals);
    // The form's 0.01 floor knows no currency: 0.4 in a 0-decimal till would store a 0 move (GLB-08)
    if (toMinor(amount, decimals) <= 0n) {
        throw apiValidationException("pos_cash_move_amount_invalid", "amount", null, ctx.languageCode);
    }
    if (body.type === "out" && toMinor(sessionDoc.cashRegisterBalance, decimals) < toMinor(amount, decimals)) {
        throw apiValidationException("pos_insufficient_cash", "amount", null, ctx.languageCode);
    }

    const delta = body.type === "in" ? amount : -amount;
    sessionDoc.cashMoves.push({
        type: body.type,
        amount,
        reason: body.reason,
        at: new Date(),
        by: ctx.userId,
    });
    sessionDoc.cashRegisterBalance = sumMoney([sessionDoc.cashRegisterBalance, delta], decimals);
    sessionDoc.expectedCash = sumMoney([sessionDoc.expectedCash, delta], decimals);
    sessionDoc.markModified("cashMoves");
    await sessionDoc.save({session: ctx.session});

    const populated = await posSessionService.findById(sessionDoc._id, {session: ctx.session}, "config currency openedBy");
    return posSessionToDTO(populated!);
}

export async function closePosSession(body: ClosePosSessionFormType, ctx: Ctx) {
    const sessionDoc = await posSessionService.findOne({
        _id: body._id,
        company: ctx.company._id,
    }, {withDeleted: false});
    if (!sessionDoc) throw apiValidationException("pos_session_not_found", "_id", null, ctx.languageCode);
    if (sessionDoc.state === "closed") {
        throw apiValidationException("pos_session_already_closed", "_id", null, ctx.languageCode);
    }
    const decimals = await currencyDecimalPlaces(nestedEntityToRef(sessionDoc.currency), ctx.session);

    const countedCash = Number(body.closingBalance);
    const expectedCash = Number(sessionDoc.expectedCash ?? 0);
    const difference = subtractMoney(countedCash, expectedCash, decimals);
    // Any difference of one minor unit or more needs a reason, at the till currency's decimals (GLB-08)
    const hasDifference = toMinor(difference, decimals) !== 0n;
    if (hasDifference && !(body.differenceReason?.trim() || body.notes?.trim())) {
        throw apiValidationException("pos_close_difference_reason_required", "differenceReason", null, ctx.languageCode);
    }

    const heldDraftCount = await posOrderService.count({
        company: ctx.company._id,
        session: sessionDoc._id,
        state: "draft",
    }, {session: ctx.session, withDeleted: false});
    if (heldDraftCount > 0) {
        throw apiValidationException("pos_close_held_orders_open", "_id", null, ctx.languageCode);
    }

    const reconciliation = await getPosSessionReconciliation(sessionDoc._id.toString(), ctx, countedCash);

    const now = new Date();
    sessionDoc.state = "closed";
    sessionDoc.closedBy = ctx.userId;
    sessionDoc.closedAt = now;
    sessionDoc.closingBalance = countedCash;
    const noteParts = [body.notes?.trim(), body.differenceReason?.trim()].filter(Boolean);
    if (hasDifference) {
        const shown = (amount: number) => fromMinor(toMinor(amount, decimals), decimals);
        noteParts.push(`Cash difference: ${shown(difference)} (counted ${shown(countedCash)} vs expected ${shown(expectedCash)})`);
    }
    if (noteParts.length) sessionDoc.notes = noteParts.join(" | ");
    await sessionDoc.save({session: ctx.session});

    const populated = await posSessionService.findById(sessionDoc._id, {session: ctx.session}, "config currency openedBy closedBy");
    return {
        session: posSessionToDTO(populated!),
        reconciliation: {
            ...reconciliation,
            countedCash,
            difference,
        },
    };
}

export async function loadPosCatalog(
    params: {
        search?: string;
        categoryId?: string;
        barcode?: string;
        page?: number;
        limit?: number;
        warehouseId?: string;
        configId?: string;
    },
    ctx: Ctx,
) {
    const page = Math.max(1, params.page ?? 1);
    const limit = Math.min(100, Math.max(1, params.limit ?? 48));

    let warehouseIds: ObjectId[] = [];
    if (params.warehouseId && ObjectId.isValid(params.warehouseId)) {
        warehouseIds = [new ObjectId(params.warehouseId)];
    } else if (params.configId && ObjectId.isValid(params.configId)) {
        const cfg = await posConfigService.findOne({
            _id: params.configId,
            company: ctx.company._id,
        }, {withDeleted: false}, undefined, "warehouses warehouse");
        if (cfg) warehouseIds = warehouseIdsFromPosConfig(cfg);
    }

    // Barcode may hit a variant first
    let variantHits: any[] = [];
    if (params.barcode?.trim()) {
        const code = params.barcode.trim();
        variantHits = await productVariantService.find({
            company: ctx.company._id,
            status: "active",
            $or: [{barcode: code}, {sku: code}],
        }, {withDeleted: false}, undefined, "product sku barcode price attributeCombination trackInventory", undefined, 20);
    }

    const filter: Record<string, unknown> = {
        company: ctx.company._id,
        status: "active",
        type: {$nin: POS_UNSELLABLE_TYPES},
    };

    if (params.barcode?.trim()) {
        const code = params.barcode.trim();
        const variantProductIds = variantHits.map(v => v.product);
        filter.$or = [
            {barcode: code},
            {ean: code},
            {upc: code},
            {gtin: code},
            {sku: code},
            ...(variantProductIds.length ? [{_id: {$in: variantProductIds}}] : []),
        ];
    } else if (params.search?.trim()) {
        const q = escapeRegex(params.search.trim());
        filter.$or = [
            {title: {$regex: q, $options: "i"}},
            {sku: {$regex: q, $options: "i"}},
            {barcode: {$regex: q, $options: "i"}},
        ];
    } else {
        // Default grid: exclude bare variable parents without forcing variants-only browse
        filter.type = {$nin: ["variable", ...POS_UNSELLABLE_TYPES]};
    }
    if (params.categoryId) {
        filter.categories = params.categoryId;
    }

    const [rows, total] = await Promise.all([
        productService.find(
            filter,
            {withDeleted: false},
            undefined,
            "title sku barcode ean price currency mainImage trackInventory type shortDescription hasVariants",
            {title: 1},
            limit,
            (page - 1) * limit,
        ),
        productService.count(filter, {withDeleted: false}),
    ]);

    const productIds = rows.map((p: any) => p._id);
    const variants = productIds.length
        ? await productVariantService.find({
              company: ctx.company._id,
              product: {$in: productIds},
              status: "active",
          }, {withDeleted: false}, undefined, "product sku barcode price attributeCombination trackInventory", {order: 1})
        : [];

    const variantIds = variants.map((v: any) => v._id);
    let stockRows: any[] = [];
    if (warehouseIds.length && (productIds.length || variantIds.length)) {
        stockRows = await inventoryService.find({
            company: ctx.company._id,
            warehouse: {$in: warehouseIds},
            $or: [
                {product: {$in: productIds}, variant: null},
                ...(variantIds.length ? [{variant: {$in: variantIds}}] : []),
            ],
        }, {withDeleted: false}, undefined, "product variant quantityOnHand quantityReserved");
    }

    const stockKey = (productId: any, variantId?: any) =>
        `${productId.toString()}:${variantId ? variantId.toString() : "null"}`;
    const stockMap = new Map<string, number>();
    for (const row of stockRows) {
        const available = (row.quantityOnHand ?? 0) - (row.quantityReserved ?? 0);
        const key = stockKey(row.product, row.variant);
        stockMap.set(key, (stockMap.get(key) ?? 0) + available);
    }

    const hasWarehouseStock = warehouseIds.length > 0;

    const productById = new Map(rows.map((p: any) => [p._id.toString(), p]));
    const variantsByProduct = new Map<string, any[]>();
    for (const v of variants) {
        const pid = v.product.toString();
        const list = variantsByProduct.get(pid) ?? [];
        list.push({
            _id: v._id.toString(),
            sku: v.sku,
            barcode: v.barcode,
            price: v.price,
            trackInventory: isStockTracked(productById.get(pid), v),
            label:
                variantOptionsLabel(v) ||
                v.sku ||
                v.barcode ||
                v._id.toString(),
            stockQty: hasWarehouseStock ? (stockMap.get(stockKey(v.product, v._id)) ?? 0) : undefined,
        });
        variantsByProduct.set(pid, list);
    }

    // Prefer exact variant barcode hits at the front of results
    const data = rows.map((p: any) => {
        const mainImageId = p.mainImage?.toString?.() ?? (typeof p.mainImage === "string" ? p.mainImage : undefined);
        const productVariants = variantsByProduct.get(p._id.toString()) ?? [];
        return {
            _id: p._id.toString(),
            title: p.title,
            sku: p.sku,
            barcode: p.barcode ?? p.ean,
            price: p.price ?? 0,
            currency: p.currency?.toString?.() ?? p.currency,
            trackInventory: isStockTracked(p),
            type: p.type,
            hasVariants: !!p.hasVariants || productVariants.length > 0,
            shortDescription: p.shortDescription,
            imageUrl: mainImageId ? `/api/auxiliary/media/${mainImageId}` : undefined,
            stockQty: hasWarehouseStock ? (stockMap.get(stockKey(p._id)) ?? 0) : undefined,
            variants: productVariants,
            matchedVariantId:
                params.barcode?.trim() &&
                productVariants.find(
                    (v: any) => v.barcode === params.barcode?.trim() || v.sku === params.barcode?.trim(),
                )?._id,
        };
    });

    return {data, page, limit, total};
}

/**
 * Rings up a till sale in `ctx.session`. It does not call CIS (D97): `payAndFiscalizePosOrder` registers the sale once
 * it has committed, with the till's fiscal config that `fiscalConfigId` names.
 */
export async function payPosOrder(body: PayPosOrderFormType, ctx: Ctx) {
    const sessionDoc = await posSessionService.findOne({
        _id: body.sessionId,
        company: ctx.company._id,
    }, {session: ctx.session, withDeleted: false});
    if (!sessionDoc) throw apiValidationException("pos_session_not_found", "sessionId", null, ctx.languageCode);
    if (sessionDoc.state !== "opened") {
        throw apiValidationException("pos_session_not_opened", "sessionId", null, ctx.languageCode);
    }

    if (body.clientRequestId) {
        const existing = await posOrderService.findOne({
            company: ctx.company._id,
            clientRequestId: body.clientRequestId,
        }, {session: ctx.session, withDeleted: false});
        if (existing?.state === "paid") {
            // Idempotent replay succeeds even if the till is now paused/inactive.
            // A replay is never registered again: its first request did that (D97)
            return {...await rebuildPaidPosResult(existing, ctx), fiscalConfigId: undefined};
        }
    }

    const config = await posConfigService.findOne({
        _id: sessionDoc.config,
        company: ctx.company._id,
    }, {session: ctx.session, withDeleted: false}, "warehouses currency paymentMethods");
    if (!config) throw apiValidationException("pos_config_not_found", "sessionId", null, ctx.languageCode);

    await assertPosTillMutable(config, ctx);

    const warehouseIds = warehouseIdsFromPosConfig(config);
    if (!warehouseIds.length) {
        throw apiValidationException("pos_config_warehouse_required", "warehouses", null, ctx.languageCode);
    }
    const assignedFiscalConfigId = refToId(config.fiscalConfig);
    const assignedFiscal = assignedFiscalConfigId
        ? await fiscalConfigService.findOne({
            _id: assignedFiscalConfigId,
            company: ctx.company._id,
        }, {session: ctx.session, withDeleted: false}, undefined, "_id isActive certificate")
        : null;
    const currencyId = nestedEntityToRef(config.currency);
    const decimals = await currencyDecimalPlaces(currencyId, ctx.session);

    const {lines, subtotal, lineDiscountTotal} = await buildDraftLines(body.lines, ctx, decimals);

    const orderDiscPct = Math.min(100, Math.max(0, Number(body.discountPercent ?? 0)));
    const afterLineDisc = subtractMoney(subtotal, lineDiscountTotal, decimals);
    const orderDiscount = percentOfMoney(afterLineDisc, orderDiscPct, decimals);
    const discountTotal = sumMoney([lineDiscountTotal, orderDiscount], decimals);
    const amountTotal = Math.max(0, subtractMoney(subtotal, discountTotal, decimals));

    // Till prices include VAT: extract each line's share at the selling warehouse's rates,
    // after its part of the order discount
    const taxAddress = posTaxAddress(config);
    // The order discount is shared over the lines by value, in parts that add up to it exactly (D35).
    const discountShares = orderDiscount > 0 && afterLineDisc > 0
        ? allocateMinor(toMinor(orderDiscount, decimals), lines.map(line => toMinor(line.priceTotal, decimals)))
        : lines.map(() => 0n);
    for (const [index, line] of lines.entries()) {
        const taxedAmount = subtractMoney(line.priceTotal, minorToNumber(discountShares[index], decimals), decimals);
        line.taxAmount = taxAddress
            ? await calculateInclusiveTax(taxedAmount, line.productType, taxAddress, ctx.company._id, decimals, ctx.session)
            : 0;
    }
    const amountTax = sumMoney(lines.map(line => line.taxAmount), decimals);

    if (toMinor(discountTotal, decimals) > 0n && config.pinForDiscount) {
        const {hasAnyManagerPin, managerPinMatchesForUser} = await import(
            "@eCommerceModule/utilities/services/posManagerPin"
        );
        if (hasAnyManagerPin(config)) {
            const approvedBy = body.managerId
                ? await managerPinMatchesForUser(config, body.managerId, body.managerPin || "")
                : null;
            if (!body.managerPin || !body.managerId || !approvedBy) {
                throw apiValidationException("pos_manager_pin_invalid", "managerPin", null, ctx.languageCode);
            }
        }
    }

    const paymentMethodIds = body.payments.map(p => p.paymentMethodId);
    const methods = await posPaymentMethodService.find({
        _id: {$in: paymentMethodIds},
        company: ctx.company._id,
        isActive: true,
    }, {session: ctx.session, withDeleted: false});
    if (methods.length !== new Set(paymentMethodIds).size) {
        throw apiValidationException("pos_payment_method_invalid", "payments", null, ctx.languageCode);
    }
    const methodById = new Map(methods.map(m => [m._id.toString(), m]));

    const amountPaid = sumMoney(body.payments.map(p => Number(p.amount)), decimals);
    if (toMinor(amountPaid, decimals) < toMinor(amountTotal, decimals)) {
        throw apiValidationException("pos_payment_insufficient", "payments", null, ctx.languageCode);
    }
    const amountReturn = Math.max(0, subtractMoney(amountPaid, amountTotal, decimals));

    if (!currencyId) {
        throw apiValidationException("pos_currency_required", "currency", null, ctx.languageCode);
    }

    if (body.customerId && !(await userService.exists({_id: new ObjectId(body.customerId), companies: ctx.company._id}, {session: ctx.session}))) {
        throw apiValidationException("pos_customer_not_found", "customerId", null, ctx.languageCode);
    }

    let posOrder: IPosOrder;
    if (body.heldOrderId) {
        const held = await posOrderService.findOne({
            _id: body.heldOrderId,
            company: ctx.company._id,
            session: sessionDoc._id,
            state: "draft",
        }, {session: ctx.session, withDeleted: false});
        if (!held) throw apiValidationException("pos_held_not_found", "heldOrderId", null, ctx.languageCode);
        posOrder = held;
    } else {
        const name = await generatePosOrderName(ctx.company._id, ctx.session);
        posOrder = new PosOrder({
            name,
            session: sessionDoc._id,
            config: config._id,
            company: ctx.company._id,
            isRefund: false,
        });
    }
    // The sale keeps the session's currency, so its amounts read right even if the till's currency changes later.
    posOrder.currency ??= nestedEntityToRef(sessionDoc.currency);

    const now = new Date();
    posOrder.state = "paid";
    posOrder.session = sessionDoc._id;
    posOrder.config = config._id;
    posOrder.cashier = ctx.userId;
    posOrder.customer = body.customerId ? new ObjectId(body.customerId) : undefined;
    posOrder.customerName = body.customerName || (body.customerId ? undefined : "Walk-in Customer");
    posOrder.lines = lines;
    posOrder.payments = body.payments.map(p => {
        const method = methodById.get(p.paymentMethodId);
        return {
            paymentMethod: new ObjectId(p.paymentMethodId),
            paymentMethodName: method?.name,
            paymentMethodType: method?.type,
            amount: Number(p.amount),
            paymentDate: now,
            terminalAuthCode: p.terminalAuthCode,
            terminalReference: p.terminalReference,
            terminalId: p.terminalId || method?.terminalId,
        };
    });
    posOrder.amountTax = amountTax;
    posOrder.amountTotal = amountTotal;
    posOrder.amountPaid = amountPaid;
    posOrder.amountReturn = amountReturn;
    posOrder.discountTotal = discountTotal;
    posOrder.orderDiscountPercent = orderDiscPct;
    posOrder.note = body.note;
    posOrder.isRefund = false;
    if (body.clientRequestId) posOrder.clientRequestId = body.clientRequestId;
    await posOrder.save({session: ctx.session});

    const stockLines = await trackedStockLines(
        lines.map(line => ({product: line.product, variant: line.variant, quantity: line.quantity})),
        ctx.company._id,
        ctx,
    );
    for (const line of stockLines) {
        await consumePosStockAcrossWarehouses({
            productId: line.product,
            variantId: line.variant,
            warehouseIds,
            quantity: line.quantity,
            companyId: ctx.company._id,
            posOrderId: posOrder._id,
            auditUserId: ctx.userId,
            allowOversell: !!config.allowOversell,
            ctx,
        });
    }

    const soldVariants = await productVariantService.find(
        {_id: {$in: lines.flatMap(line => (line.variant ? [line.variant] : []))}, company: ctx.company._id},
        {session: ctx.session},
        undefined,
        "attributeCombination",
    );
    const variantLabels = new Map(soldVariants.map(variant => [variant._id.toString(), variantOptionsLabel(variant)]));

    const orderNumber = await generateOrderNumber(ctx.company._id);
    const productOrder = new ProductOrder({
        company: ctx.company._id,
        orderNumber,
        status: "delivered",
        paymentStatus: "paid",
        fulfillmentStatus: "fulfilled",
        customer: body.customerId ? new ObjectId(body.customerId) : ctx.userId,
        items: lines.map(l => ({
            product: l.product,
            variant: l.variant,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            totalPrice: l.priceTotal,
            snapshot: {
                title: l.productName,
                sku: l.productSku,
                productType: l.productType,
                variantLabel: l.variant ? variantLabels.get(l.variant.toString()) || undefined : undefined,
            },
        })),
        currency: currencyId,
        currencyCode: config.currency?.abbreviation,
        shippingAddress: {
            firstName: "POS",
            lastName: "Sale",
            street: "In-store pickup",
            city: "Store",
        },
        billingAddress: {
            firstName: "POS",
            lastName: "Sale",
            street: "In-store pickup",
            city: "Store",
        },
        shippingRate: {name: "POS Pickup", price: 0},
        subtotal,
        discountTotal,
        shippingTotal: 0,
        taxTotal: amountTax,
        grandTotal: amountTotal,
        notes: body.note ? `POS ${posOrder.name}: ${body.note}` : `POS ${posOrder.name}`,
        idempotencyKey: `pos:${posOrder._id.toString()}`,
        timeline: [
            {event: "order_placed", timestamp: now, userId: ctx.userId},
            {event: "payment_received", timestamp: now, userId: ctx.userId, note: "POS"},
            {event: "fulfilled", timestamp: now, userId: ctx.userId, note: "In-store pickup"},
        ],
    });
    await productOrder.save({session: ctx.session});

    posOrder.productOrder = productOrder._id;
    await posOrder.save({session: ctx.session});

    // The ledger records what each payment actually paid, never the change a cash payment included (TD-B41)
    const ledgerAmounts = paidNetOfChange(
        body.payments.map((payment) => ({amount: payment.amount, isCash: methodById.get(payment.paymentMethodId)?.type === "cash"})),
        amountReturn,
        decimals,
    );
    for (const [paymentIndex, payment] of body.payments.entries()) {
        if (ledgerAmounts[paymentIndex] <= 0n) continue;
        const method = methodById.get(payment.paymentMethodId);
        await paymentTransactionService.create(
            {
                sourceType: "productOrder",
                sourceId: productOrder._id,
                gateway: "manual",
                type: "charge",
                status: "succeeded",
                // Stored at the currency's scale, as finance writes its charges ("10.000", not "10")
                amount: decimal128FromMinor(ledgerAmounts[paymentIndex], decimals),
                currency: currencyId,
                refundedAmount: decimal128FromMinor(0n, decimals),
                metadata: {
                    posOrderId: posOrder._id.toString(),
                    paymentIndex,
                    paymentMethodId: payment.paymentMethodId,
                    paymentMethodType: method?.type,
                    paymentMethodName: method?.name,
                    terminalAuthCode: payment.terminalAuthCode,
                    terminalReference: payment.terminalReference,
                    terminalId: payment.terminalId || method?.terminalId,
                    channel: "pos",
                },
                company: ctx.company._id,
            },
            {logger: ctx.logger, languageCode: ctx.languageCode, session: ctx.session, auditUserId: ctx.userId},
        );
    }

    let cashPaid = 0;
    let cardPaid = 0;
    for (const payment of body.payments) {
        const method = methodById.get(payment.paymentMethodId);
        const amt = Number(payment.amount);
        if (method?.type === "cash") cashPaid = sumMoney([cashPaid, amt], decimals);
        else cardPaid = sumMoney([cardPaid, amt], decimals);
    }
    // Change returned from cash drawer
    const netCash = subtractMoney(cashPaid, amountReturn, decimals);

    sessionDoc.orderCount += 1;
    sessionDoc.totalSales = sumMoney([sessionDoc.totalSales, amountTotal], decimals);
    sessionDoc.totalCash = sumMoney([sessionDoc.totalCash, Math.max(0, netCash)], decimals);
    sessionDoc.totalCard = sumMoney([sessionDoc.totalCard, cardPaid], decimals);
    if (netCash !== 0) {
        sessionDoc.cashRegisterBalance = sumMoney([sessionDoc.cashRegisterBalance, netCash], decimals);
        sessionDoc.expectedCash = sumMoney([sessionDoc.expectedCash, netCash], decimals);
    }
    await sessionDoc.save({session: ctx.session});

    const populated = await posOrderService.findByIdOrThrow(posOrder._id, {session: ctx.session, languageCode: ctx.languageCode}, POS_ORDER_POPULATE);
    const receipt = await buildReceiptFromPosOrder(populated, ctx);
    receipt.productOrderNumber = orderNumber;
    receipt.paidAt = now.toISOString();
    receipt.customerName = body.customerName || "Walk-in Customer";

    return {
        order: posOrderToDTO(populated),
        receipt,
        session: posSessionToDTO(sessionDoc),
        // Albanian CIS registration, when the till's fiscal config is active and has a certificate
        fiscalConfigId: assignedFiscal?.isActive && (assignedFiscal.certificate?.length ?? 0) > 0 ? assignedFiscal._id.toString() : undefined,
    };
}

/** What CIS answered for a till sale, as the till prints it. */
type PosSaleFiscal = {nslf?: string; nivf?: string; eic?: string; qrVerifyUrl?: string; fault?: string};

/**
 * Till pay (D97): the sale commits in its own transaction first, and only then is registered with CIS, outside it.
 * A retried attempt or a failed commit so never registers an invoice twice, or one without its sale. The fiscal
 * result is stored on the sale in a follow-up write and returned for the receipt; when CIS fails the sale stands, and
 * the failure is stored and returned as `fiscal.fault`.
 */
export async function payAndFiscalizePosOrder(body: PayPosOrderFormType, ctx: Omit<Ctx, "session">) {
    const {fiscalConfigId, ...sale} = await runInTransaction(ctx.logger, (session) => payPosOrder(body, {...ctx, session}))
        .catch((error: unknown) => {
            // The driver retried the conflict until its time ran out: the till may try again, as asyncHandler answers
            if (error instanceof MongoError && error.hasErrorLabel("TransientTransactionError")) {
                throw apiValidationException("concurrent_request_retry", "", null, ctx.languageCode);
            }
            throw error;
        });
    if (!fiscalConfigId) return {...sale, fiscal: undefined};

    const fiscal = await registerPosSaleWithCis(sale.order._id, fiscalConfigId, ctx);
    const order = await posOrderService.findByIdOrThrow(sale.order._id, {languageCode: ctx.languageCode}, POS_ORDER_POPULATE);
    const receipt = await buildReceiptFromPosOrder(order, ctx);
    return {
        ...sale,
        order: posOrderToDTO(order),
        receipt: {
            ...receipt,
            productOrderNumber: sale.receipt.productOrderNumber,
            paidAt: sale.receipt.paidAt,
            customerName: sale.receipt.customerName,
        },
        fiscal,
    };
}

/**
 * Registers a committed till sale with CIS; a failure is stored on the sale and returned, never thrown. The pay
 * request calls it, and the fiscal sweep for a sale whose request stopped before CIS (TD-B75), with no user.
 */
export async function registerPosSaleWithCis(
    orderId: string,
    fiscalConfigId: string,
    ctx: Omit<Ctx, "session" | "userId"> & {userId?: ObjectId},
): Promise<PosSaleFiscal> {
    try {
        const result = await fiscalizePosOrder(orderId, ctx.company._id, {
            languageCode: ctx.languageCode,
            fiscalConfigId,
            companyVat: ctx.company.vat,
            companyName: ctx.company.name,
        });
        return {
            nslf: result.invoice.nslf,
            nivf: result.invoice.nivf,
            eic: result.einvoice?.eic,
            qrVerifyUrl: result.invoice.nivf ? result.invoice.qrVerifyUrl : undefined,
            fault: result.invoice.fault || result.einvoice?.fault || result.order.fiscalError,
        };
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.logger.warn(`POS fiscalize failed for ${orderId}: ${message}`);
        // Another caller is registering the sale, or its answer was lost: its own outcome stands
        if (err instanceof ServerError && err.error_code === "fiscal_registration_unconfirmed") return {fault: message};
        try {
            await posOrderService.updateById(orderId, {$set: {fiscalError: message}}, {logger: ctx.logger, languageCode: ctx.languageCode, auditUserId: ctx.userId});
        } catch (error: unknown) {
            // The sale has committed: the till still gets its receipt, marked not fiscalized
            ctx.logger.err(`Could not store the CIS failure on POS order ${orderId}`, error);
        }
        return {fault: message};
    }
}

/**
 * A manual CIS send of a committed till sale, answered as the panel shows it: the `/fiscal/fiscalizePosOrder` route,
 * and the "send again" resolution of a sale whose CIS answer was lost (D98). CIS's own fault is returned; a failure
 * other than a rule refusal answers `fiscal_error`.
 */
export async function sendPosOrderToCis(
    posOrderId: string,
    ctx: {languageCode: string; company: {_id: unknown; name?: string; vat?: string}},
    fiscalConfigId?: string,
) {
    try {
        const result = await fiscalizePosOrder(posOrderId, ctx.company._id, {
            languageCode: ctx.languageCode,
            fiscalConfigId,
            companyVat: ctx.company.vat,
            companyName: ctx.company.name,
        });
        return {
            order: posOrderToDTO(result.order),
            nslf: result.invoice.nslf,
            nivf: result.invoice.nivf,
            eic: result.einvoice?.eic,
            qrVerifyUrl: result.invoice.qrVerifyUrl,
            fault: result.invoice.fault || result.einvoice?.fault,
        };
    } catch (error: unknown) {
        if (error instanceof ServerError) throw error;
        throw apiValidationException("fiscal_error", "posOrderId", null, ctx.languageCode, [error instanceof Error ? error.message : String(error)]);
    }
}

/**
 * What each payment of a sale actually paid, in minor units: a cash payment's amount includes the change handed back,
 * so the change comes off the cash payments first, in order (D59). The finance ledger records these amounts (TD-B41).
 */
function paidNetOfChange(payments: {amount: MoneyInput; isCash: boolean}[], change: MoneyInput, decimals: number): bigint[] {
    let changeLeft = toMinor(change, decimals);
    return payments.map((payment) => {
        const amount = toMinor(payment.amount, decimals);
        if (!payment.isCash || changeLeft <= 0n) return amount;
        const netted = amount < changeLeft ? amount : changeLeft;
        changeLeft -= netted;
        return amount - netted;
    });
}

/**
 * Shares a refund over a sale's payments by what each can still give back (TD-B31, D84): what it actually paid (a cash
 * payment's amount includes the change handed back, so the change comes off the cash payments first and a 43.20 sale
 * paid with 50.00 cash refunds 43.20), less what earlier refunds already took from it (`refunded`, minor units). A run
 * of partial refunds so never puts a rounding unit on a payment that is fully refunded. The parts add up to the refund
 * exactly (`allocateMinor`).
 */
function refundSharesOverPayments(
    payments: {amount: MoneyInput; isCash: boolean; refunded: bigint}[],
    change: MoneyInput,
    refundAmount: number,
    decimals: number,
): number[] {
    const refundable = paidNetOfChange(payments, change, decimals).map((paid, index) => {
        const left = paid - payments[index].refunded;
        return left > 0n ? left : 0n;
    });
    if (sumMinor(refundable) <= 0n) return payments.map(() => 0);
    return allocateMinor(toMinor(refundAmount, decimals), refundable).map((share) => minorToNumber(share, decimals));
}

export async function refundPosOrder(body: RefundPosOrderFormType, ctx: Ctx) {
    const original = await posOrderService.findOne({
        _id: body._id,
        company: ctx.company._id,
    }, {withDeleted: false});
    if (!original) throw apiValidationException("pos_order_not_found", "_id", null, ctx.languageCode);
    if (original.state !== "paid") {
        throw apiValidationException("pos_order_not_refundable", "_id", null, ctx.languageCode);
    }
    if (original.isRefund) {
        throw apiValidationException("pos_order_is_refund", "_id", null, ctx.languageCode);
    }

    const sessionDoc = await posSessionService.findOne({
        _id: original.session,
        company: ctx.company._id,
    }, {withDeleted: false});
    if (!sessionDoc || sessionDoc.state !== "opened") {
        throw apiValidationException("pos_session_not_opened", "session", null, ctx.languageCode);
    }
    const decimals = await currencyDecimalPlaces(nestedEntityToRef(sessionDoc.currency), ctx.session);

    const config = await posConfigService.findOne({_id: original.config});
    if (!config) throw apiValidationException("pos_config_not_found", "config", null, ctx.languageCode);
    await assertPosTillMutable(config, ctx);
    const warehouseIds = warehouseIdsFromPosConfig(config);
    const warehouseId = warehouseIds[0];
    if (!warehouseId) {
        throw apiValidationException("pos_config_warehouse_required", "warehouses", null, ctx.languageCode);
    }

    if (config.pinForRefund) {
        const {hasAnyManagerPin, managerPinMatchesForUser} = await import(
            "@eCommerceModule/utilities/services/posManagerPin"
        );
        if (hasAnyManagerPin(config)) {
            const approvedBy = body.managerId
                ? await managerPinMatchesForUser(config, body.managerId, body.managerPin || "")
                : null;
            if (!body.managerPin || !body.managerId || !approvedBy) {
                throw apiValidationException("pos_manager_pin_invalid", "managerPin", null, ctx.languageCode);
            }
        }
    }

    const originalLines = original.lines ?? [];
    const remainingOf = (line: IPosOrderLine) =>
        Math.max(0, Number(line.quantity) - Number(line.quantityRefunded ?? 0));
    const alreadyPartial = originalLines.some((l) => Number(l.quantityRefunded ?? 0) > 0.0001);
    const priorAmountRefunded = Number(original.amountRefunded ?? 0);
    const remainingOrderAmount = Math.max(0, subtractMoney(Number(original.amountTotal), priorAmountRefunded, decimals));
    // Refund amounts are compared exactly, in minor units at the currency's decimals (GLB-08)
    const remainingMinor = toMinor(remainingOrderAmount, decimals);

    let refundLines: IPosOrderLine[];
    let refundAmount: number;
    let restockPlan: {line: IPosOrderLine; quantity: number}[] = [];

    if (body.lines?.length) {
        refundLines = [];
        for (const req of body.lines) {
            const line = originalLines.find((l) => l._id?.toString() === req.lineId);
            if (!line) throw apiValidationException("pos_refund_line_invalid", "lines", null, ctx.languageCode);
            const qty = Number(req.quantity);
            const remaining = remainingOf(line);
            if (!(qty > 0) || qty > remaining + 0.0001) {
                throw apiValidationException("pos_refund_qty_invalid", "lines", null, ctx.languageCode);
            }
            refundLines.push({
                product: line.product,
                variant: line.variant,
                quantity: qty,
                quantityRefunded: 0,
                unitPrice: line.unitPrice,
                discountPercent: line.discountPercent,
                discountAmount: line.quantity > 0 ? prorateMoney(line.discountAmount ?? 0, qty, line.quantity, decimals) : 0,
                priceSubtotal: line.quantity > 0 ? prorateMoney(line.priceSubtotal ?? 0, qty, line.quantity, decimals) : 0,
                priceTotal: posLineRefundTotal(line, qty, decimals),
                taxAmount: line.quantity > 0 ? prorateMoney(line.taxAmount ?? 0, qty, line.quantity, decimals) : 0,
                productName: line.productName,
                productSku: line.productSku,
                barcode: line.barcode,
            });
            restockPlan.push({line, quantity: qty});
        }
        // The same rule the panel's refund dialog shows (armonia `posRefundAmount`)
        refundAmount = posRefundAmount(original, restockPlan, decimals);
        const pickedOf = (line: {_id?: unknown}) =>
            restockPlan.filter((pick) => String(pick.line._id) === String(line._id)).reduce((sum, pick) => sum + pick.quantity, 0);
        if (originalLines.every((line) => remainingOf(line) - pickedOf(line) <= 0.0001)) {
            // The last refund takes exactly what is left: rounding each partial refund once can leave a cent
            // behind, or ask for one more than the sale has left
            refundAmount = remainingOrderAmount;
        } else if (toMinor(refundAmount, decimals) > remainingMinor) {
            throw apiValidationException("pos_refund_amount_invalid", "amount", null, ctx.languageCode);
        }
    } else {
        // Amount-only (or implicit full) refunds are not allowed once any line was partially refunded —
        // remaining qty must be selected explicitly.
        if (alreadyPartial) {
            throw apiValidationException("pos_refund_lines_required", "lines", null, ctx.languageCode);
        }
        refundAmount = body.amount != null ? Number(body.amount) : remainingOrderAmount;
        const askedMinor = toMinor(refundAmount, decimals);
        if (askedMinor <= 0n || askedMinor > remainingMinor) {
            throw apiValidationException("pos_refund_amount_invalid", "amount", null, ctx.languageCode);
        }
        if (askedMinor !== remainingMinor) {
            // Partial amount without lines is ambiguous for restock — require line selection.
            throw apiValidationException("pos_refund_lines_required", "lines", null, ctx.languageCode);
        }
        refundLines = originalLines.map(line => {
            const remaining = remainingOf(line);
            return {
                product: line.product,
                variant: line.variant,
                quantity: remaining,
                quantityRefunded: 0,
                unitPrice: line.unitPrice,
                discountPercent: line.discountPercent,
                discountAmount: line.quantity > 0 ? prorateMoney(line.discountAmount ?? 0, remaining, line.quantity, decimals) : 0,
                priceSubtotal: line.quantity > 0 ? prorateMoney(line.priceSubtotal ?? 0, remaining, line.quantity, decimals) : 0,
                priceTotal: posLineRefundTotal(line, remaining, decimals),
                taxAmount: line.quantity > 0 ? prorateMoney(line.taxAmount ?? 0, remaining, line.quantity, decimals) : 0,
                productName: line.productName,
                productSku: line.productSku,
                barcode: line.barcode,
            };
        });
        restockPlan = originalLines
            .map(line => ({line, quantity: remainingOf(line)}))
            .filter(p => p.quantity > 0);
        // Recompute amount from remaining lines when doing full remaining refund
        refundAmount = posRefundAmount(original, originalLines.map(line => ({line, quantity: remainingOf(line)})), decimals);
    }

    if (!(refundAmount > 0) || !refundLines.length) {
        throw apiValidationException("pos_refund_amount_invalid", "amount", null, ctx.languageCode);
    }

    const originalPayments = original.payments ?? [];
    const cashMethods = await posPaymentMethodService.find({
        _id: {$in: originalPayments.flatMap((p) => {
            const id = nestedEntityToRef(p.paymentMethod);
            return id ? [id] : [];
        })},
        type: "cash",
    }, {session: ctx.session});
    const cashMethodIds = new Set(cashMethods.map(m => m._id.toString()));
    const isCashPayment = originalPayments.map((p) => {
        const mid = nestedEntityToRef(p.paymentMethod)?.toString();
        return !!mid && cashMethodIds.has(mid);
    });
    // Each payment's ledger charge: what earlier refunds took from it, and where this refund is booked (TD-B41)
    const originalProductOrderId = nestedEntityToRef(original.productOrder);
    const charges = originalProductOrderId
        ? await paymentTransactionService.find(
            {type: "charge", "metadata.posOrderId": original._id.toString()},
            {logger: ctx.logger, languageCode: ctx.languageCode, session: ctx.session},
        )
        : [];
    const paymentMethodIdOf = (paymentIndex: number) => nestedEntityToRef(originalPayments[paymentIndex].paymentMethod)?.toString();
    const chargeOf = (paymentIndex: number) =>
        charges.find((c) => c.metadata?.paymentIndex === paymentIndex)
        ?? charges.find((c) => c.metadata?.paymentIndex === undefined && c.metadata?.paymentMethodId === paymentMethodIdOf(paymentIndex));
    const refundShares = refundSharesOverPayments(
        originalPayments.map((p, index) => {
            const charge = chargeOf(index);
            return {amount: p.amount, isCash: isCashPayment[index], refunded: charge ? toMinor(charge.refundedAmount, decimals) : 0n};
        }),
        original.amountReturn,
        refundAmount,
        decimals,
    );

    const name = await generatePosOrderName(ctx.company._id, ctx.session);
    const now = new Date();

    const refundOrder = new PosOrder({
        name,
        session: sessionDoc._id,
        config: config._id,
        currency: nestedEntityToRef(original.currency) ?? nestedEntityToRef(sessionDoc.currency),
        state: "refunded",
        cashier: ctx.userId,
        customer: original.customer,
        customerName: original.customerName,
        lines: refundLines,
        payments: originalPayments.map((p, index) => ({
            paymentMethod: p.paymentMethod,
            paymentMethodName: p.paymentMethodName,
            paymentMethodType: p.paymentMethodType,
            amount: refundShares[index],
            paymentDate: now,
            terminalAuthCode: p.terminalAuthCode,
            terminalReference: p.terminalReference,
            terminalId: p.terminalId,
        })),
        amountTax: sumMoney(refundLines.map(line => line.taxAmount), decimals),
        amountTotal: refundAmount,
        amountPaid: refundAmount,
        amountReturn: 0,
        discountTotal: Math.max(0, original.amountTotal > 0 ? prorateMoney(original.discountTotal ?? 0, refundAmount, original.amountTotal, decimals) : roundToCurrency(original.discountTotal ?? 0, decimals)),
        note: body.reason ? `Refund: ${body.reason}` : `Refund of ${original.name}`,
        refundOf: original._id,
        isRefund: true,
        company: ctx.company._id,
    });
    await refundOrder.save({session: ctx.session});

    const restockLines = await trackedStockLines(
        restockPlan.flatMap(({line, quantity}) => {
            const productId = nestedEntityToRef(line.product);
            return productId ? [{product: productId, variant: nestedEntityToRef(line.variant), quantity}] : [];
        }),
        ctx.company._id,
        ctx,
    );
    const returnable = await returnableByWarehouse(original._id, ctx);
    for (const line of restockLines) {
        const restock = (toWarehouse: ObjectId, quantity: number) => restockPosStock({
            productId: line.product,
            variantId: line.variant,
            warehouseId: toWarehouse,
            quantity,
            companyId: ctx.company._id,
            posOrderId: refundOrder._id,
            auditUserId: ctx.userId,
            ctx,
        });

        // Back to the warehouses the sale drew from; anything beyond that goes to the till's first warehouse
        let remaining = line.quantity;
        for (const [sourceWarehouse, open] of returnable.get(stockKeyOf(line.product, line.variant)) ?? []) {
            const take = Math.min(remaining, open);
            if (take <= 0.0001) continue;
            await restock(new ObjectId(sourceWarehouse), take);
            remaining = roundQuantity(remaining - take);
        }
        if (remaining > 0.0001) await restock(warehouseId, remaining);
    }

    // Persist refunded quantities on the original sale lines
    if (body.lines?.length) {
        for (const req of body.lines) {
            const line = originalLines.find((l) => l._id?.toString() === req.lineId);
            if (!line) continue;
            line.quantityRefunded = roundQuantity(Number(line.quantityRefunded ?? 0) + Number(req.quantity));
        }
    } else {
        for (const line of originalLines) {
            line.quantityRefunded = Number(line.quantity);
        }
    }
    original.markModified("lines");
    original.amountRefunded = sumMoney([priorAmountRefunded, refundAmount], decimals);

    const allLinesFullyRefunded = originalLines.every((l) => remainingOf(l) <= 0.0001);
    // Exactly, in minor units at the currency's decimals (GLB-08): a 0.03 sale is not refunded after 0.02
    const fullyRefunded =
        allLinesFullyRefunded ||
        toMinor(original.amountRefunded, decimals) >= toMinor(original.amountTotal, decimals);

    if (fullyRefunded) {
        original.state = "refunded";
        if (original.productOrder) {
            await productOrderService.updateOne(
                {_id: original.productOrder},
                {
                    $set: {status: "refunded", paymentStatus: "refunded", fulfillmentStatus: "returned"},
                    $push: {timeline: {event: "refunded", timestamp: now, userId: ctx.userId, note: body.reason}},
                },
                {session: ctx.session},
            );
        }
    }
    await original.save({session: ctx.session});

    // Each payment's share goes back on its ledger charge (TD-B41)
    if (originalProductOrderId) {
        for (const [paymentIndex, share] of refundShares.entries()) {
            if (share <= 0) continue;
            const methodId = paymentMethodIdOf(paymentIndex);
            const charge = chargeOf(paymentIndex);
            if (!charge) continue;
            await paymentTransactionService.recordRefund(
                {
                    sourceType: "productOrder",
                    sourceId: originalProductOrderId,
                    chargeTransactionId: charge._id,
                    gateway: "manual",
                    amount: share,
                    currency: charge.currency,
                    metadata: {
                        posOrderId: refundOrder._id.toString(),
                        refundOfPosOrderId: original._id.toString(),
                        paymentMethodId: methodId,
                        paymentMethodName: originalPayments[paymentIndex].paymentMethodName,
                        channel: "pos",
                    },
                    company: ctx.company._id,
                },
                {logger: ctx.logger, languageCode: ctx.languageCode, session: ctx.session, auditUserId: ctx.userId},
            );
        }
    }

    // Cash refund reduces drawer: the cash payments' shares of the refund, never the change they included
    const cashRefund = sumMoney(refundShares.filter((_, index) => isCashPayment[index]), decimals);
    if (cashRefund > 0) {
        sessionDoc.cashRegisterBalance = subtractMoney(sessionDoc.cashRegisterBalance, cashRefund, decimals);
        sessionDoc.expectedCash = subtractMoney(sessionDoc.expectedCash, cashRefund, decimals);
        sessionDoc.totalCash = Math.max(0, subtractMoney(sessionDoc.totalCash, cashRefund, decimals));
    }
    sessionDoc.totalSales = Math.max(0, subtractMoney(sessionDoc.totalSales, refundAmount, decimals));
    await sessionDoc.save({session: ctx.session});

    const populated = await posOrderService.findById(refundOrder._id, {session: ctx.session}, POS_ORDER_POPULATE);

    return {
        order: posOrderToDTO(populated as IPosOrder),
        originalOrderId: original._id.toString(),
        session: posSessionToDTO(sessionDoc),
    };
}

export type ChargePosTerminalBody = {
    sessionId: string;
    paymentMethodId: string;
    amount: number;
    currency?: string;
    reference?: string;
};

export type ChargePosTerminalResult = {
    approved: boolean;
    provider: string;
    terminalId?: string;
    authCode?: string;
    reference: string;
    raw?: unknown;
};


/**
 * Charge a bank payment terminal configured on a card POS payment method.
 * - `manual`: staff confirms on an external terminal; we only validate config and return approved.
 * - `local_http`: POST JSON to {http|https}://{host}:{port}{path} (local ECR / bank POS bridge).
 */
export async function chargePosTerminal(body: ChargePosTerminalBody, ctx: Ctx): Promise<ChargePosTerminalResult> {
    const sessionDoc = await posSessionService.findOne({
        _id: body.sessionId,
        company: ctx.company._id,
    }, {session: ctx.session, withDeleted: false});
    if (!sessionDoc) throw apiValidationException("pos_session_not_found", "sessionId", null, ctx.languageCode);
    if (sessionDoc.state !== "opened") {
        throw apiValidationException("pos_session_not_opened", "sessionId", null, ctx.languageCode);
    }

    const decimals = await currencyDecimalPlaces(nestedEntityToRef(sessionDoc.currency), ctx.session);
    const gateConfig = await posConfigService.findOne({_id: sessionDoc.config}, {session: ctx.session});
    if (!gateConfig) throw apiValidationException("pos_config_not_found", "sessionId", null, ctx.languageCode);
    await assertPosTillMutable(gateConfig, ctx);

    const method = await posPaymentMethodService.findOne({
        _id: body.paymentMethodId,
        company: ctx.company._id,
        isActive: true,
    }, {session: ctx.session, withDeleted: false});
    if (!method) throw apiValidationException("pos_payment_method_invalid", "paymentMethodId", null, ctx.languageCode);
    if (method.type !== "card") {
        throw apiValidationException("pos_terminal_not_for_method", "paymentMethodId", null, ctx.languageCode);
    }
    if (!method.terminalEnabled) {
        throw apiValidationException("pos_terminal_disabled", "paymentMethodId", null, ctx.languageCode);
    }

    const amount = roundToCurrency(Number(body.amount), decimals);
    if (!(amount > 0)) throw apiValidationException("pos_terminal_amount_invalid", "amount", null, ctx.languageCode);

    const reference = (body.reference || `POS-${Date.now()}`).slice(0, 120);
    const provider = method.terminalProvider || "manual";
    const flight = {
        sessionId: body.sessionId,
        paymentMethodId: body.paymentMethodId,
        companyId: ctx.company._id.toString(),
        reference,
        provider,
        protocol: method.terminalProtocol || undefined,
        host: method.terminalHost || undefined,
        port: method.terminalPort || undefined,
        cancelPath: "/cancel",
        amount,
        currency: body.currency || "EUR",
        terminalId: method.terminalId || undefined,
    };
    registerInFlightTerminalCharge(flight);

    try {
        if (provider === "manual") {
            return {
                approved: true,
                provider,
                terminalId: method.terminalId,
                authCode: `MANUAL-${reference}`,
                reference,
            };
        }

        const host = (method.terminalHost || "").trim();
        const port = Number(method.terminalPort || 0);
        if (!host || !port) {
            throw apiValidationException("pos_terminal_not_configured", "terminalHost", null, ctx.languageCode);
        }

        const path = normalizePosTerminalPath(method.terminalPath, "/payment");
        const url = buildPosTerminalUrl({
            protocol: method.terminalProtocol,
            host,
            port,
            path,
        });
        const payload = {
            amount,
            currency: body.currency || "EUR",
            terminalId: method.terminalId,
            reference,
            sessionId: body.sessionId,
            paymentMethodId: body.paymentMethodId,
        };

        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 90_000);
        try {
            const res = await fetch(url, {
                method: "POST",
                headers: {"Content-Type": "application/json", Accept: "application/json"},
                body: JSON.stringify(payload),
                signal: controller.signal,
            });
            const text = await res.text();
            let raw: any;
            try {
                raw = text ? JSON.parse(text) : null;
            } catch {
                raw = {raw: text};
            }

            if (!res.ok) {
                ctx.logger?.warn?.({url, status: res.status, raw}, "POS terminal HTTP error");
                throw apiValidationException("pos_terminal_declined", "amount", null, ctx.languageCode);
            }

            const approved =
                raw?.approved === true ||
                raw?.success === true ||
                raw?.status === "approved" ||
                raw?.result === "approved" ||
                raw?.SaleToPOIResponse?.PaymentResponse?.Response?.Result === "Success";

            if (!approved) {
                ctx.logger?.info?.({url, raw}, "POS terminal declined");
                throw apiValidationException("pos_terminal_declined", "amount", null, ctx.languageCode);
            }

            return {
                approved: true,
                provider,
                terminalId: method.terminalId,
                authCode:
                    raw?.authCode ||
                    raw?.authorizationCode ||
                    raw?.SaleToPOIResponse?.PaymentResponse?.PaymentResult?.PaymentAcquirerData?.ApprovalCode ||
                    `TERM-${reference}`,
                reference,
                raw,
            };
        } catch (err: any) {
            if (err?.name === "AbortError") {
                throw apiValidationException("pos_terminal_timeout", "amount", null, ctx.languageCode);
            }
            if (err?.statusCode || err?.whatException) throw err;
            ctx.logger?.error?.({err, url}, "POS terminal connection failed");
            throw apiValidationException("pos_terminal_unreachable", "terminalHost", null, ctx.languageCode);
        } finally {
            clearTimeout(timeout);
        }
    } finally {
        clearInFlightTerminalCharge(body.sessionId, reference);
    }
}

