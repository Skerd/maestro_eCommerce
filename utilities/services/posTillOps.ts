import {ObjectId} from "mongodb";
import type {ClientSession} from "mongoose";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import type {HoldPosOrderFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/holdPosOrder.form.validator";
import User from "@coreModule/database/schemas/user/user";
import Product from "@eCommerceModule/database/schemas/product/product";
import PosConfig from "@eCommerceModule/database/schemas/posConfig/posConfig";
import PosSession from "@eCommerceModule/database/schemas/posSession/posSession";
import PosOrder, {IPosOrder} from "@eCommerceModule/database/schemas/posOrder/posOrder";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {posOrderToDTO} from "@eCommerceModule/utilities/mappers/posOrder/posOrderMapper.dto";
import {posSessionToDTO} from "@eCommerceModule/utilities/mappers/posSession/posSessionMapper.dto";
import {
    hasAnyManagerPin,
    managerPinMatchesForUser,
} from "@eCommerceModule/utilities/services/posManagerPin";
import {assertPosTillMutable} from "@eCommerceModule/utilities/services/posKillSwitch";
import {roundMoney} from "@coreModule/utilities/helpers/money";
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

async function resolveOpenedSession(sessionId: string, ctx: Ctx) {
    const sessionDoc = await PosSession.findOne({
        _id: sessionId,
        company: ctx.company._id,
    }).noDeleted().session(ctx.session ?? null);
    if (!sessionDoc) throw apiValidationException("pos_session_not_found", "sessionId", null, ctx.languageCode);
    if (sessionDoc.state !== "opened") {
        throw apiValidationException("pos_session_not_opened", "sessionId", null, ctx.languageCode);
    }
    return sessionDoc;
}

type BuiltLine = {
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

async function buildDraftLines(
    bodyLines: HoldPosOrderFormType["lines"],
    ctx: Ctx,
): Promise<{lines: BuiltLine[]; subtotal: number; lineDiscountTotal: number}> {
    const lines: BuiltLine[] = [];
    let subtotal = 0;
    let lineDiscountTotal = 0;

    for (const line of bodyLines) {
        const product = await Product.findOne({
            _id: line.productId,
            company: ctx.company._id,
            status: "active",
        }).noDeleted().session(ctx.session ?? null);
        if (!product) throw apiValidationException("pos_product_not_found", "productId", null, ctx.languageCode);
        assertPosSellable(product, ctx.languageCode);

        const qty = Number(line.quantity);
        const unitPrice = await resolvePosLineUnitPrice(product, line.variantId, ctx);
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
            productName: product.title,
            productSku: product.sku,
            barcode: product.barcode ?? product.ean,
        });
        subtotal = roundMoney(subtotal + gross);
        lineDiscountTotal = roundMoney(lineDiscountTotal + discountAmount);
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
        // qrcode has no bundled types in this package.
        // @ts-expect-error
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

function vatRowsFromOrder(order: IPosOrder): PosReceiptVatRow[] {
    const byRate = new Map<number, number>();
    for (const line of order.lines ?? []) {
        const tax = roundMoney(Number(line.taxAmount || 0));
        const gross = roundMoney(Number(line.priceTotal || 0));
        const net = roundMoney(gross - tax);
        const rate = net !== 0 && tax !== 0 ? roundMoney((Math.abs(tax) / Math.abs(net)) * 100) : 0;
        byRate.set(rate, roundMoney((byRate.get(rate) ?? 0) + tax));
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
    const config = await PosConfig.findById(order.config).session(ctx.session ?? null);
    let productOrderNumber: string | undefined;
    if (order.productOrder) {
        const po = await ProductOrder.findById(order.productOrder)
            .select("orderNumber")
            .session(ctx.session ?? null)
            .lean();
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
        amountWithoutVat: roundMoney(amountTotal - amountTax),
        vatRows: vatRowsFromOrder(order),
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
    const config = await PosConfig.findOne({
        _id: sessionDoc.config,
        company: ctx.company._id,
    }).noDeleted().session(ctx.session ?? null);
    if (!config) throw apiValidationException("pos_config_not_found", "sessionId", null, ctx.languageCode);
    await assertPosTillMutable(config, ctx);

    const {lines, subtotal, lineDiscountTotal} = await buildDraftLines(body.lines, ctx);
    const orderDiscPct = Math.min(100, Math.max(0, Number(body.discountPercent ?? 0)));
    const afterLineDisc = roundMoney(subtotal - lineDiscountTotal);
    const orderDiscount = roundMoney((afterLineDisc * orderDiscPct) / 100);
    const discountTotal = roundMoney(lineDiscountTotal + orderDiscount);
    const amountTotal = roundMoney(Math.max(0, subtotal - discountTotal));

    let draft: IPosOrder | null = null;
    if (body._id) {
        draft = await PosOrder.findOne({
            _id: body._id,
            company: ctx.company._id,
            session: sessionDoc._id,
            state: "draft",
        }).noDeleted().session(ctx.session ?? null);
        if (!draft) throw apiValidationException("pos_held_not_found", "_id", null, ctx.languageCode);
    }

    if (!draft) {
        const name = await generatePosOrderName(ctx.company._id, ctx.session);
        draft = new PosOrder({
            name,
            session: sessionDoc._id,
            config: config._id,
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

    draft.customer = body.customerId ? (new ObjectId(body.customerId) as any) : undefined;
    draft.customerName = body.customerName || undefined;
    draft.note = body.note;
    draft.orderDiscountPercent = orderDiscPct;
    draft.lines = lines as any;
    draft.discountTotal = discountTotal;
    draft.amountTotal = amountTotal;
    draft.amountPaid = 0;
    draft.amountReturn = 0;
    draft.payments = [];
    draft.cashier = ctx.userId as any;
    await draft.save({session: ctx.session});

    const populated = await PosOrder.findById(draft._id)
        .populate("session config cashier customer")
        .session(ctx.session ?? null);
    return posOrderToDTO(populated!);
}

export async function listHeldPosOrders(sessionId: string, ctx: Ctx) {
    await resolveOpenedSession(sessionId, ctx);
    const rows = await PosOrder.find({
        company: ctx.company._id,
        session: sessionId,
        state: "draft",
        isRefund: false,
    }).noDeleted()
        .sort({updatedAt: -1})
        .limit(100)
        .populate("cashier");
    return rows.map(posOrderToDTO);
}

export async function deleteHeldPosOrder(_id: string, ctx: Ctx) {
    const draft = await PosOrder.findOne({
        _id,
        company: ctx.company._id,
        state: "draft",
    }).noDeleted().session(ctx.session ?? null);
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
    const sessionDoc = await PosSession.findOne({
        _id: sessionId,
        company: ctx.company._id,
    }).noDeleted().session(ctx.session ?? null);
    if (!sessionDoc) throw apiValidationException("pos_session_not_found", "sessionId", null, ctx.languageCode);

    const filter: Record<string, unknown> = {
        company: ctx.company._id,
        session: sessionId,
    };
    if (opts?.state) filter.state = opts.state;
    else filter.state = {$in: ["paid", "refunded"]};

    const rows = await PosOrder.find(filter).noDeleted()
        .sort({createdAt: -1})
        .limit(Math.min(100, Math.max(1, opts?.limit ?? 50)))
        .populate("cashier customer");
    return rows.map(posOrderToDTO);
}

export async function reprintPosOrder(_id: string, ctx: Ctx) {
    const order = await PosOrder.findOne({
        _id,
        company: ctx.company._id,
        state: {$in: ["paid", "refunded"]},
    }).noDeleted()
        .populate("session config cashier customer payments.paymentMethod")
        .session(ctx.session ?? null);
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
    const sessionDoc = await PosSession.findOne({
        _id: sessionId,
        company: ctx.company._id,
    }).noDeleted().session(ctx.session ?? null);
    if (!sessionDoc) throw apiValidationException("pos_session_not_found", "sessionId", null, ctx.languageCode);

    const heldDraftCount = await PosOrder.countDocuments({
        company: ctx.company._id,
        session: sessionDoc._id,
        state: "draft",
    }).noDeleted().session(ctx.session ?? null);

    const paidOrders = await PosOrder.find({
        company: ctx.company._id,
        session: sessionDoc._id,
        state: "paid",
        isRefund: false,
    }).noDeleted()
        .select("payments")
        .session(ctx.session ?? null)
        .lean();

    const salesByTender: Record<string, number> = {};
    for (const order of paidOrders) {
        for (const payment of order.payments ?? []) {
            const key = payment.paymentMethodType || "other";
            salesByTender[key] = roundMoney((salesByTender[key] ?? 0) + Number(payment.amount || 0));
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
        result.countedCash = roundMoney(countedCash);
        result.difference = roundMoney(countedCash - result.expectedCash);
    }

    return result;
}

export async function rebuildPaidPosResult(order: IPosOrder, ctx: Ctx) {
    const sessionDoc = await PosSession.findById(order.session).session(ctx.session ?? null);
    const receipt = await buildReceiptFromPosOrder(order, ctx);
    const populated = await PosOrder.findById(order._id)
        .populate("session config cashier customer payments.paymentMethod")
        .session(ctx.session ?? null);
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
    const rows = await User.find(filter).noDeleted()
        .select("_id fullName name surname username phoneNumber")
        .sort({fullName: 1})
        .limit(30)
        .lean();
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
    const config = await PosConfig.findOne({
        _id: configId,
        company: ctx.company._id,
    }).noDeleted();
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
