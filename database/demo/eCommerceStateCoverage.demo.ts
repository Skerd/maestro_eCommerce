/**
 * Demo records in every state the eCommerce panel shows, so each list, sheet and badge can be checked:
 *
 *   - return requests pending, approved, rejected and received (completed comes from `createReturnRequests`);
 *   - till sessions closed (with cash moves and a counted shortfall), opened (with a held cart) and in closing
 *     control; till sales paid, refunded in full and in part (with their refund orders), a cancelled held cart, a
 *     held cart still open, and a sale whose fiscal registration failed;
 *   - stock movements of every reason, stock counts draft/applied/cancelled and stock transfers draft/done/cancelled.
 *
 * Each step goes through the service or action staff use, so stock, movements, the ledger and the till's cash
 * follow, and the till only sells what is on hand. Every record is keyed by a demo-seed marker (a note or the sale's
 * `clientRequestId`), and a record already at its state is left alone, so a second run changes nothing; a run that
 * stopped half way picks up where it left off. Each step runs in its own transaction, so it lands whole or not at all.
 */

import type {HydratedDocument, Types} from "mongoose";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import type {ICompany} from "@coreModule/database/schemas/company/company";
import User, {type IUser} from "@coreModule/database/schemas/user/user";
import {demoName} from "@coreModule/utilities/helpers";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {runInTransaction} from "@coreModule/utilities/middlewares/runInTransaction";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import {companyTimeZone} from "@coreModule/utilities/time/companyTimeZone";
import {currencyDecimalPlaces} from "@financeModule/utilities/services/currencyDecimals";
import {minorToNumber, multiplyMoney, percentOfMoney, subtractMoney, sumMoney, toMinor} from "armonia/src/modules/core/helpers/money";
import type {IProduct} from "@eCommerceModule/database/schemas/product/product";
import type {CreateProductsResult} from "@eCommerceModule/database/schemas/product/product.defaults";
import type {CreateProductOrdersResult} from "@eCommerceModule/database/schemas/productOrder/productOrder.defaults";
import {SECONDARY_WAREHOUSE_SEED_KEY, type CreateWarehousesResult} from "@eCommerceModule/database/schemas/warehouse/warehouse.defaults";
import type {CreatePosPaymentMethodsResult} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod.defaults";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import {InventoryActions} from "@eCommerceModule/database/schemas/inventory/inventory.actions";
import InventoryMovement from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import StockCount, {type IStockCount} from "@eCommerceModule/database/schemas/stockCount/stockCount";
import {StockCountActions} from "@eCommerceModule/database/schemas/stockCount/stockCount.actions";
import {stockCountService} from "@eCommerceModule/database/schemas/stockCount/stockCount.service";
import StockTransfer, {type IStockTransfer} from "@eCommerceModule/database/schemas/stockTransfer/stockTransfer";
import {StockTransferActions} from "@eCommerceModule/database/schemas/stockTransfer/stockTransfer.actions";
import ReturnRequest, {type ReturnRequestStatus, type ReturnRequestType} from "@eCommerceModule/database/schemas/returnRequest/returnRequest";
import {ReturnRequestActions} from "@eCommerceModule/database/schemas/returnRequest/returnRequest.actions";
import {returnedItemsValue} from "@eCommerceModule/database/schemas/returnRequest/returnRequest.service";
import PosConfig, {type IPosConfig} from "@eCommerceModule/database/schemas/posConfig/posConfig";
import PosSession, {type IPosSession} from "@eCommerceModule/database/schemas/posSession/posSession";
import PosOrder, {type IPosOrder} from "@eCommerceModule/database/schemas/posOrder/posOrder";
import type {IPosPaymentMethod} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod";
import {assertStockDocumentLines} from "@eCommerceModule/utilities/services/stockDocumentLines";
import {
    cashMovePosSession,
    closePosSession,
    openPosSession,
    payPosOrder,
    refundPosOrder,
} from "@eCommerceModule/workflows/posService";
import {deleteHeldPosOrder, holdPosOrder} from "@eCommerceModule/workflows/posTillOps";
import {demoSeedMarkerRegex, demoSeedTag, withDemoSeedMarker} from "./demoSeed";

const LANGUAGE = "en-US";

/** The tracked catalog items the coverage moves, sells and counts; each has plenty on hand in the demo catalog. */
export const STATE_COVERAGE_PRODUCT_KEYS = {
    mouse: "prod-comp-05-glide-mouse",
    keyboard: "prod-comp-04-keyline-mech",
    caseKit: "prod-phone-10-prism-case-kit",
} as const;

export const BACK_COUNTER_TILL_NAME = demoName("Back Counter Till");

export type StateCoverageInput = {
    currencyId: Types.ObjectId;
    /** Staff who works the till and the stock room (the demo login). */
    cashierId: Types.ObjectId;
    products: CreateProductsResult;
    warehouses: CreateWarehousesResult;
    posConfig: HydratedDocument<IPosConfig> | undefined;
    posMethods: CreatePosPaymentMethodsResult;
    orders: CreateProductOrdersResult;
};

type Product = HydratedDocument<IProduct>;
type Products = Record<keyof typeof STATE_COVERAGE_PRODUCT_KEYS, Product>;
type StaffParams = Omit<TransactionRequiredParams, "session">;
type TillCtx = {logger: serverLogger; languageCode: string; company: {_id: Types.ObjectId; name: string}; userId: Types.ObjectId};
type TillLine = {product: Product; quantity: number};

/**
 * The request params an action receives, for the demo staff member with exactly the field grants the steps need
 * (the same tags their role would carry).
 */
function staffParams(company: ICompany, user: IUser, logger: serverLogger): StaffParams {
    const userId = user._id.toString();
    const companyId = company._id.toString();
    const permissions = [
        `${ReturnRequest.collection.name}[write:status]`,
        `${ReturnRequest.collection.name}[write:refundAmount]`,
        `${ReturnRequest.collection.name}[write:adminNote]`,
        `${StockCount.collection.name}[write:status]`,
        `${StockTransfer.collection.name}[write:status]`,
        `${Inventory.collection.name}[write:quantityOnHand]`,
    ];
    return {
        apiCode: "demo-seed",
        languageCode: LANGUAGE,
        actionInitializer: "demo-seed",
        origin: "demo-seed",
        logger,
        deviceId: "demo-seed",
        userAgent: "demo-seed",
        requestIp: "127.0.0.1",
        requestSource: "panel",
        user: {id: userId, company: {_id: companyId, name: company.name}, username: user.username},
        parentBypass: null,
        singleCompanyId: companyId,
        userInfo: user,
        actionUserInfo: user,
        actionUserCtx: {userId, orgId: companyId, isAdmin: false, isSelf: true, permissions},
        company,
        companyTimeZone: companyTimeZone(company),
    };
}

/** A failing part is logged and the others still run, as the per-schema writers do. */
async function part(logger: serverLogger, name: string, work: () => Promise<void>): Promise<void> {
    try {
        await work();
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        logger.err(`Error seeding ${name}: ${message}`);
    }
}

export async function seedECommerceStateCoverage(
    parentLogger: serverLogger | undefined,
    company: ICompany,
    input: StateCoverageInput,
): Promise<void> {
    const logger = getLogger("eCommerce_state_coverage", parentLogger);
    logger.start("Seeding eCommerce records in every state...");

    const user = await User.findById(input.cashierId);
    if (!user) {
        logger.warn("Skipping state coverage: the demo staff user was not found.");
        logger.finish("Finished eCommerce state coverage!", 0);
        return;
    }
    const pick = (seedKey: string): Product | undefined => input.products.bySeedKey[seedKey];
    const mouse = pick(STATE_COVERAGE_PRODUCT_KEYS.mouse);
    const keyboard = pick(STATE_COVERAGE_PRODUCT_KEYS.keyboard);
    const caseKit = pick(STATE_COVERAGE_PRODUCT_KEYS.caseKit);
    const primary = input.warehouses.primaryWarehouseId;
    const secondary = input.warehouses.bySeedKey[SECONDARY_WAREHOUSE_SEED_KEY]?._id;
    if (!mouse || !keyboard || !caseKit || !primary || !secondary) {
        logger.warn(
            `Skipping state coverage: needs products ${Object.values(STATE_COVERAGE_PRODUCT_KEYS).join(", ")} and both demo warehouses.`,
        );
        logger.finish("Finished eCommerce state coverage!", 0);
        return;
    }
    const products: Products = {mouse, keyboard, caseKit};
    const staff = staffParams(company, user, logger);

    await part(logger, "stock movements", () => seedStockMoves(company, staff, products, primary));
    await part(logger, "stock counts", () => seedStockCounts(company, staff, products, primary));
    await part(logger, "stock transfers", () => seedStockTransfers(company, staff, products, primary, secondary));
    await part(logger, "return requests", () => seedReturnRequests(company, staff, input.orders));
    await part(logger, "till", () => seedTill(company, staff, input, products));

    logger.finish("Finished eCommerce state coverage!");
}

// ---------------------------------------------------------------------------------------------------------------------
// Stock: a delivery, damage and a write-off through the stock actions

async function inventoryRowId(company: ICompany, product: Product, warehouse: Types.ObjectId): Promise<string> {
    const row = await Inventory.findOne({company: company._id, product: product._id, warehouse, variant: null}).select("_id");
    if (!row) throw new Error(`no stock row for ${product.sku ?? product._id.toString()}`);
    return row._id.toString();
}

async function seedStockMoves(company: ICompany, staff: StaffParams, products: Products, warehouse: Types.ObjectId): Promise<void> {
    const moves = [
        {key: "move-restock-mouse", product: products.mouse, quantity: 24, reason: "restock" as const, note: "Supplier delivery, checked against the delivery note."},
        {key: "move-damage-keyboard", product: products.keyboard, quantity: 1, reason: "damage" as const, note: "Keycaps cracked when a carton fell."},
        {key: "move-writeoff-case-kit", product: products.caseKit, quantity: 2, reason: "write_off" as const, note: "Display units, too worn to sell."},
    ];
    const actions = new InventoryActions();
    for (const move of moves) {
        if (await InventoryMovement.exists({company: company._id, note: demoSeedMarkerRegex(move.key)})) continue;
        const _id = await inventoryRowId(company, move.product, warehouse);
        const note = withDemoSeedMarker(move.note, move.key);
        await runInTransaction(staff.logger, (session) =>
            move.reason === "restock"
                ? actions.restock({...staff, session, _id, quantity: move.quantity, note, manufacturer: "Glide Peripherals", receiptNumber: "GR-2026-0142", unitCost: 31.6})
                : actions.deduct({...staff, session, _id, quantity: move.quantity, reason: move.reason, note}),
        );
    }
}

async function seedStockCounts(company: ICompany, staff: StaffParams, products: Products, warehouse: Types.ObjectId): Promise<void> {
    const counts: {key: string; note: string; target: IStockCount["status"]; lines: {product: Product; counted?: (expected: number) => number}[]}[] = [
        {
            key: "count-applied",
            note: "Weekly accessories count: one mouse missing, two case kits found behind the counter.",
            target: "applied",
            lines: [
                {product: products.mouse, counted: (expected) => Math.max(0, expected - 1)},
                {product: products.caseKit, counted: (expected) => expected + 2},
            ],
        },
        {
            key: "count-draft",
            note: "Monthly count, keyboards done, mice still to count.",
            target: "draft",
            lines: [{product: products.keyboard, counted: (expected) => expected}, {product: products.mouse}],
        },
        {
            key: "count-cancelled",
            note: "Started on the wrong shelf; recounted in the weekly count.",
            target: "cancelled",
            lines: [{product: products.caseKit, counted: (expected) => Math.max(0, expected - 3)}],
        },
    ];
    const actions = new StockCountActions();
    for (const count of counts) {
        if (await StockCount.exists({company: company._id, note: demoSeedMarkerRegex(count.key)})) continue;
        await runInTransaction(staff.logger, async (session) => {
            const params = {...staff, session};
            // The lines as the create route builds them: what is on hand now, then what was counted
            const snapshot = await stockCountService.countLines(warehouse, count.lines.map((line) => ({product: line.product._id})), [], params);
            const lines = snapshot.map((line, index) => ({...line, countedQuantity: count.lines[index].counted?.(line.expectedQuantity)}));
            const doc = await new StockCount({
                warehouse,
                lines,
                note: withDemoSeedMarker(count.note, count.key),
                company: company._id,
                createdBy: staff.actionUserInfo._id,
            }).save({session});
            if (count.target === "applied") await actions.apply({...params, _id: doc._id.toString()});
            if (count.target === "cancelled") await actions.cancel({...params, _id: doc._id.toString()});
        });
    }
}

async function seedStockTransfers(
    company: ICompany,
    staff: StaffParams,
    products: Products,
    from: Types.ObjectId,
    to: Types.ObjectId,
): Promise<void> {
    const transfers: {key: string; note: string; target: IStockTransfer["status"]; lines: TillLine[]}[] = [
        {key: "transfer-done", note: "Overflow stock for the harbour pick-up point.", target: "done", lines: [{product: products.mouse, quantity: 4}, {product: products.caseKit, quantity: 6}]},
        {key: "transfer-draft", note: "Keyboards for the weekend fair, waiting for the van.", target: "draft", lines: [{product: products.keyboard, quantity: 2}]},
        {key: "transfer-cancelled", note: "Fair cancelled, the mice stay here.", target: "cancelled", lines: [{product: products.mouse, quantity: 3}]},
    ];
    const actions = new StockTransferActions();
    for (const transfer of transfers) {
        if (await StockTransfer.exists({company: company._id, note: demoSeedMarkerRegex(transfer.key)})) continue;
        await runInTransaction(staff.logger, async (session) => {
            const params = {...staff, session};
            const lines = transfer.lines.map((line) => ({product: line.product._id, quantity: line.quantity}));
            // As the create route checks it: distinct tracked items in this company's warehouses
            await assertStockDocumentLines(lines, [from, to], params);
            const doc = await new StockTransfer({
                fromWarehouse: from,
                toWarehouse: to,
                lines,
                note: withDemoSeedMarker(transfer.note, transfer.key),
                company: company._id,
                createdBy: staff.actionUserInfo._id,
            }).save({session});
            if (transfer.target === "done") await actions.complete({...params, _id: doc._id.toString()});
            if (transfer.target === "cancelled") await actions.cancel({...params, _id: doc._id.toString()});
        });
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Return requests: the customer asks, staff approve, reject or take the goods back through the actions

const RETURN_SCENARIOS: {key: string; type: ReturnRequestType; target: Exclude<ReturnRequestStatus, "completed">; reason: string; note: string; staffNote?: string}[] = [
    {key: "return-pending", type: "return", target: "pending", reason: "Arrived with a scratched casing", note: "The box was dented when it arrived."},
    {key: "return-approved", type: "exchange", target: "approved", reason: "Wrong colour sent", note: "Could I have the black one instead?", staffNote: "Black one reserved, swap at the counter."},
    {key: "return-rejected", type: "refund", target: "rejected", reason: "Changed my mind", note: "I no longer need it.", staffNote: "Outside the 30-day return window."},
    {key: "return-received", type: "return", target: "received", reason: "Does not fit my desk", note: "Unused, in the original packaging.", staffNote: "Refund once the item is checked."},
];

async function seedReturnRequests(company: ICompany, staff: StaffParams, orders: CreateProductOrdersResult): Promise<void> {
    // Delivered, paid orders with a physical item, one per scenario while they last
    const candidates = Object.values(orders.byOrderNumber)
        .filter((order) => order.status === "delivered" && order.paymentStatus === "paid")
        .flatMap((order) => {
            const item = order.items.find((line) => !["digital", "gift_card"].includes(line.snapshot?.productType ?? "digital"));
            return item ? [{order, item}] : [];
        })
        .sort((a, b) => a.order.orderNumber.localeCompare(b.order.orderNumber));
    if (!candidates.length) {
        staff.logger.warn("Skipping return requests: no delivered, paid demo order with a physical item.");
        return;
    }

    const actions = new ReturnRequestActions();
    for (const [index, scenario] of RETURN_SCENARIOS.entries()) {
        const {order, item} = candidates[index % candidates.length];
        let request = await ReturnRequest.findOne({company: company._id, customerNote: demoSeedMarkerRegex(scenario.key)});
        if (!request) {
            request = await ReturnRequest.create({
                order: order._id,
                type: scenario.type,
                status: "pending",
                items: [{orderItemId: item._id, quantity: 1, reason: scenario.reason}],
                customerNote: withDemoSeedMarker(scenario.note, scenario.key),
                company: company._id,
                createdBy: nestedEntityToRef(order.customer) ?? company.createdBy,
            });
        }
        const _id = request._id.toString();
        const statusNow = async () => (await ReturnRequest.findById(_id).select("status"))?.status;

        if (scenario.target === "rejected" && (await statusNow()) === "pending") {
            await runInTransaction(staff.logger, (session) => actions.reject({...staff, session, _id, reason: scenario.staffNote}));
        }
        if ((scenario.target === "approved" || scenario.target === "received") && (await statusNow()) === "pending") {
            // An exchange pays nothing back; a return pays back the returned item's share of the order
            const refundAmount = scenario.type === "exchange" ? undefined : returnedItemsValue(order, request.items);
            await runInTransaction(staff.logger, (session) => actions.approve({...staff, session, _id, refundAmount, notes: scenario.staffNote}));
        }
        if (scenario.target === "received" && (await statusNow()) === "approved") {
            await runInTransaction(staff.logger, (session) => actions.receive({...staff, session, _id}));
        }
    }
}

// ---------------------------------------------------------------------------------------------------------------------
// Till: three shifts through the till service

/** A second till, so a shift can sit in closing control while the front till has its own shift open. */
async function backCounterTill(company: ICompany, front: HydratedDocument<IPosConfig>): Promise<HydratedDocument<IPosConfig>> {
    const existing = await PosConfig.findOne({company: company._id, name: BACK_COUNTER_TILL_NAME});
    if (existing) return existing;
    return PosConfig.create({
        name: BACK_COUNTER_TILL_NAME,
        paymentMethods: front.paymentMethods,
        warehouses: front.warehouses,
        currency: front.currency,
        receiptHeader: "Demo — Back Counter Till",
        receiptFooter: "Thank you — demo till",
        ifaceBarcodeScanner: true,
        ifaceCashControl: true,
        allowDiscount: true,
        allowQuantityChange: true,
        allowOversell: false,
        pinForDiscount: false,
        pinForCashOut: false,
        pinForRefund: false,
        isActive: true,
        company: company._id,
        createdBy: company.createdBy,
    });
}

type Till = {
    ctx: TillCtx;
    decimals: number;
    cash: HydratedDocument<IPosPaymentMethod>;
    card: HydratedDocument<IPosPaymentMethod>;
};

async function shift(till: Till, configId: Types.ObjectId, key: string, note: string, openingBalance: number): Promise<HydratedDocument<IPosSession>> {
    const {ctx} = till;
    const found = await PosSession.findOne({company: ctx.company._id, notes: demoSeedMarkerRegex(key)});
    if (found) return found;
    const opened = await runInTransaction(ctx.logger, (session) =>
        openPosSession({configId: configId.toString(), openingBalance, notes: withDemoSeedMarker(note, key)}, {...ctx, session}),
    );
    const doc = await PosSession.findById(opened.session._id);
    if (!doc) throw new Error(`till shift ${key} was not saved`);
    return doc;
}

/** The till's total for these lines and order discount, worked out as the pay service does. */
function saleTotal(till: Till, lines: TillLine[], discountPercent: number): number {
    const subtotal = sumMoney(lines.map((line) => multiplyMoney(line.product.price, line.quantity, till.decimals)), till.decimals);
    return subtractMoney(subtotal, percentOfMoney(subtotal, discountPercent, till.decimals), till.decimals);
}

/** Cash handed over: the total rounded up to the next ten, so the sale gives change. */
function cashTendered(total: number, decimals: number): number {
    const step = toMinor(10, decimals);
    const minor = toMinor(total, decimals);
    return minorToNumber(((minor + step - 1n) / step) * step, decimals);
}

async function sell(
    till: Till,
    shiftDoc: IPosSession,
    key: string,
    lines: TillLine[],
    paidBy: "cash" | "card",
    extra: {discountPercent?: number; customerName?: string; note?: string} = {},
): Promise<HydratedDocument<IPosOrder>> {
    const {ctx} = till;
    const clientRequestId = demoSeedTag(key);
    const existing = await PosOrder.findOne({company: ctx.company._id, clientRequestId});
    if (existing) return existing;

    const total = saleTotal(till, lines, extra.discountPercent ?? 0);
    const method = paidBy === "cash" ? till.cash : till.card;
    const sale = await runInTransaction(ctx.logger, (session) =>
        payPosOrder(
            {
                sessionId: shiftDoc._id.toString(),
                clientRequestId,
                lines: lines.map((line) => ({productId: line.product._id.toString(), quantity: line.quantity})),
                payments: [{paymentMethodId: method._id.toString(), amount: paidBy === "cash" ? cashTendered(total, till.decimals) : total}],
                ...extra,
            },
            {...ctx, session},
        ),
    );
    const doc = await PosOrder.findById(sale.order._id);
    if (!doc) throw new Error(`till sale ${key} was not saved`);
    return doc;
}

async function refund(till: Till, original: IPosOrder, reason: string, partial: boolean): Promise<void> {
    const {ctx} = till;
    if (await PosOrder.exists({company: ctx.company._id, refundOf: original._id})) return;
    const firstLine = original.lines[0];
    await runInTransaction(ctx.logger, (session) =>
        refundPosOrder(
            {
                _id: original._id.toString(),
                reason,
                ...(partial && firstLine?._id ? {lines: [{lineId: firstLine._id.toString(), quantity: 1}]} : {}),
            },
            {...ctx, session},
        ),
    );
}

async function heldCart(till: Till, shiftDoc: IPosSession, key: string, lines: TillLine[], text: string, customerName: string): Promise<HydratedDocument<IPosOrder>> {
    const {ctx} = till;
    const found = await PosOrder.findOne({company: ctx.company._id, note: demoSeedMarkerRegex(key)});
    if (found) return found;
    const held = await runInTransaction(ctx.logger, (session) =>
        holdPosOrder(
            {
                sessionId: shiftDoc._id.toString(),
                customerName,
                note: withDemoSeedMarker(text, key),
                lines: lines.map((line) => ({productId: line.product._id.toString(), quantity: line.quantity})),
            },
            {...ctx, session},
        ),
    );
    const doc = await PosOrder.findById(held._id);
    if (!doc) throw new Error(`held cart ${key} was not saved`);
    return doc;
}

async function cashMove(till: Till, shiftDoc: IPosSession, type: "in" | "out", amount: number, reason: string): Promise<void> {
    if (shiftDoc.cashMoves.some((move) => move.reason === reason)) return;
    await runInTransaction(till.ctx.logger, (session) =>
        cashMovePosSession({_id: shiftDoc._id.toString(), type, amount, reason}, {...till.ctx, session}),
    );
}

async function seedTill(company: ICompany, staff: StaffParams, input: StateCoverageInput, products: Products): Promise<void> {
    const front = input.posConfig;
    const cash = input.posMethods.bySeedKey["pos-pm-cash"];
    const card = input.posMethods.bySeedKey["pos-pm-card"];
    if (!front || !cash || !card) {
        staff.logger.warn("Skipping till coverage: the front till or its payment methods were not seeded.");
        return;
    }
    const till: Till = {
        ctx: {logger: staff.logger, languageCode: LANGUAGE, company: {_id: company._id, name: company.name}, userId: input.cashierId},
        decimals: await currencyDecimalPlaces(input.currencyId),
        cash,
        card,
    };
    const {mouse, keyboard, caseKit} = products;

    // Yesterday's shift on the front till: sales, refunds, a cart dropped, cash moves, and closed a little short.
    // It must be closed before the front till's open shift below starts (one open shift per till).
    let closed = await shift(till, front._id, "pos-shift-closed", "Saturday shift, front till.", 150);
    if (closed.state === "opened") {
        await cashMove(till, closed, "in", 50, "Float top-up from the safe");
        await cashMove(till, closed, "out", 12.5, "Window cleaner and paper towels");
        await sell(till, closed, "pos-sale-closed-1", [{product: mouse, quantity: 2}, {product: keyboard, quantity: 1}], "cash");
        await sell(till, closed, "pos-sale-closed-2", [{product: caseKit, quantity: 3}], "card", {discountPercent: 10, customerName: "Arta Hoxha"});
        const refundedInFull = await sell(till, closed, "pos-sale-closed-3", [{product: mouse, quantity: 1}], "cash");
        await refund(till, refundedInFull, "Customer changed their mind at the door", false);
        const refundedInPart = await sell(till, closed, "pos-sale-closed-4", [{product: keyboard, quantity: 2}], "card");
        await refund(till, refundedInPart, "One keyboard had a stuck key", true);
        const unregistered = await sell(till, closed, "pos-sale-closed-5", [{product: caseKit, quantity: 1}], "cash");
        if (!unregistered.fiscalError) {
            // The tax authority is never called from a demo: the sale carries the failure CIS leaves on it
            // (registerPosInvoice), so the re-send flow and the fiscal error badge show.
            await PosOrder.updateOne(
                {_id: unregistered._id},
                {$set: {fiscalError: "CIS could not be reached: connect ETIMEDOUT (demo)", fiscalConfig: front.fiscalConfig}},
            );
        }
        const dropped = await heldCart(till, closed, "pos-held-dropped", [{product: keyboard, quantity: 1}], "Customer went to fetch their card and did not come back.", "Walk-in Customer");
        if (dropped.state === "draft") {
            await runInTransaction(till.ctx.logger, (session) => deleteHeldPosOrder(dropped._id.toString(), {...till.ctx, session}));
        }

        closed = (await PosSession.findById(closed._id)) ?? closed;
        const counted = subtractMoney(closed.expectedCash, 2, till.decimals);
        await runInTransaction(till.ctx.logger, (session) =>
            closePosSession(
                {_id: closed._id.toString(), closingBalance: counted, notes: closed.notes, differenceReason: "Two coins short at the count."},
                {...till.ctx, session},
            ),
        );
    }

    // Today's shift on the front till, still open, with a cart on hold.
    const open = await shift(till, front._id, "pos-shift-open", "Monday shift, front till.", 100);
    if (open.state === "opened") {
        await sell(till, open, "pos-sale-open-1", [{product: mouse, quantity: 1}], "cash");
        await sell(till, open, "pos-sale-open-2", [{product: keyboard, quantity: 1}], "card");
        await heldCart(till, open, "pos-held-open", [{product: caseKit, quantity: 2}], "Held while the customer checks the colour.", "Table 4");
    }

    // The back counter's shift, counted and waiting for its close.
    const back = await backCounterTill(company, front);
    const closing = await shift(till, back._id, "pos-shift-closing", "Monday shift, back counter.", 80);
    if (closing.state === "opened") {
        await sell(till, closing, "pos-sale-closing-1", [{product: caseKit, quantity: 2}], "card");
        await sell(till, closing, "pos-sale-closing-2", [{product: mouse, quantity: 1}], "cash");
        // Nothing in the till service sets this state: the shift stops selling while its cash is counted.
        await PosSession.updateOne({_id: closing._id, state: "opened"}, {$set: {state: "closing_control"}});
    }
}
