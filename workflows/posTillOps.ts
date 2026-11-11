import {ObjectId} from "mongodb";
import type {ClientSession} from "mongoose";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import type {HoldPosOrderFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/holdPosOrder.form.validator";
import {userService} from "@coreModule/database/schemas/user/user.service";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import type {ProductType} from "@eCommerceModule/database/schemas/product/product";
import {posConfigService} from "@eCommerceModule/database/schemas/posConfig/posConfig.service";
import {posSessionService} from "@eCommerceModule/database/schemas/posSession/posSession.service";
import PosOrder, {IPosOrder} from "@eCommerceModule/database/schemas/posOrder/posOrder";
import {posOrderService} from "@eCommerceModule/database/schemas/posOrder/posOrder.service";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {posOrderToDTO} from "@eCommerceModule/utilities/mappers/posOrder/posOrderMapper.dto";
import {posSessionToDTO} from "@eCommerceModule/utilities/mappers/posSession/posSessionMapper.dto";
import {
    hasAnyManagerPin,
    managerPinMatchesForUser,
} from "@eCommerceModule/utilities/services/posManagerPin";
import {assertPosTillMutable} from "@eCommerceModule/utilities/services/posKillSwitch";
import {multiplyMoney, percentOfMoney, roundToCurrency, subtractMoney, sumMoney} from "armonia/src/modules/core/helpers/money";
import {currencyDecimalPlaces} from "@financeModule/utilities/services/currencyDecimals";
import {roundRate} from "@financeModule/utilities/fiscalization/fiscalizationService";
import {assertPosSellable, resolvePosLineUnitPrice} from "@eCommerceModule/utilities/services/posLinePrice";

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

async function resolveOpenedSession(sessionId: string, ctx: Ctx) {
    const sessionDoc = await posSessionService.findOne({
        _id: sessionId,
        company: ctx.company._id,
    }, {session: ctx.session, withDeleted: false});
    if (!sessionDoc) throw apiValidationException("pos_session_not_found", "sessionId", null, ctx.languageCode);
    if (sessionDoc.state !== "opened") {
        throw apiValidationException("pos_session_not_opened", "sessionId", null, ctx.languageCode);
    }
    return sessionDoc;
}

export type BuiltLine = {
    product: ObjectId;
    variant?: ObjectId;
    quantity: number;
    unitPrice: number;
    discountPercent: number;
    discountAmount: number;
    priceSubtotal: number;
    priceTotal: number;
    taxAmount: number;
    productName: string;
    productSku?: string;
    barcode?: string;
};

/**
 * Prices the cart lines on the server (held carts and pay), reading the products in the request's
 * transaction. Each line keeps its product type for the tax lookup; the order schema drops it on save.
 */
export async function buildDraftLines(
    bodyLines: HoldPosOrderFormType["lines"],
    ctx: Ctx,
    decimals: number,
): Promise<{lines: (BuiltLine & {productType: ProductType})[]; subtotal: number; lineDiscountTotal: number}> {
    const lines: (BuiltLine & {productType: ProductType})[] = [];
    let subtotal = 0;
    let lineDiscountTotal = 0;

    for (const line of bodyLines) {
        const product = await productService.findOne({
            _id: line.productId,
            company: ctx.company._id,
            status: "active",
        }, {session: ctx.session, withDeleted: false});
        if (!product) throw apiValidationException("pos_product_not_found", "productId", null, ctx.languageCode);
        assertPosSellable(product, ctx.languageCode);

        const qty = Number(line.quantity);
        const unitPrice = await resolvePosLineUnitPrice(product, line.variantId, ctx);
        const discPct = Math.min(100, Math.max(0, Number(line.discountPercent ?? 0)));
        const gross = multiplyMoney(unitPrice, qty, decimals);
        const discountAmount = percentOfMoney(gross, discPct, decimals);
        const priceTotal = subtractMoney(gross, discountAmount, decimals);

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
            productName: product.title,
            productSku: product.sku,
            barcode: product.barcode ?? product.ean,
            productType: product.type,
        });
        subtotal = sumMoney([subtotal, gross], decimals);
        lineDiscountTotal = sumMoney([lineDiscountTotal, discountAmount], decimals);
    }

    return {lines, subtotal, lineDiscountTotal};
}

export type PosReceiptVatRow = {
    rate: number;
    amount: number;
};

export type PosReceiptPayload = {
    companyName?: string;
    header?: string;
    footer?: string;
    shopName?: string;
    orderName?: string;
    productOrderNumber?: string;
    lines: {
        productName: string;
        quantity: number;
        unitPrice: number;
        discountPercent: number;
        priceTotal: number;
    }[];
    discountTotal: number;
    amountTotal: number;
    amountPaid: number;
    amountReturn: number;
    amountTax: number;
    amountWithoutVat: number;
    vatRows: PosReceiptVatRow[];
    payments: {
        method: string;
        type?: string;
        amount: number;
        terminalAuthCode?: string;
        terminalReference?: string;
        terminalId?: string;
    }[];
    customerName?: string;
    paidAt?: string;
    qrVerifyUrl?: string;
    nslf?: string;
    nivf?: string;
    qrCodeDataUrl?: string;
    fiscalIssueDateTime?: string;
    fiscalInvNum?: string;
    fiscalTcrCode?: string;
    fiscalOperatorCode?: string;
    fiscalBusinessUnitCode?: string;
    fiscalTypeOfInv?: string;
    fiscalError?: string;
    fiscalized: boolean;
    fiscalAttempted: boolean;
};

/** ObjectId or populated ref → hex id. */
export function refToId(value: unknown): string | undefined {
    return nestedEntityToRef(value)?.toString();
}

type QrCodeModule = {
    toDataURL?: (text: string, opts: object) => Promise<string>;
    default?: {toDataURL?: (text: string, opts: object) => Promise<string>};
};

async function qrCodeDataUrl(payload: string): Promise<string | undefined> {
    try {
        const QRCodeMod = (await import("qrcode")) as QrCodeModule;
        const toDataURL = QRCodeMod.toDataURL ?? QRCodeMod.default?.toDataURL;
        if (typeof toDataURL !== "function") return undefined;
        return await toDataURL(payload, {
            width: 168,
            margin: 1,
            errorCorrectionLevel: "M",
            color: {dark: "#000000", light: "#ffffff"},
        });
    } catch {
        return undefined;
    }
}

function vatRowsFromOrder(order: IPosOrder, decimals: number): PosReceiptVatRow[] {
    const byRate = new Map<number, number>();
    for (const line of order.lines ?? []) {
        const tax = roundToCurrency(Number(line.taxAmount || 0), decimals);
        const gross = roundToCurrency(Number(line.priceTotal || 0), decimals);
        const net = subtractMoney(gross, tax, decimals);
        const rate = net !== 0 && tax !== 0 ? roundRate((Math.abs(tax) / Math.abs(net)) * 100) : 0;
        byRate.set(rate, sumMoney([(byRate.get(rate) ?? 0), tax], decimals));
    }
    if (byRate.size === 0) return [{rate: 0, amount: 0}];
    return [...byRate.entries()]
        .sort((a, b) => a[0] - b[0])
        .map(([rate, amount]) => ({rate, amount}));
}

function isoFromDate(value: unknown): string | undefined {
    return value instanceof Date ? value.toISOString() : undefined;
}

async function buildReceiptFiscalQr(order: IPosOrder): Promise<
    Pick<
        PosReceiptPayload,
        "qrVerifyUrl" | "nslf" | "nivf" | "qrCodeDataUrl" | "fiscalError" | "fiscalized" | "fiscalAttempted"
    >
> {
    const nslf = order.nslf || undefined;
    const nivf = order.nivf || undefined;
    const fiscalError = order.fiscalError || undefined;
    const fiscalized = Boolean(nivf);
    const fiscalAttempted = Boolean(
        fiscalized || fiscalError || nslf || order.fiscalInvNum || order.fiscalTcrCode || order.fiscalConfig,
    );

    if (!fiscalAttempted) {
        return {nslf, nivf, fiscalError, fiscalized: false, fiscalAttempted: false};
    }

    if (fiscalized && order.qrVerifyUrl) {
        return {
            qrVerifyUrl: order.qrVerifyUrl,
            nslf,
            nivf,
            qrCodeDataUrl: await qrCodeDataUrl(order.qrVerifyUrl),
            fiscalError,
            fiscalized: true,
            fiscalAttempted: true,
        };
    }

    const message = fiscalError ? `NOT FISCALIZED: ${fiscalError}` : "NOT FISCALIZED";
    return {
        nslf,
        nivf,
        qrCodeDataUrl: await qrCodeDataUrl(message),
        fiscalError,
        fiscalized: false,
        fiscalAttempted: true,
    };
}

export async function buildReceiptFromPosOrder(
    order: IPosOrder,
    ctx: Ctx,
): Promise<PosReceiptPayload> {
    const config = await posConfigService.findOne({_id: order.config}, {session: ctx.session});
    const decimals = await currencyDecimalPlaces(nestedEntityToRef(config?.currency), ctx.session);
    let productOrderNumber: string | undefined;
    if (order.productOrder) {
        const po = await productOrderService.findOne({_id: order.productOrder}, {session: ctx.session}, undefined, "orderNumber");
        productOrderNumber = (po as {orderNumber?: string} | null)?.orderNumber;
    }

    const paidAt =
        isoFromDate((order as {updatedAt?: Date}).updatedAt)
        ?? isoFromDate((order as {createdAt?: Date}).createdAt)
        ?? new Date().toISOString();

    const fiscalQr = await buildReceiptFiscalQr(order);
    const amountTax = order.amountTax ?? 0;
    const amountTotal = order.amountTotal ?? 0;

    return {
        companyName: ctx.company?.name || config?.name,
        header: config?.receiptHeader,
        footer: config?.receiptFooter,
        shopName: config?.name,
        orderName: order.name,
        productOrderNumber,
        lines: (order.lines ?? []).map((line) => ({
            productName: line.productName,
            quantity: line.quantity,
            unitPrice: line.unitPrice,
            discountPercent: line.discountPercent ?? 0,
            priceTotal: line.priceTotal,
        })),
        discountTotal: order.discountTotal ?? 0,
        amountTotal,
        amountPaid: order.amountPaid ?? 0,
        amountReturn: order.amountReturn ?? 0,
        amountTax,
        amountWithoutVat: subtractMoney(amountTotal, amountTax, decimals),
        vatRows: vatRowsFromOrder(order, decimals),
        payments: (order.payments ?? []).map((payment) => ({
            method: payment.paymentMethodName ?? "Payment",
            type: payment.paymentMethodType,
            amount: payment.amount,
            terminalAuthCode: payment.terminalAuthCode,
            terminalReference: payment.terminalReference,
            terminalId: payment.terminalId,
        })),
        customerName: order.customerName || "Walk-in Customer",
        paidAt,
        fiscalIssueDateTime: order.fiscalIssueDateTime,
        fiscalInvNum: order.fiscalInvNum,
        fiscalTcrCode: order.fiscalTcrCode,
        fiscalOperatorCode: order.fiscalOperatorCode,
        fiscalBusinessUnitCode: order.fiscalBusinessUnitCode,
        fiscalTypeOfInv: order.fiscalTypeOfInv,
        ...fiscalQr,
    };
}

/** Park the current cart as a draft POS order (create or update). */
export async function holdPosOrder(body: HoldPosOrderFormType, ctx: Ctx) {
    const sessionDoc = await resolveOpenedSession(body.sessionId, ctx);
    const config = await posConfigService.findOne({
        _id: sessionDoc.config,
        company: ctx.company._id,
    }, {session: ctx.session, withDeleted: false});
    if (!config) throw apiValidationException("pos_config_not_found", "sessionId", null, ctx.languageCode);
    await assertPosTillMutable(config, ctx);

    const decimals = await currencyDecimalPlaces(nestedEntityToRef(sessionDoc.currency), ctx.session);
    const {lines, subtotal, lineDiscountTotal} = await buildDraftLines(body.lines, ctx, decimals);
    const orderDiscPct = Math.min(100, Math.max(0, Number(body.discountPercent ?? 0)));
    const afterLineDisc = subtractMoney(subtotal, lineDiscountTotal, decimals);
    const orderDiscount = percentOfMoney(afterLineDisc, orderDiscPct, decimals);
    const discountTotal = sumMoney([lineDiscountTotal, orderDiscount], decimals);
    const amountTotal = Math.max(0, subtractMoney(subtotal, discountTotal, decimals));

    let draft: IPosOrder | null = null;
    if (body._id) {
        draft = await posOrderService.findOne({
            _id: body._id,
            company: ctx.company._id,
            session: sessionDoc._id,
            state: "draft",
        }, {session: ctx.session, withDeleted: false});
        if (!draft) throw apiValidationException("pos_held_not_found", "_id", null, ctx.languageCode);
    }

    if (!draft) {
        const name = await generatePosOrderName(ctx.company._id, ctx.session);
        draft = new PosOrder({
            name,
            session: sessionDoc._id,
            config: config._id,
            currency: nestedEntityToRef(sessionDoc.currency),
            state: "draft",
            cashier: ctx.userId,
            company: ctx.company._id,
            isRefund: false,
            payments: [],
            amountPaid: 0,
            amountReturn: 0,
            amountTax: 0,
        });
    }

    draft.customer = body.customerId ? new ObjectId(body.customerId) : undefined;
    draft.customerName = body.customerName || undefined;
    draft.note = body.note;
    draft.orderDiscountPercent = orderDiscPct;
    // Mongoose casts the built lines into line subdocuments with their own `_id`.
    draft.lines = lines;
    draft.discountTotal = discountTotal;
    draft.amountTotal = amountTotal;
    draft.amountPaid = 0;
    draft.amountReturn = 0;
    draft.payments = [];
    draft.cashier = ctx.userId;
    await draft.save({session: ctx.session});

    const populated = await posOrderService.findById(draft._id, {session: ctx.session}, "session config cashier customer");
    return posOrderToDTO(populated!);
}

export async function listHeldPosOrders(sessionId: string, ctx: Ctx) {
    await resolveOpenedSession(sessionId, ctx);
    const rows = await posOrderService.find({
        company: ctx.company._id,
        session: sessionId,
        state: "draft",
        isRefund: false,
    }, {withDeleted: false}, "cashier", undefined, {updatedAt: -1}, 100);
    return rows.map(posOrderToDTO);
}

export async function deleteHeldPosOrder(_id: string, ctx: Ctx) {
    const draft = await posOrderService.findOne({
        _id,
        company: ctx.company._id,
        state: "draft",
    }, {session: ctx.session, withDeleted: false});
    if (!draft) throw apiValidationException("pos_held_not_found", "_id", null, ctx.languageCode);

    draft.state = "cancel";
    await draft.save({session: ctx.session});
    return {ok: true, _id: draft._id.toString()};
}

export async function listSessionPosOrders(
    sessionId: string,
    ctx: Ctx,
    opts?: {state?: "paid" | "draft" | "refunded"; limit?: number},
) {
    const sessionDoc = await posSessionService.findOne({
        _id: sessionId,
        company: ctx.company._id,
    }, {session: ctx.session, withDeleted: false});
    if (!sessionDoc) throw apiValidationException("pos_session_not_found", "sessionId", null, ctx.languageCode);

    const filter: Record<string, unknown> = {
        company: ctx.company._id,
        session: sessionId,
    };
    if (opts?.state) filter.state = opts.state;
    else filter.state = {$in: ["paid", "refunded"]};

    const rows = await posOrderService.find(filter, {withDeleted: false}, "cashier customer", undefined, {createdAt: -1}, Math.min(100, Math.max(1, opts?.limit ?? 50)));
    return rows.map(posOrderToDTO);
}

export async function reprintPosOrder(_id: string, ctx: Ctx) {
    const order = await posOrderService.findOne({
        _id,
        company: ctx.company._id,
        state: {$in: ["paid", "refunded"]},
    }, {session: ctx.session, withDeleted: false}, "session config cashier customer payments.paymentMethod");
    if (!order) throw apiValidationException("pos_order_not_found", "_id", null, ctx.languageCode);

    const receipt = await buildReceiptFromPosOrder(order, ctx);
    return {order: posOrderToDTO(order), receipt};
}

export type PosSessionReconciliation = {
    sessionId: string;
    openingBalance: number;
    expectedCash: number;
    cashRegisterBalance: number;
    totalSales: number;
    totalCash: number;
    totalCard: number;
    orderCount: number;
    heldDraftCount: number;
    cashMoves: {
        type: string;
        amount: number;
        reason?: string;
        at?: string;
    }[];
    salesByTender: Record<string, number>;
    countedCash?: number;
    difference?: number;
};

export async function getPosSessionReconciliation(
    sessionId: string,
    ctx: Ctx,
    countedCash?: number,
): Promise<PosSessionReconciliation> {
    const sessionDoc = await posSessionService.findOne({
        _id: sessionId,
        company: ctx.company._id,
    }, {session: ctx.session, withDeleted: false});
    if (!sessionDoc) throw apiValidationException("pos_session_not_found", "sessionId", null, ctx.languageCode);
    const decimals = await currencyDecimalPlaces(nestedEntityToRef(sessionDoc.currency), ctx.session);

    const heldDraftCount = await posOrderService.count({
        company: ctx.company._id,
        session: sessionDoc._id,
        state: "draft",
    }, {session: ctx.session, withDeleted: false});

    const paidOrders = await posOrderService.find({
        company: ctx.company._id,
        session: sessionDoc._id,
        state: "paid",
        isRefund: false,
    }, {session: ctx.session, withDeleted: false}, undefined, "payments");

    const salesByTender: Record<string, number> = {};
    for (const order of paidOrders) {
        for (const payment of order.payments ?? []) {
            const key = payment.paymentMethodType || "other";
            salesByTender[key] = sumMoney([(salesByTender[key] ?? 0), Number(payment.amount || 0)], decimals);
        }
    }

    const cashMoves = (sessionDoc.cashMoves ?? []).map(move => ({
        type: move.type,
        amount: move.amount,
        reason: move.reason,
        at: move.at instanceof Date ? move.at.toISOString() : move.at,
    }));

    const result: PosSessionReconciliation = {
        sessionId: sessionDoc._id.toString(),
        openingBalance: sessionDoc.openingBalance ?? 0,
        expectedCash: sessionDoc.expectedCash ?? 0,
        cashRegisterBalance: sessionDoc.cashRegisterBalance ?? 0,
        totalSales: sessionDoc.totalSales ?? 0,
        totalCash: sessionDoc.totalCash ?? 0,
        totalCard: sessionDoc.totalCard ?? 0,
        orderCount: sessionDoc.orderCount ?? 0,
        heldDraftCount,
        cashMoves,
        salesByTender,
    };

    if (countedCash != null && !Number.isNaN(countedCash)) {
        result.countedCash = roundToCurrency(countedCash, decimals);
        result.difference = subtractMoney(countedCash, result.expectedCash, decimals);
    }

    return result;
}

export async function rebuildPaidPosResult(order: IPosOrder, ctx: Ctx) {
    const sessionDoc = await posSessionService.findOne({_id: order.session}, {session: ctx.session});
    const receipt = await buildReceiptFromPosOrder(order, ctx);
    const populated = await posOrderService.findById(order._id, {session: ctx.session}, "session config cashier customer payments.paymentMethod");
    return {
        order: posOrderToDTO(populated!),
        receipt,
        session: sessionDoc ? posSessionToDTO(sessionDoc) : undefined,
        idempotentReplay: true as const,
    };
}

export async function searchPosCustomers(query: string | undefined, ctx: Ctx) {
    const q = (query || "").trim();
    const filter: Record<string, unknown> = {
        companies: ctx.company._id,
        "roles.company": ctx.company._id,
        "roles.active": "active",
    };
    if (q) {
        const rx = {$regex: q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), $options: "i"};
        filter.$or = [{fullName: rx}, {name: rx}, {surname: rx}, {username: rx}, {phoneNumber: rx}];
    }
    const rows = await userService.find(filter, {withDeleted: false}, undefined, "_id fullName name surname username phoneNumber", {fullName: 1}, 30);
    return rows.map((u: any) => ({
        _id: u._id.toString(),
        label: u.fullName || [u.name, u.surname].filter(Boolean).join(" ") || u.username,
        name: u.name,
        surname: u.surname,
        username: u.username,
        phoneNumber: u.phoneNumber,
    }));
}

export async function verifyPosManagerPin(
    configId: string,
    pin: string,
    ctx: Ctx,
    managerId?: string,
) {
    if (!ObjectId.isValid(configId)) {
        throw apiValidationException("pos_config_not_found", "configId", null, ctx.languageCode);
    }
    const config = await posConfigService.findOne({
        _id: configId,
        company: ctx.company._id,
    }, {withDeleted: false});
    if (!config) throw apiValidationException("pos_config_not_found", "configId", null, ctx.languageCode);
    if (!hasAnyManagerPin(config)) {
        throw apiValidationException("pos_manager_pin_not_set", "pin", null, ctx.languageCode);
    }
    if (!managerId || !ObjectId.isValid(String(managerId))) {
        throw apiValidationException("pos_manager_not_assigned", "managerId", null, ctx.languageCode);
    }
    const approvedBy = await managerPinMatchesForUser(config, String(managerId), pin || "");
    if (!approvedBy) {
        throw apiValidationException("pos_manager_pin_invalid", "pin", null, ctx.languageCode);
    }
    return {ok: true, approvedBy};
}
