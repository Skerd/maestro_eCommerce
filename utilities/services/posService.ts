import {ObjectId} from "mongodb";
import type {ClientSession} from "mongoose";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import type {PayPosOrderFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/payPosOrder.form.validator";
import type {RefundPosOrderFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/refundPosOrder.form.validator";
import type {CashMovePosSessionFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/cashMovePosSession.form.validator";
import type {ClosePosSessionFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/closePosSession.form.validator";
import Product from "@eCommerceModule/database/schemas/product/product";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import PosConfig from "@eCommerceModule/database/schemas/posConfig/posConfig";
import PosSession from "@eCommerceModule/database/schemas/posSession/posSession";
import PosOrder, {IPosOrder} from "@eCommerceModule/database/schemas/posOrder/posOrder";
import PosPaymentMethod from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {inventoryMovementService} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.service";
import {paymentTransactionService} from "@financeModule/database/schemas/paymentTransaction/paymentTransaction.service";
import {generateOrderNumber} from "@eCommerceModule/utilities/services/orderNumberService";
import {posOrderToDTO} from "@eCommerceModule/utilities/mappers/posOrder/posOrderMapper.dto";
import {posSessionToDTO} from "@eCommerceModule/utilities/mappers/posSession/posSessionMapper.dto";
import {posConfigToDTO} from "@eCommerceModule/utilities/mappers/posConfig/posConfigMapper.dto";
import {
    buildReceiptFromPosOrder,
    getPosSessionReconciliation,
    rebuildPaidPosResult,
    refToId,
} from "@eCommerceModule/utilities/services/posTillOps";
import {warehouseIdsFromPosConfig} from "@eCommerceModule/utilities/services/warehousePosConfigGuard";
import {
    assertPosTillMutable,
    clearInFlightTerminalCharge,
    getCompanyPosLock,
    isCompanyPosLockActive,
    registerInFlightTerminalCharge,
} from "@eCommerceModule/utilities/services/posKillSwitch";
import {buildPosTerminalUrl, normalizePosTerminalPath} from "@eCommerceModule/utilities/services/posTerminalUrl";
import {roundMoney} from "@eCommerceModule/utilities/services/money";
import {resolvePosLineUnitPrice} from "@eCommerceModule/utilities/services/posLinePrice";

type Ctx = {
    logger: any;
    languageCode: string;
    company: {_id: ObjectId; name?: string};
    userId: ObjectId;
    session?: ClientSession;
};


async function generatePosOrderName(companyId: ObjectId, session?: ClientSession): Promise<string> {
    const year = new Date().getFullYear();
    const prefix = `POS/${year}/`;
    const last = await PosOrder.findOne(
        {company: companyId, name: {$regex: `^${prefix.replace(/\//g, "\\/")}`}},
        {name: 1},
        {sort: {createdAt: -1}, session},
    ).lean();
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
    const count = await PosSession.countDocuments({company: companyId, name: {$regex: `^${prefix.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}`}}, {session});
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
    };

    const before = await Inventory.findOne(filter, {quantityOnHand: 1, quantityReserved: 1}, {session: ctx.session});
    const onHand = before?.quantityOnHand ?? 0;
    const reserved = before?.quantityReserved ?? 0;
    if (!allowOversell && onHand - reserved < quantity) {
        throw apiValidationException("pos_insufficient_stock", "quantity", null, ctx.languageCode);
    }

    let updated;
    if (allowOversell) {
        updated = await Inventory.findOneAndUpdate(
            filter,
            {$inc: {quantityOnHand: -quantity}},
            {new: true, upsert: true, session: ctx.session},
        );
    } else {
        updated = await Inventory.findOneAndUpdate(
            {
                ...filter,
                $expr: {$gte: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, quantity]},
            },
            {$inc: {quantityOnHand: -quantity}},
            {new: true, session: ctx.session},
        );
        if (!updated) {
            throw apiValidationException("pos_insufficient_stock", "quantity", null, ctx.languageCode);
        }
    }

    const quantityAfter = updated?.quantityOnHand ?? onHand - quantity;
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
        } as any,
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
        };
        const before = await Inventory.findOne(
            filter,
            {quantityOnHand: 1, quantityReserved: 1},
            {session: ctx.session},
        );
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
        remaining = roundMoney(remaining - take);
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
    };
    const before = await Inventory.findOne(filter, {quantityOnHand: 1}, {session: ctx.session});
    const onHand = before?.quantityOnHand ?? 0;
    const updated = await Inventory.findOneAndUpdate(
        filter,
        {$inc: {quantityOnHand: quantity}},
        {upsert: true, new: true, session: ctx.session},
    );
    await inventoryMovementService.create(
        {
            inventory: updated?._id ?? before?._id,
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
        } as any,
        {logger: ctx.logger, languageCode: ctx.languageCode, session: ctx.session, auditUserId},
    );
}

export async function openPosSession(
    body: {configId: string; openingBalance?: number; notes?: string},
    ctx: Ctx,
) {
    const config = await PosConfig.findOne({
        _id: body.configId,
        company: ctx.company._id,
        deletedAt: null,
    }).populate("paymentMethods warehouses currency managers fiscalConfig");

    if (!config) throw apiValidationException("pos_config_not_found", "configId", null, ctx.languageCode);

    await assertPosTillMutable(config, ctx);

    const existing = await PosSession.findOne({
        company: ctx.company._id,
        config: config._id,
        state: {$in: ["opening_control", "opened", "closing_control"]},
        deletedAt: null,
    });
    if (existing) {
        throw apiValidationException("pos_session_already_open", "configId", null, ctx.languageCode);
    }

    const openingBalance = Number(body.openingBalance ?? 0);
    const name = await generateSessionName(config.name, ctx.company._id, ctx.session);
    const now = new Date();

    const doc = new PosSession({
        name,
        config: config._id,
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

    const populated = await PosSession.findById(doc._id)
        .populate("config openedBy")
        .session(ctx.session ?? null);
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
        deletedAt: null,
    };
    if (configId) {
        if (!ObjectId.isValid(configId)) {
            throw apiValidationException("pos_config_not_found", "configId", null, ctx.languageCode);
        }
        filter.config = new ObjectId(configId);
    }

    const session = await PosSession.findOne(filter)
        .sort({openedAt: -1, createdAt: -1})
        .populate("config openedBy closedBy");
    if (!session) return null;

    const config = await PosConfig.findById(session.config).populate(
        "paymentMethods warehouses currency managers pausedBy fiscalConfig",
    );
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
    const sessionDoc = await PosSession.findOne({
        _id: body._id,
        company: ctx.company._id,
        deletedAt: null,
    });
    if (!sessionDoc) throw apiValidationException("pos_session_not_found", "_id", null, ctx.languageCode);
    if (sessionDoc.state !== "opened") {
        throw apiValidationException("pos_session_not_opened", "_id", null, ctx.languageCode);
    }

    {
        const gateConfig = await PosConfig.findById(sessionDoc.config);
        if (!gateConfig) throw apiValidationException("pos_config_not_found", "_id", null, ctx.languageCode);
        await assertPosTillMutable(gateConfig, ctx);
    }

    if (body.type === "out") {
        const config = await PosConfig.findById(sessionDoc.config);
        const {hasAnyManagerPin, managerPinMatchesForUser} = await import(
            "@eCommerceModule/utilities/services/posManagerPin"
        );
        if ((config as any)?.pinForCashOut && config && hasAnyManagerPin(config)) {
            const approvedBy = body.managerId
                ? await managerPinMatchesForUser(config, body.managerId, body.managerPin || "")
                : null;
            if (!body.managerPin || !body.managerId || !approvedBy) {
                throw apiValidationException("pos_manager_pin_invalid", "managerPin", null, ctx.languageCode);
            }
        }
    }

    const amount = Number(body.amount);
    if (body.type === "out" && sessionDoc.cashRegisterBalance < amount) {
        throw apiValidationException("pos_insufficient_cash", "amount", null, ctx.languageCode);
    }

    const delta = body.type === "in" ? amount : -amount;
    sessionDoc.cashMoves.push({
        type: body.type,
        amount,
        reason: body.reason,
        at: new Date(),
        by: ctx.userId,
    } as any);
    sessionDoc.cashRegisterBalance = roundMoney(sessionDoc.cashRegisterBalance + delta);
    sessionDoc.expectedCash = roundMoney(sessionDoc.expectedCash + delta);
    sessionDoc.markModified("cashMoves");
    await sessionDoc.save({session: ctx.session});

    const populated = await PosSession.findById(sessionDoc._id).populate("config openedBy").session(ctx.session ?? null);
    return posSessionToDTO(populated!);
}

export async function closePosSession(body: ClosePosSessionFormType, ctx: Ctx) {
    const sessionDoc = await PosSession.findOne({
        _id: body._id,
        company: ctx.company._id,
        deletedAt: null,
    });
    if (!sessionDoc) throw apiValidationException("pos_session_not_found", "_id", null, ctx.languageCode);
    if (sessionDoc.state === "closed") {
        throw apiValidationException("pos_session_already_closed", "_id", null, ctx.languageCode);
    }

    const countedCash = Number(body.closingBalance);
    const expectedCash = Number(sessionDoc.expectedCash ?? 0);
    const difference = roundMoney(countedCash - expectedCash);
    if (Math.abs(difference) >= 0.01 && !(body.differenceReason?.trim() || body.notes?.trim())) {
        throw apiValidationException("pos_close_difference_reason_required", "differenceReason", null, ctx.languageCode);
    }

    const heldDraftCount = await PosOrder.countDocuments({
        company: ctx.company._id,
        session: sessionDoc._id,
        state: "draft",
        deletedAt: null,
    }).session(ctx.session ?? null);
    if (heldDraftCount > 0) {
        throw apiValidationException("pos_close_held_orders_open", "_id", null, ctx.languageCode);
    }

    const reconciliation = await getPosSessionReconciliation(sessionDoc._id.toString(), ctx, countedCash);

    const now = new Date();
    sessionDoc.state = "closed";
    sessionDoc.closedBy = ctx.userId as any;
    sessionDoc.closedAt = now;
    sessionDoc.closingBalance = countedCash;
    const noteParts = [body.notes?.trim(), body.differenceReason?.trim()].filter(Boolean);
    if (Math.abs(difference) >= 0.01) {
        noteParts.push(`Cash difference: ${difference.toFixed(2)} (counted ${countedCash.toFixed(2)} vs expected ${expectedCash.toFixed(2)})`);
    }
    if (noteParts.length) sessionDoc.notes = noteParts.join(" | ");
    await sessionDoc.save({session: ctx.session});

    const populated = await PosSession.findById(sessionDoc._id)
        .populate("config openedBy closedBy")
        .session(ctx.session ?? null);
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
        const cfg = await PosConfig.findOne({
            _id: params.configId,
            company: ctx.company._id,
            deletedAt: null,
        })
            .select("warehouses warehouse")
            .lean();
        if (cfg) warehouseIds = warehouseIdsFromPosConfig(cfg as any);
    }

    // Barcode may hit a variant first
    let variantHits: any[] = [];
    if (params.barcode?.trim()) {
        const code = params.barcode.trim();
        variantHits = await ProductVariant.find({
            company: ctx.company._id,
            deletedAt: null,
            status: "active",
            $or: [{barcode: code}, {sku: code}],
        })
            .select("product sku barcode price attributeCombination trackInventory")
            .limit(20)
            .lean();
    }

    const filter: Record<string, unknown> = {
        company: ctx.company._id,
        status: "active",
        deletedAt: null,
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
        const q = params.search.trim();
        filter.$or = [
            {title: {$regex: q, $options: "i"}},
            {sku: {$regex: q, $options: "i"}},
            {barcode: {$regex: q, $options: "i"}},
        ];
    } else {
        // Default grid: exclude bare variable parents without forcing variants-only browse
        filter.type = {$nin: ["variable"]};
    }
    if (params.categoryId) {
        filter.categories = params.categoryId;
    }

    const [rows, total] = await Promise.all([
        Product.find(filter)
            .select("title sku barcode ean price currency mainImage trackInventory type shortDescription hasVariants")
            .sort({title: 1})
            .skip((page - 1) * limit)
            .limit(limit)
            .lean(),
        Product.countDocuments(filter),
    ]);

    const productIds = rows.map((p: any) => p._id);
    const variants = productIds.length
        ? await ProductVariant.find({
              company: ctx.company._id,
              product: {$in: productIds},
              deletedAt: null,
              status: "active",
          })
              .select("product sku barcode price attributeCombination trackInventory")
              .sort({order: 1})
              .lean()
        : [];

    const variantIds = variants.map((v: any) => v._id);
    let stockRows: any[] = [];
    if (warehouseIds.length && (productIds.length || variantIds.length)) {
        stockRows = await Inventory.find({
            company: ctx.company._id,
            warehouse: {$in: warehouseIds},
            $or: [
                {product: {$in: productIds}, variant: null},
                ...(variantIds.length ? [{variant: {$in: variantIds}}] : []),
            ],
        })
            .select("product variant quantityOnHand quantityReserved")
            .lean();
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

    const variantsByProduct = new Map<string, any[]>();
    for (const v of variants) {
        const pid = v.product.toString();
        const list = variantsByProduct.get(pid) ?? [];
        list.push({
            _id: v._id.toString(),
            sku: v.sku,
            barcode: v.barcode,
            price: v.price,
            trackInventory: !!v.trackInventory,
            label:
                (v.attributeCombination ?? [])
                    .map((a: any) => a.value)
                    .filter(Boolean)
                    .join(" / ") ||
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
            trackInventory: !!p.trackInventory,
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

export async function payPosOrder(body: PayPosOrderFormType, ctx: Ctx) {
    const sessionDoc = await PosSession.findOne({
        _id: body.sessionId,
        company: ctx.company._id,
        deletedAt: null,
    });
    if (!sessionDoc) throw apiValidationException("pos_session_not_found", "sessionId", null, ctx.languageCode);
    if (sessionDoc.state !== "opened") {
        throw apiValidationException("pos_session_not_opened", "sessionId", null, ctx.languageCode);
    }

    if (body.clientRequestId) {
        const existing = await PosOrder.findOne({
            company: ctx.company._id,
            clientRequestId: body.clientRequestId,
            deletedAt: null,
        }).session(ctx.session ?? null);
        if (existing?.state === "paid") {
            // Idempotent replay succeeds even if the till is now paused/inactive.
            return rebuildPaidPosResult(existing, ctx);
        }
    }

    const config = await PosConfig.findOne({
        _id: sessionDoc.config,
        company: ctx.company._id,
        deletedAt: null,
    }).populate("warehouses currency paymentMethods");
    if (!config) throw apiValidationException("pos_config_not_found", "sessionId", null, ctx.languageCode);

    await assertPosTillMutable(config, ctx);

    const warehouseIds = warehouseIdsFromPosConfig(config as any);
    if (!warehouseIds.length) {
        throw apiValidationException("pos_config_warehouse_required", "warehouses", null, ctx.languageCode);
    }
    const assignedFiscalConfigId = refToId(config.fiscalConfig);
    const FiscalConfigModel = (await import("@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig")).default;
    const assignedFiscal = assignedFiscalConfigId
        ? await FiscalConfigModel.findOne({
            _id: assignedFiscalConfigId,
            company: ctx.company._id,
            deletedAt: null,
        }).select("_id isActive certificate")
        : null;
    const currencyId = ((config.currency as any)?._id ?? config.currency) as ObjectId | undefined;

    const lines: any[] = [];
    let subtotal = 0;
    let lineDiscountTotal = 0;

    for (const line of body.lines) {
        const product = await Product.findOne({
            _id: line.productId,
            company: ctx.company._id,
            status: "active",
            deletedAt: null,
        });
        if (!product) throw apiValidationException("pos_product_not_found", "productId", null, ctx.languageCode);

        const qty = Number(line.quantity);
        const unitPrice = await resolvePosLineUnitPrice(product as any, line.variantId, ctx);
        const discPct = Math.min(100, Math.max(0, Number(line.discountPercent ?? 0)));
        const gross = roundMoney(unitPrice * qty);
        const discountAmount = roundMoney((gross * discPct) / 100);
        const priceTotal = roundMoney(gross - discountAmount);

        lines.push({
            product: product._id,
            variant: line.variantId ? new ObjectId(line.variantId) : undefined,
            quantity: qty,
            unitPrice,
            discountPercent: discPct,
            discountAmount,
            priceSubtotal: gross,
            priceTotal,
            taxAmount: 0,
            productName: (product as any).title,
            productSku: (product as any).sku,
            barcode: (product as any).barcode ?? (product as any).ean,
            trackInventory: !!(product as any).trackInventory,
        });
        subtotal = roundMoney(subtotal + gross);
        lineDiscountTotal = roundMoney(lineDiscountTotal + discountAmount);
    }

    const orderDiscPct = Math.min(100, Math.max(0, Number(body.discountPercent ?? 0)));
    const afterLineDisc = roundMoney(subtotal - lineDiscountTotal);
    const orderDiscount = roundMoney((afterLineDisc * orderDiscPct) / 100);
    const discountTotal = roundMoney(lineDiscountTotal + orderDiscount);
    const amountTotal = roundMoney(Math.max(0, subtotal - discountTotal));

    if (discountTotal > 0.001 && (config as any).pinForDiscount) {
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
    const methods = await PosPaymentMethod.find({
        _id: {$in: paymentMethodIds},
        company: ctx.company._id,
        isActive: true,
        deletedAt: null,
    });
    if (methods.length !== new Set(paymentMethodIds).size) {
        throw apiValidationException("pos_payment_method_invalid", "payments", null, ctx.languageCode);
    }
    const methodById = new Map(methods.map(m => [m._id.toString(), m]));

    const amountPaid = roundMoney(body.payments.reduce((s, p) => s + Number(p.amount), 0));
    if (amountPaid + 0.001 < amountTotal) {
        throw apiValidationException("pos_payment_insufficient", "payments", null, ctx.languageCode);
    }
    const amountReturn = roundMoney(Math.max(0, amountPaid - amountTotal));

    if (!currencyId) {
        throw apiValidationException("pos_currency_required", "currency", null, ctx.languageCode);
    }

    let posOrder: IPosOrder;
    if (body.heldOrderId) {
        const held = await PosOrder.findOne({
            _id: body.heldOrderId,
            company: ctx.company._id,
            session: sessionDoc._id,
            state: "draft",
            deletedAt: null,
        }).session(ctx.session ?? null);
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

    const now = new Date();
    posOrder.state = "paid";
    posOrder.session = sessionDoc._id as any;
    posOrder.config = config._id as any;
    posOrder.cashier = ctx.userId as any;
    posOrder.customer = body.customerId ? (new ObjectId(body.customerId) as any) : undefined;
    posOrder.customerName = body.customerName || (body.customerId ? undefined : "Walk-in Customer");
    posOrder.lines = lines.map(({trackInventory: _t, ...rest}) => rest) as any;
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
    }) as any;
    posOrder.amountTax = 0;
    posOrder.amountTotal = amountTotal;
    posOrder.amountPaid = amountPaid;
    posOrder.amountReturn = amountReturn;
    posOrder.discountTotal = discountTotal;
    posOrder.orderDiscountPercent = orderDiscPct;
    posOrder.note = body.note;
    posOrder.isRefund = false;
    posOrder.company = ctx.company._id as any;
    if (body.clientRequestId) posOrder.clientRequestId = body.clientRequestId;
    await posOrder.save({session: ctx.session});

    for (const line of lines) {
        if (!line.trackInventory) continue;
        await consumePosStockAcrossWarehouses({
            productId: line.product,
            variantId: line.variant,
            warehouseIds,
            quantity: line.quantity,
            companyId: ctx.company._id,
            posOrderId: posOrder._id,
            auditUserId: ctx.userId,
            allowOversell: !!(config as any).allowOversell,
            ctx,
        });
    }

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
            snapshot: {title: l.productName, sku: l.productSku},
        })),
        currency: currencyId,
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
        taxTotal: 0,
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

    for (const payment of body.payments) {
        const method = methodById.get(payment.paymentMethodId);
        await paymentTransactionService.create(
            {
                sourceType: "productOrder",
                sourceId: productOrder._id,
                gateway: "manual",
                type: "charge",
                status: "succeeded",
                amount: Number(payment.amount),
                currency: currencyId,
                refundedAmount: 0,
                metadata: {
                    posOrderId: posOrder._id.toString(),
                    paymentMethodId: payment.paymentMethodId,
                    paymentMethodType: method?.type,
                    paymentMethodName: method?.name,
                    terminalAuthCode: payment.terminalAuthCode,
                    terminalReference: payment.terminalReference,
                    terminalId: payment.terminalId || method?.terminalId,
                    channel: "pos",
                },
                company: ctx.company._id,
            } as any,
            {logger: ctx.logger, languageCode: ctx.languageCode, session: ctx.session, auditUserId: ctx.userId},
        );
    }

    let cashPaid = 0;
    let cardPaid = 0;
    for (const payment of body.payments) {
        const method = methodById.get(payment.paymentMethodId);
        const amt = Number(payment.amount);
        if (method?.type === "cash") cashPaid = roundMoney(cashPaid + amt);
        else cardPaid = roundMoney(cardPaid + amt);
    }
    // Change returned from cash drawer
    const netCash = roundMoney(cashPaid - amountReturn);

    sessionDoc.orderCount += 1;
    sessionDoc.totalSales = roundMoney(sessionDoc.totalSales + amountTotal);
    sessionDoc.totalCash = roundMoney(sessionDoc.totalCash + Math.max(0, netCash));
    sessionDoc.totalCard = roundMoney(sessionDoc.totalCard + cardPaid);
    if (netCash !== 0) {
        sessionDoc.cashRegisterBalance = roundMoney(sessionDoc.cashRegisterBalance + netCash);
        sessionDoc.expectedCash = roundMoney(sessionDoc.expectedCash + netCash);
    }
    await sessionDoc.save({session: ctx.session});

    const populated = await PosOrder.findById(posOrder._id)
        .populate("session config cashier customer payments.paymentMethod")
        .session(ctx.session ?? null);

    const receiptCtx = {
        ...ctx,
        company: {_id: ctx.company._id, name: ctx.company?.name || config.name},
    };
    const decorateReceipt = async (doc: typeof populated) => {
        const next = await buildReceiptFromPosOrder(doc!, receiptCtx);
        next.productOrderNumber = orderNumber;
        next.paidAt = now.toISOString();
        next.customerName = body.customerName || "Walk-in Customer";
        return next;
    };

    const receipt = await decorateReceipt(populated);

    // Albanian CIS fiscalization when the till's fiscal config is active and has a certificate (best-effort; pay succeeds even if CIS fails)
    let fiscal: {nslf?: string; nivf?: string; eic?: string; qrVerifyUrl?: string; fault?: string} | undefined;
    try {
        const {fiscalizePosOrder} = await import("@eCommerceModule/utilities/fiscalization/fiscalizationService");
        if (assignedFiscal?.isActive && (assignedFiscal.certificate?.length ?? 0) > 0) {
            const result = await fiscalizePosOrder(posOrder._id.toString(), ctx.company._id, {
                fiscalConfigId: assignedFiscal._id.toString(),
                companyVat: (ctx.company as {vat?: string}).vat,
                companyName: (ctx.company as {name?: string}).name,
            });
            fiscal = {
                nslf: result.invoice.nslf,
                nivf: result.invoice.nivf,
                eic: result.einvoice?.eic,
                qrVerifyUrl: result.invoice.nivf ? result.invoice.qrVerifyUrl : undefined,
                fault: result.invoice.fault || result.einvoice?.fault || result.order.fiscalError,
            };
            const refreshed = await PosOrder.findById(posOrder._id)
                .populate("session config cashier customer payments.paymentMethod")
                .session(ctx.session ?? null);
            return {
                order: posOrderToDTO(refreshed || populated!),
                receipt: await decorateReceipt(refreshed || populated!),
                session: posSessionToDTO(sessionDoc),
                fiscal,
            };
        }
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        ctx.logger?.warn?.(`POS fiscalize skipped/failed: ${message}`);
        fiscal = {fault: message};
        posOrder.fiscalError = message;
        await posOrder.save({session: ctx.session});
        const failed = await PosOrder.findById(posOrder._id)
            .populate("session config cashier customer payments.paymentMethod")
            .session(ctx.session ?? null);
        return {
            order: posOrderToDTO(failed || populated!),
            receipt: await decorateReceipt(failed || populated!),
            session: posSessionToDTO(sessionDoc),
            fiscal,
        };
    }

    return {
        order: posOrderToDTO(populated!),
        receipt,
        session: posSessionToDTO(sessionDoc),
        fiscal,
    };
}

export async function refundPosOrder(body: RefundPosOrderFormType, ctx: Ctx) {
    const original = await PosOrder.findOne({
        _id: body._id,
        company: ctx.company._id,
        deletedAt: null,
    });
    if (!original) throw apiValidationException("pos_order_not_found", "_id", null, ctx.languageCode);
    if (original.state !== "paid") {
        throw apiValidationException("pos_order_not_refundable", "_id", null, ctx.languageCode);
    }
    if (original.isRefund) {
        throw apiValidationException("pos_order_is_refund", "_id", null, ctx.languageCode);
    }

    const sessionDoc = await PosSession.findOne({
        _id: original.session,
        company: ctx.company._id,
        deletedAt: null,
    });
    if (!sessionDoc || sessionDoc.state !== "opened") {
        throw apiValidationException("pos_session_not_opened", "session", null, ctx.languageCode);
    }

    const config = await PosConfig.findById(original.config);
    if (!config) throw apiValidationException("pos_config_not_found", "config", null, ctx.languageCode);
    await assertPosTillMutable(config, ctx);
    const warehouseIds = warehouseIdsFromPosConfig(config as any);
    const warehouseId = warehouseIds[0];
    if (!warehouseId) {
        throw apiValidationException("pos_config_warehouse_required", "warehouses", null, ctx.languageCode);
    }

    if ((config as any).pinForRefund) {
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

    const originalLines = ((original.lines as any[]) ?? []);
    const remainingOf = (line: any) =>
        Math.max(0, Number(line.quantity) - Number(line.quantityRefunded ?? 0));
    const alreadyPartial = originalLines.some((l: any) => Number(l.quantityRefunded ?? 0) > 0.0001);
    const priorAmountRefunded = Number((original as any).amountRefunded ?? 0);
    const remainingOrderAmount = roundMoney(Math.max(0, Number(original.amountTotal) - priorAmountRefunded));

    let refundLines: any[];
    let refundAmount: number;
    let restockPlan: {line: any; quantity: number}[] = [];

    if (body.lines?.length) {
        refundLines = [];
        for (const req of body.lines) {
            const line = originalLines.find((l: any) => l._id?.toString?.() === req.lineId);
            if (!line) throw apiValidationException("pos_refund_line_invalid", "lines", null, ctx.languageCode);
            const qty = Number(req.quantity);
            const remaining = remainingOf(line);
            if (!(qty > 0) || qty > remaining + 0.0001) {
                throw apiValidationException("pos_refund_qty_invalid", "lines", null, ctx.languageCode);
            }
            const ratio = line.quantity > 0 ? qty / line.quantity : 0;
            refundLines.push({
                product: line.product,
                variant: line.variant,
                quantity: qty,
                quantityRefunded: 0,
                unitPrice: line.unitPrice,
                discountPercent: line.discountPercent,
                discountAmount: roundMoney((line.discountAmount ?? 0) * ratio),
                priceSubtotal: roundMoney((line.priceSubtotal ?? 0) * ratio),
                priceTotal: roundMoney((line.priceTotal ?? 0) * ratio),
                taxAmount: 0,
                productName: line.productName,
                productSku: line.productSku,
                barcode: line.barcode,
            });
            restockPlan.push({line, quantity: qty});
        }
        refundAmount = roundMoney(refundLines.reduce((s, l) => s + l.priceTotal, 0));
        // Apply order-level discount proportionally to selected lines' share of original subtotal
        const originalLineSum = originalLines.reduce((s: number, l: any) => s + (l.priceTotal ?? 0), 0);
        if (original.discountTotal > 0 && originalLineSum > 0) {
            const share = refundAmount / originalLineSum;
            const orderDiscShare = roundMoney(original.discountTotal * share);
            refundAmount = roundMoney(Math.max(0, refundAmount - orderDiscShare));
        }
        if (refundAmount > remainingOrderAmount + 0.011) {
            throw apiValidationException("pos_refund_amount_invalid", "amount", null, ctx.languageCode);
        }
    } else {
        // Amount-only (or implicit full) refunds are not allowed once any line was partially refunded —
        // remaining qty must be selected explicitly.
        if (alreadyPartial) {
            throw apiValidationException("pos_refund_lines_required", "lines", null, ctx.languageCode);
        }
        refundAmount = body.amount != null ? Number(body.amount) : remainingOrderAmount;
        if (refundAmount <= 0 || refundAmount > remainingOrderAmount + 0.001) {
            throw apiValidationException("pos_refund_amount_invalid", "amount", null, ctx.languageCode);
        }
        const isFullRemaining = Math.abs(refundAmount - remainingOrderAmount) < 0.011;
        if (!isFullRemaining) {
            // Partial amount without lines is ambiguous for restock — require line selection.
            throw apiValidationException("pos_refund_lines_required", "lines", null, ctx.languageCode);
        }
        refundLines = originalLines.map(line => {
            const remaining = remainingOf(line);
            const lineRatio = line.quantity > 0 ? remaining / line.quantity : 0;
            return {
                product: line.product,
                variant: line.variant,
                quantity: remaining,
                quantityRefunded: 0,
                unitPrice: line.unitPrice,
                discountPercent: line.discountPercent,
                discountAmount: roundMoney((line.discountAmount ?? 0) * lineRatio),
                priceSubtotal: roundMoney((line.priceSubtotal ?? 0) * lineRatio),
                priceTotal: roundMoney((line.priceTotal ?? 0) * lineRatio),
                taxAmount: 0,
                productName: line.productName,
                productSku: line.productSku,
                barcode: line.barcode,
            };
        });
        restockPlan = originalLines
            .map(line => ({line, quantity: remainingOf(line)}))
            .filter(p => p.quantity > 0);
        // Recompute amount from remaining lines when doing full remaining refund
        refundAmount = roundMoney(refundLines.reduce((s, l) => s + l.priceTotal, 0));
        const originalLineSum = originalLines.reduce((s: number, l: any) => s + (l.priceTotal ?? 0), 0);
        if (original.discountTotal > 0 && originalLineSum > 0) {
            const share = refundAmount / originalLineSum;
            const orderDiscShare = roundMoney(original.discountTotal * share);
            refundAmount = roundMoney(Math.max(0, refundAmount - orderDiscShare));
        }
    }

    if (!(refundAmount > 0) || !refundLines.length) {
        throw apiValidationException("pos_refund_amount_invalid", "amount", null, ctx.languageCode);
    }

    const name = await generatePosOrderName(ctx.company._id, ctx.session);
    const now = new Date();
    const payRatio = original.amountTotal > 0 ? refundAmount / original.amountTotal : 1;

    const refundOrder = new PosOrder({
        name,
        session: sessionDoc._id,
        config: config._id,
        state: "refunded",
        cashier: ctx.userId,
        customer: original.customer,
        customerName: original.customerName,
        lines: refundLines,
        payments: ((original.payments as any[]) ?? []).map(p => ({
            paymentMethod: p.paymentMethod,
            paymentMethodName: p.paymentMethodName,
            paymentMethodType: p.paymentMethodType,
            amount: roundMoney(Number(p.amount) * payRatio),
            paymentDate: now,
            terminalAuthCode: p.terminalAuthCode,
            terminalReference: p.terminalReference,
            terminalId: p.terminalId,
        })),
        amountTax: 0,
        amountTotal: refundAmount,
        amountPaid: refundAmount,
        amountReturn: 0,
        discountTotal: roundMoney(Math.max(0, (original.discountTotal ?? 0) * payRatio)),
        note: body.reason ? `Refund: ${body.reason}` : `Refund of ${original.name}`,
        refundOf: original._id,
        isRefund: true,
        company: ctx.company._id,
    });
    await refundOrder.save({session: ctx.session});

    for (const {line, quantity} of restockPlan) {
        const product = await Product.findById(line.product).select("trackInventory").session(ctx.session ?? null);
        if (!(product as any)?.trackInventory) continue;
        await restockPosStock({
            productId: line.product?._id ?? line.product,
            variantId: line.variant?._id ?? line.variant,
            warehouseId,
            quantity,
            companyId: ctx.company._id,
            posOrderId: refundOrder._id,
            auditUserId: ctx.userId,
            ctx,
        });
    }

    // Persist refunded quantities on the original sale lines
    if (body.lines?.length) {
        for (const req of body.lines) {
            const line = originalLines.find((l: any) => l._id?.toString?.() === req.lineId);
            if (!line) continue;
            line.quantityRefunded = roundMoney(Number(line.quantityRefunded ?? 0) + Number(req.quantity));
        }
    } else {
        for (const line of originalLines) {
            line.quantityRefunded = Number(line.quantity);
        }
    }
    original.markModified("lines");
    (original as any).amountRefunded = roundMoney(priorAmountRefunded + refundAmount);

    const allLinesFullyRefunded = originalLines.every((l: any) => remainingOf(l) <= 0.0001);
    const fullyRefunded =
        allLinesFullyRefunded ||
        Math.abs(Number((original as any).amountRefunded) - Number(original.amountTotal)) < 0.011;

    if (fullyRefunded) {
        original.state = "refunded";
        if (original.productOrder) {
            await ProductOrder.findByIdAndUpdate(
                original.productOrder,
                {
                    $set: {status: "refunded", paymentStatus: "refunded", fulfillmentStatus: "returned"},
                    $push: {timeline: {event: "refunded", timestamp: now, userId: ctx.userId, note: body.reason}},
                },
                {session: ctx.session},
            );
        }
    }
    await original.save({session: ctx.session});

    // Cash refund reduces drawer
    const cashMethods = await PosPaymentMethod.find({
        _id: {$in: ((original.payments as any[]) ?? []).map((p: any) => p.paymentMethod)},
        type: "cash",
    }).session(ctx.session ?? null);
    const cashMethodIds = new Set(cashMethods.map(m => m._id.toString()));
    let cashRefund = 0;
    for (const p of (original.payments as any[]) ?? []) {
        const mid = (p.paymentMethod?._id ?? p.paymentMethod)?.toString?.();
        if (mid && cashMethodIds.has(mid)) cashRefund = roundMoney(cashRefund + Number(p.amount) * payRatio);
    }
    if (cashRefund > 0) {
        sessionDoc.cashRegisterBalance = roundMoney(sessionDoc.cashRegisterBalance - cashRefund);
        sessionDoc.expectedCash = roundMoney(sessionDoc.expectedCash - cashRefund);
        sessionDoc.totalCash = roundMoney(Math.max(0, sessionDoc.totalCash - cashRefund));
    }
    sessionDoc.totalSales = roundMoney(Math.max(0, sessionDoc.totalSales - refundAmount));
    await sessionDoc.save({session: ctx.session});

    const populated = await PosOrder.findById(refundOrder._id)
        .populate("session config cashier customer payments.paymentMethod")
        .session(ctx.session ?? null);

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

export type {TestPosTerminalConnectionResult} from "./posTerminalConnection";
export {testPosTerminalConnection} from "./posTerminalConnection";

/**
 * Charge a bank payment terminal configured on a card/bank POS payment method.
 * - `manual`: staff confirms on an external terminal; we only validate config and return approved.
 * - `local_http`: POST JSON to {http|https}://{host}:{port}{path} (local ECR / bank POS bridge).
 */
export async function chargePosTerminal(body: ChargePosTerminalBody, ctx: Ctx): Promise<ChargePosTerminalResult> {
    const sessionDoc = await PosSession.findOne({
        _id: body.sessionId,
        company: ctx.company._id,
        deletedAt: null,
    }).session(ctx.session ?? null);
    if (!sessionDoc) throw apiValidationException("pos_session_not_found", "sessionId", null, ctx.languageCode);
    if (sessionDoc.state !== "opened") {
        throw apiValidationException("pos_session_not_opened", "sessionId", null, ctx.languageCode);
    }

    const gateConfig = await PosConfig.findById(sessionDoc.config).session(ctx.session ?? null);
    if (!gateConfig) throw apiValidationException("pos_config_not_found", "sessionId", null, ctx.languageCode);
    await assertPosTillMutable(gateConfig, ctx);

    const method = await PosPaymentMethod.findOne({
        _id: body.paymentMethodId,
        company: ctx.company._id,
        isActive: true,
        deletedAt: null,
    }).session(ctx.session ?? null);
    if (!method) throw apiValidationException("pos_payment_method_invalid", "paymentMethodId", null, ctx.languageCode);
    if (method.type !== "card" && method.type !== "bank") {
        throw apiValidationException("pos_terminal_not_for_method", "paymentMethodId", null, ctx.languageCode);
    }
    if (!method.terminalEnabled) {
        throw apiValidationException("pos_terminal_disabled", "paymentMethodId", null, ctx.languageCode);
    }

    const amount = roundMoney(Number(body.amount));
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
        cancelPath: (method as any).terminalCancelPath || "/cancel",
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

