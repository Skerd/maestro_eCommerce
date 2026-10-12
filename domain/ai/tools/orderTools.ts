/**
 * `search_product_orders`, `search_fulfillments` and `search_returns` —
 * AI-assistant tools for what customers bought and what happened next.
 *
 * Answers "how many orders this week?", "what's our revenue this month?",
 * "which orders are unpaid?", "what's shipped but not delivered?", "how many
 * returns are waiting for approval?".
 *
 * REVENUE IS AGGREGATED, NOT SUMMED FROM THE PAGE. `results` is a capped sample;
 * `total` and `revenue` come from separate count/aggregate passes over the full
 * filter. Revenue is grouped by currency and never converted — there is no FX
 * rate to trust here, and a blended total would be a fabricated number.
 *
 * SECURITY: arguments are untrusted LLM output — re-validated with Zod, free
 * text regex-escaped, and every query hard-scoped to `ctx.companyId`.
 *
 * @module orderTools
 */

import {z} from "zod";
import {registerAssistantTool} from "@coreModule/domain/ai/tools/toolRegistry";
import type {AssistantTool, AssistantToolContext} from "@coreModule/domain/ai/tools/assistantTool.types";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {fulfillmentService} from "@eCommerceModule/database/schemas/fulfillment/fulfillment.service";
import {returnRequestService} from "@eCommerceModule/database/schemas/returnRequest/returnRequest.service";
import type {
    ProductOrderFulfillmentStatus,
    ProductOrderPaymentStatus,
    ProductOrderStatus
} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import type {FulfillmentStatus} from "@eCommerceModule/database/schemas/fulfillment/fulfillment";
import type {ReturnRequestStatus, ReturnRequestType} from "@eCommerceModule/database/schemas/returnRequest/returnRequest";
import {
    DEFAULT_RESULTS,
    companyObjectId,
    companyScope,
    dateRange,
    daysOverdue,
    emptyResult,
    enumValues,
    findOptions,
    limitArg,
    limitParameter,
    listResult,
    numberRange,
    regexClause,
    roundMoney,
    shortText,
    toAmount,
    toNumber,
    userDisplayName
} from "@coreModule/domain/ai/tools/assistantToolKit";
import {accessDenied, requirePermission} from "@coreModule/domain/ai/tools/assistantToolAccess";

const ORDER_STATUS_VALUES = enumValues<ProductOrderStatus>({
    pending: true,
    confirmed: true,
    processing: true,
    shipped: true,
    delivered: true,
    cancelled: true,
    refunded: true
});
const PAYMENT_STATUS_VALUES = enumValues<ProductOrderPaymentStatus>({
    unpaid: true,
    authorized: true,
    paid: true,
    partially_refunded: true,
    refunded: true,
    voided: true
});
const ORDER_FULFILLMENT_STATUS_VALUES = enumValues<ProductOrderFulfillmentStatus>({
    unfulfilled: true,
    partially_fulfilled: true,
    fulfilled: true,
    returned: true
});
const FULFILLMENT_STATUS_VALUES = enumValues<FulfillmentStatus>({
    pending: true,
    shipped: true,
    delivered: true,
    failed: true
});
const RETURN_STATUS_VALUES = enumValues<ReturnRequestStatus>({
    pending: true,
    approved: true,
    rejected: true,
    received: true,
    completed: true
});
const RETURN_TYPE_VALUES = enumValues<ReturnRequestType>({return: true, exchange: true, refund: true});

// ── search_product_orders ────────────────────────────────────────────────────

const SearchOrdersArgs = z
    .object({
        search: z.string().trim().min(1).optional(),
        status: z.enum(ORDER_STATUS_VALUES as [string, ...string[]]).optional(),
        paymentStatus: z.enum(PAYMENT_STATUS_VALUES as [string, ...string[]]).optional(),
        fulfillmentStatus: z.enum(ORDER_FULFILLMENT_STATUS_VALUES as [string, ...string[]]).optional(),
        placedFrom: z.coerce.date().optional(),
        placedTo: z.coerce.date().optional(),
        minTotal: z.coerce.number().nonnegative().optional(),
        maxTotal: z.coerce.number().nonnegative().optional(),
        unpaidOnly: z.coerce.boolean().optional(),
        awaitingShipmentOnly: z.coerce.boolean().optional(),
        limit: limitArg
    })
    .strip();

const orderParameters = {
    type: "object" as const,
    properties: {
        search: {type: "string", description: "Free text matched against the order number or customer email."},
        status: {
            type: "string",
            enum: ORDER_STATUS_VALUES,
            description: "Order status: pending, confirmed, processing, shipped, delivered, cancelled, or refunded."
        },
        paymentStatus: {
            type: "string",
            enum: PAYMENT_STATUS_VALUES,
            description: "Payment state: unpaid, authorized, paid, partially_refunded, refunded, or voided."
        },
        fulfillmentStatus: {
            type: "string",
            enum: ORDER_FULFILLMENT_STATUS_VALUES,
            description: "Fulfilment state: unfulfilled, partially_fulfilled, fulfilled, or returned."
        },
        placedFrom: {type: "string", description: "ISO date; only orders placed on or after this date."},
        placedTo: {type: "string", description: "ISO date; only orders placed on or before this date."},
        minTotal: {type: "number", description: "Minimum order grand total in the order's own currency."},
        maxTotal: {type: "number", description: "Maximum order grand total in the order's own currency."},
        unpaidOnly: {type: "boolean", description: "true = only orders not yet paid (unpaid or authorized)."},
        awaitingShipmentOnly: {
            type: "boolean",
            description: "true = paid, not cancelled, and not yet fully fulfilled. Prefer this for \"what do we need to ship\"."
        },
        limit: limitParameter
    },
    required: [] as string[]
};

/**
 * Sum order value across the FULL filtered set, grouped by currency.
 * `aggregate` bypasses the soft-delete query plugin, so `deletedAt: null` is
 * added by hand.
 */
async function rollUpRevenue(
    query: Record<string, unknown>,
    ctx: AssistantToolContext
): Promise<Array<{currency: string | null; amount: number; orders: number}>> {
    const rows: any[] = await productOrderService.aggregate(
        [
            {$match: {...query, company: companyObjectId(ctx), deletedAt: null}},
            {$group: {_id: "$currency", amount: {$sum: {$toDouble: "$grandTotal"}}, orders: {$sum: 1}}},
            {$lookup: {from: "currencies", localField: "_id", foreignField: "_id", as: "currency"}}
        ],
        {logger: ctx.logger}
    );

    return rows.map((row) => ({
        currency: row.currency?.[0]?.abbreviation ?? row.currency?.[0]?.symbol ?? null,
        amount: roundMoney(toAmount(row.amount)),
        orders: row.orders ?? 0
    }));
}

async function executeOrders(rawArgs: unknown, ctx: AssistantToolContext): Promise<unknown> {
    // The assistant shows only what the panel would: the same read permission
    const access = await requirePermission(ctx, "productorders[read:grandTotal]");
    if (!access.allowed) return accessDenied("shop orders");

    const args = SearchOrdersArgs.parse(rawArgs ?? {});

    // Hard company scope — the only scope the tool is allowed to read.
    const query: Record<string, unknown> = companyScope(ctx);

    if (args.search != null) {
        const rx = regexClause(args.search);
        query.$or = [{orderNumber: rx}, {email: rx}];
    }
    if (args.status) query.status = args.status;
    if (args.fulfillmentStatus) query.fulfillmentStatus = args.fulfillmentStatus;

    if (args.awaitingShipmentOnly === true) {
        // What the warehouse actually has to act on: money in, order still live,
        // goods not yet fully out the door.
        query.paymentStatus = "paid";
        query.status = {$nin: ["cancelled", "refunded"]};
        query.fulfillmentStatus = {$in: ["unfulfilled", "partially_fulfilled"]};
    } else if (args.unpaidOnly === true) {
        query.paymentStatus = {$in: ["unpaid", "authorized"]};
    } else if (args.paymentStatus) {
        query.paymentStatus = args.paymentStatus;
    }

    const placed = dateRange(args.placedFrom, args.placedTo);
    if (placed) query.createdAt = placed;

    const total = numberRange(args.minTotal, args.maxTotal);
    if (total) query.grandTotal = total;

    const limit = args.limit ?? DEFAULT_RESULTS;

    const orders = await productOrderService.find(
        query,
        findOptions(ctx),
        [
            {path: "customer", select: "name surname fullName username"},
            {path: "currency", select: "symbol abbreviation name"}
        ],
        "orderNumber customer email phone status paymentStatus fulfillmentStatus subtotal " +
            "discountTotal shippingTotal taxTotal grandTotal currency items createdAt",
        {createdAt: -1},
        limit
    );

    const results = orders.map((o: any) => ({
        id: o._id?.toString(),
        orderNumber: o.orderNumber ?? null,
        customer: userDisplayName(o.customer) ?? o.email ?? null,
        email: o.email ?? null,
        status: o.status ?? null,
        paymentStatus: o.paymentStatus ?? null,
        fulfillmentStatus: o.fulfillmentStatus ?? null,
        itemCount: Array.isArray(o.items) ? o.items.length : 0,
        subtotal: toNumber(o.subtotal),
        discountTotal: toNumber(o.discountTotal),
        shippingTotal: toNumber(o.shippingTotal),
        taxTotal: toNumber(o.taxTotal),
        grandTotal: toNumber(o.grandTotal),
        currency: o.currency?.abbreviation || o.currency?.symbol || null,
        placedAt: o.createdAt ?? null
    }));

    const envelope = await listResult(productOrderService, query, results, ctx);
    const revenue = await rollUpRevenue(query, ctx);

    return {
        ...envelope,
        // Totals over every matching order, not just the rows above. Currencies
        // are reported separately and never blended into one figure.
        revenue
    };
}

export const searchProductOrdersTool: AssistantTool = {
    name: "search_product_orders",
    description:
        "Search the online shop's customer orders by order number or email, " +
        "status, payment status, fulfilment status, date placed, or order value. " +
        "`unpaidOnly` finds orders awaiting payment; `awaitingShipmentOnly` finds " +
        "paid orders still to be shipped. Returns each order's number, customer, " +
        "statuses and totals, plus `total` (the true number of matching orders) " +
        "and `revenue` — the summed order value across ALL matches, grouped by " +
        "currency. Use this for questions about shop sales, revenue, unpaid or " +
        "unshipped orders. This is the retail shop; for service-marketplace jobs " +
        "use search_marketplace_orders.",
    parameters: orderParameters,
    execute: executeOrders
};

// ── search_fulfillments ──────────────────────────────────────────────────────

const SearchFulfillmentsArgs = z
    .object({
        orderNumber: z.string().trim().min(1).optional(),
        trackingNumber: z.string().trim().min(1).optional(),
        carrier: z.string().trim().min(1).optional(),
        status: z.enum(FULFILLMENT_STATUS_VALUES as [string, ...string[]]).optional(),
        inTransitOnly: z.coerce.boolean().optional(),
        overdueOnly: z.coerce.boolean().optional(),
        limit: limitArg
    })
    .strip();

const fulfillmentParameters = {
    type: "object" as const,
    properties: {
        orderNumber: {type: "string", description: "Only shipments for this order number."},
        trackingNumber: {type: "string", description: "Find a shipment by its tracking number."},
        carrier: {type: "string", description: "Only shipments with this carrier."},
        status: {
            type: "string",
            enum: FULFILLMENT_STATUS_VALUES,
            description: "Shipment status: pending, shipped, delivered, or failed."
        },
        inTransitOnly: {type: "boolean", description: "true = only shipments dispatched but not yet delivered."},
        overdueOnly: {
            type: "boolean",
            description: "true = only undelivered shipments past their estimated delivery date. Prefer this for \"late deliveries\"."
        },
        limit: limitParameter
    },
    required: [] as string[]
};

/** Resolve an order number to its id within the company. */
async function resolveOrderId(orderNumber: string, ctx: AssistantToolContext) {
    const order: any = await productOrderService.findOne(
        {...companyScope(ctx), orderNumber: regexClause(orderNumber)},
        findOptions(ctx),
        undefined,
        "_id"
    );
    return order?._id ?? null;
}

async function executeFulfillments(rawArgs: unknown, ctx: AssistantToolContext): Promise<unknown> {
    // The assistant shows only what the panel would: the same read permission
    const access = await requirePermission(ctx, "fulfillments[read:status]");
    if (!access.allowed) return accessDenied("shipments");

    const args = SearchFulfillmentsArgs.parse(rawArgs ?? {});

    // Hard company scope — the only scope the tool is allowed to read.
    const query: Record<string, unknown> = companyScope(ctx);

    if (args.orderNumber != null) {
        const orderId = await resolveOrderId(args.orderNumber, ctx);
        if (!orderId) return emptyResult(`No order "${args.orderNumber}" in this company.`);
        query.order = orderId;
    }
    if (args.trackingNumber != null) query.trackingNumber = regexClause(args.trackingNumber);
    if (args.carrier != null) query.carrier = regexClause(args.carrier);

    if (args.overdueOnly === true) {
        query.status = "shipped";
        query.estimatedDeliveryAt = {$lt: new Date()};
    } else if (args.inTransitOnly === true) {
        query.status = "shipped";
    } else if (args.status) {
        query.status = args.status;
    }

    const limit = args.limit ?? DEFAULT_RESULTS;

    const fulfillments = await fulfillmentService.find(
        query,
        findOptions(ctx),
        [{path: "order", select: "orderNumber email"}],
        "order status carrier trackingNumber trackingUrl shippedAt deliveredAt estimatedDeliveryAt items notes",
        {shippedAt: -1},
        limit
    );

    const results = fulfillments.map((f: any) => {
        const late = daysOverdue(f.estimatedDeliveryAt);
        return {
            id: f._id?.toString(),
            orderNumber: f.order?.orderNumber ?? null,
            status: f.status ?? null,
            carrier: f.carrier ?? null,
            trackingNumber: f.trackingNumber ?? null,
            trackingUrl: f.trackingUrl ?? null,
            itemCount: Array.isArray(f.items) ? f.items.length : 0,
            shippedAt: f.shippedAt ?? null,
            estimatedDeliveryAt: f.estimatedDeliveryAt ?? null,
            deliveredAt: f.deliveredAt ?? null,
            daysLate: f.status === "shipped" && late != null && late > 0 ? late : 0,
            notes: shortText(f.notes, 200)
        };
    });

    return listResult(fulfillmentService, query, results, ctx);
}

export const searchFulfillmentsTool: AssistantTool = {
    name: "search_fulfillments",
    description:
        "Search shipments made against shop orders. Filter by order number, " +
        "tracking number, carrier, status (pending, shipped, delivered, failed), " +
        "`inTransitOnly`, or `overdueOnly` for parcels past their estimated " +
        "delivery date. Returns each shipment's carrier, tracking details, dates " +
        "and days late, plus `total` — the true number of matching shipments. Use " +
        "this for \"where is order X\", \"what is in transit\", or \"which " +
        "deliveries are late\".",
    parameters: fulfillmentParameters,
    execute: executeFulfillments
};

// ── search_returns ───────────────────────────────────────────────────────────

const SearchReturnsArgs = z
    .object({
        orderNumber: z.string().trim().min(1).optional(),
        status: z.enum(RETURN_STATUS_VALUES as [string, ...string[]]).optional(),
        type: z.enum(RETURN_TYPE_VALUES as [string, ...string[]]).optional(),
        openOnly: z.coerce.boolean().optional(),
        limit: limitArg
    })
    .strip();

const returnParameters = {
    type: "object" as const,
    properties: {
        orderNumber: {type: "string", description: "Only return requests against this order number."},
        status: {
            type: "string",
            enum: RETURN_STATUS_VALUES,
            description: "Return status: pending, approved, rejected, received, or completed."
        },
        type: {
            type: "string",
            enum: RETURN_TYPE_VALUES,
            description: "What the customer wants: return, exchange, or refund."
        },
        openOnly: {
            type: "boolean",
            description: "true = only requests still being handled (pending, approved or received)."
        },
        limit: limitParameter
    },
    required: [] as string[]
};

async function executeReturns(rawArgs: unknown, ctx: AssistantToolContext): Promise<unknown> {
    // The assistant shows only what the panel would: the same read permission
    const access = await requirePermission(ctx, "returnrequests[read:status]");
    if (!access.allowed) return accessDenied("return requests");

    const args = SearchReturnsArgs.parse(rawArgs ?? {});

    // Hard company scope — the only scope the tool is allowed to read.
    const query: Record<string, unknown> = companyScope(ctx);

    if (args.orderNumber != null) {
        const orderId = await resolveOrderId(args.orderNumber, ctx);
        if (!orderId) return emptyResult(`No order "${args.orderNumber}" in this company.`);
        query.order = orderId;
    }
    if (args.type) query.type = args.type;
    if (args.openOnly === true) {
        query.status = {$in: ["pending", "approved", "received"]};
    } else if (args.status) {
        query.status = args.status;
    }

    const limit = args.limit ?? DEFAULT_RESULTS;

    const returns = await returnRequestService.find(
        query,
        findOptions(ctx),
        [
            {path: "order", select: "orderNumber email currency"},
            {path: "resolvedBy", select: "name surname username"}
        ],
        "order type status items refundAmount customerNote adminNote resolvedAt resolvedBy createdAt",
        {createdAt: -1},
        limit
    );

    const results = returns.map((r: any) => ({
        id: r._id?.toString(),
        orderNumber: r.order?.orderNumber ?? null,
        type: r.type ?? null,
        status: r.status ?? null,
        itemCount: Array.isArray(r.items) ? r.items.length : 0,
        refundAmount: toNumber(r.refundAmount),
        customerNote: shortText(r.customerNote, 200),
        adminNote: shortText(r.adminNote, 200),
        requestedAt: r.createdAt ?? null,
        resolvedAt: r.resolvedAt ?? null,
        resolvedBy: userDisplayName(r.resolvedBy),
        ageDays: r.resolvedAt == null ? daysOverdue(r.createdAt) ?? 0 : 0
    }));

    return listResult(returnRequestService, query, results, ctx);
}

export const searchReturnsTool: AssistantTool = {
    name: "search_returns",
    description:
        "Search customer return, exchange and refund requests against shop " +
        "orders. Filter by order number, status (pending, approved, rejected, " +
        "received, completed), type, or `openOnly` for requests still being " +
        "handled. Returns each request's type, status, refund amount, customer " +
        "note and how many days it has been open, plus `total` — the true number " +
        "of matching requests. Use this for questions about returns, refunds, " +
        "exchanges or the returns backlog.",
    parameters: returnParameters,
    execute: executeReturns
};

/** Registered by the core tool bootstrap (registerAllAssistantTools). */
export function registerOrderAssistantTools(): void {
    registerAssistantTool(searchProductOrdersTool);
    registerAssistantTool(searchFulfillmentsTool);
    registerAssistantTool(searchReturnsTool);
}
