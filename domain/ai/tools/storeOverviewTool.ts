/**
 * `store_overview` — one-call health check for the online shop.
 *
 * Answers the broad opening questions: "how is the shop doing?", "what needs
 * attention today?", "give me today's numbers". Without it the model has to fire
 * five or six search tools and stitch the figures together, which is slow and
 * gives it room to miscount.
 *
 * EVERY FIGURE IS A COUNT OR AN AGGREGATE over the whole company scope — no
 * sampling. Money is grouped by currency and never converted, and the sales
 * window is explicit so "this month" is never silently assumed.
 *
 * @module storeOverviewTool
 */

import {z} from "zod";
import {registerAssistantTool} from "@coreModule/domain/ai/tools/toolRegistry";
import type {AssistantTool, AssistantToolContext} from "@coreModule/domain/ai/tools/assistantTool.types";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {returnRequestService} from "@eCommerceModule/database/schemas/returnRequest/returnRequest.service";
import {fulfillmentService} from "@eCommerceModule/database/schemas/fulfillment/fulfillment.service";
import {cartService} from "@eCommerceModule/database/schemas/cart/cart.service";
import {discountService} from "@eCommerceModule/database/schemas/discount/discount.service";
import {companyObjectId, companyScope, roundMoney, toAmount} from "@coreModule/domain/ai/tools/assistantToolKit";
import {accessDenied, requirePermission} from "@coreModule/domain/ai/tools/assistantToolAccess";

/** Default reporting window for the "recent activity" figures. */
const DEFAULT_WINDOW_DAYS = 30;
const MAX_WINDOW_DAYS = 365;
const MS_PER_DAY = 86_400_000;
/** Idle window after which a cart with items counts as abandoned. */
const ABANDONED_AFTER_HOURS = 24;

const StoreOverviewArgs = z
    .object({
        windowDays: z.coerce.number().int().positive().max(MAX_WINDOW_DAYS).optional()
    })
    .strip();

const parameters = {
    type: "object" as const,
    properties: {
        windowDays: {
            type: "integer",
            description:
                `How many days back the "recent" figures (orders, revenue) should cover. ` +
                `Default ${DEFAULT_WINDOW_DAYS}, max ${MAX_WINDOW_DAYS}. Use 30 for "this month", 7 for "this week", 1 for "today".`
        }
    },
    required: [] as string[]
};

/** Count orders by status across the whole company, in one aggregation. */
async function orderBreakdown(ctx: AssistantToolContext): Promise<{total: number; byStatus: Record<string, number>}> {
    const rows: any[] = await productOrderService.aggregate(
        [
            {$match: {company: companyObjectId(ctx), deletedAt: null}},
            {$group: {_id: "$status", count: {$sum: 1}}}
        ],
        {logger: ctx.logger}
    );

    const byStatus: Record<string, number> = {};
    let total = 0;
    for (const row of rows) {
        const count = row.count ?? 0;
        byStatus[row._id ?? "unknown"] = count;
        total += count;
    }
    return {total, byStatus};
}

/** Paid revenue in the window, grouped by currency (never blended). */
async function revenueInWindow(
    since: Date,
    ctx: AssistantToolContext
): Promise<{orders: number; revenue: Array<{currency: string | null; amount: number}>}> {
    const rows: any[] = await productOrderService.aggregate(
        [
            {
                $match: {
                    company: companyObjectId(ctx),
                    deletedAt: null,
                    createdAt: {$gte: since},
                    // Revenue means money actually taken, so unpaid and voided
                    // orders are excluded rather than counted as sales.
                    paymentStatus: {$in: ["paid", "partially_refunded"]}
                }
            },
            {$group: {_id: "$currency", amount: {$sum: {$toDouble: "$grandTotal"}}, orders: {$sum: 1}}},
            {$lookup: {from: "currencies", localField: "_id", foreignField: "_id", as: "currency"}}
        ],
        {logger: ctx.logger}
    );

    return {
        orders: rows.reduce((sum, row) => sum + (row.orders ?? 0), 0),
        revenue: rows.map((row) => ({
            currency: row.currency?.[0]?.abbreviation ?? row.currency?.[0]?.symbol ?? null,
            amount: roundMoney(toAmount(row.amount))
        }))
    };
}

async function execute(rawArgs: unknown, ctx: AssistantToolContext): Promise<unknown> {
    // The assistant shows only what the panel would: the same read permission
    const access = await requirePermission(ctx, "productorders[read:grandTotal]");
    if (!access.allowed) return accessDenied("store sales figures");

    const args = StoreOverviewArgs.parse(rawArgs ?? {});
    const windowDays = args.windowDays ?? DEFAULT_WINDOW_DAYS;
    const now = new Date();
    const since = new Date(now.getTime() - windowDays * MS_PER_DAY);
    const abandonedBefore = new Date(now.getTime() - ABANDONED_AFTER_HOURS * 3_600_000);

    const scope = companyScope(ctx);
    const countOptions = {logger: ctx.logger, withDeleted: false};

    const [
        orders,
        sales,
        activeProducts,
        outOfStock,
        lowStock,
        awaitingShipment,
        unpaidOrders,
        inTransit,
        lateDeliveries,
        openReturns,
        abandonedCarts,
        liveDiscounts
    ] = await Promise.all([
        orderBreakdown(ctx),
        revenueInWindow(since, ctx),
        productService.count({...scope, status: "active"}, countOptions),
        inventoryService.count({...scope, quantityOnHand: {$lte: 0}}, countOptions),
        inventoryService.count(
            {
                ...scope,
                $expr: {$and: [{$ne: ["$reorderPoint", null]}, {$lte: ["$quantityOnHand", "$reorderPoint"]}]}
            },
            countOptions
        ),
        productOrderService.count(
            {
                ...scope,
                paymentStatus: "paid",
                status: {$nin: ["cancelled", "refunded"]},
                fulfillmentStatus: {$in: ["unfulfilled", "partially_fulfilled"]}
            },
            countOptions
        ),
        productOrderService.count(
            {...scope, paymentStatus: {$in: ["unpaid", "authorized"]}, status: {$nin: ["cancelled", "refunded"]}},
            countOptions
        ),
        fulfillmentService.count({...scope, status: "shipped"}, countOptions),
        fulfillmentService.count({...scope, status: "shipped", estimatedDeliveryAt: {$lt: now}}, countOptions),
        returnRequestService.count({...scope, status: {$in: ["pending", "approved", "received"]}}, countOptions),
        cartService.count(
            {...scope, "items.0": {$exists: true}, updatedAt: {$lt: abandonedBefore}},
            countOptions
        ),
        discountService.count(
            {
                ...scope,
                isActive: true,
                $and: [
                    {$or: [{startsAt: null}, {startsAt: {$lte: now}}]},
                    {$or: [{endsAt: null}, {endsAt: {$gte: now}}]}
                ]
            },
            countOptions
        )
    ]);

    return {
        windowDays,
        windowStart: since,
        generatedAt: now,
        sales: {
            paidOrdersInWindow: sales.orders,
            // Grouped by currency; do not add these together.
            revenueInWindow: sales.revenue,
            ordersAllTime: orders.total,
            ordersByStatus: orders.byStatus
        },
        catalogue: {
            activeProducts,
            outOfStockItems: outOfStock,
            lowStockItems: lowStock
        },
        operations: {
            ordersAwaitingShipment: awaitingShipment,
            unpaidOrders,
            shipmentsInTransit: inTransit,
            lateDeliveries,
            openReturns
        },
        demand: {
            abandonedCarts,
            liveDiscounts
        },
        notes: [
            "All figures are real counts/aggregates over the whole company — not samples.",
            "Revenue counts only paid (or partially refunded) orders; money is grouped by currency and never converted.",
            `A cart counts as abandoned after ${ABANDONED_AFTER_HOURS}h idle with items still in it.`,
            "Use the specific search_* tools to drill into any number above."
        ]
    };
}

export const storeOverviewTool: AssistantTool = {
    name: "store_overview",
    description:
        "Get a single snapshot of the online shop: paid orders and revenue in a " +
        "recent window, orders by status, active products, out-of-stock and " +
        "low-stock counts, orders awaiting shipment, unpaid orders, shipments in " +
        "transit, late deliveries, open returns, abandoned carts and live " +
        "discounts. Use this FIRST for broad questions like \"how is the shop " +
        "doing?\", \"today's numbers\", \"what needs attention?\" — it replaces " +
        "firing several search tools. Then drill in with the specific search_* " +
        "tools.",
    parameters,
    execute
};

/** Registered by the core tool bootstrap (registerAllAssistantTools). */
export function registerStoreOverviewAssistantTools(): void {
    registerAssistantTool(storeOverviewTool);
}
