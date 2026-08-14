/**
 * `search_discounts`, `search_product_reviews` and `search_abandoned_carts` —
 * AI-assistant tools for the demand side of the shop.
 *
 * Answers "which promo codes are live right now?", "has anyone used the SUMMER
 * code?", "what are customers saying about product X?", "how many carts were
 * abandoned this week and what's sitting in them?".
 *
 * SECURITY: arguments are untrusted LLM output — re-validated with Zod, free
 * text regex-escaped, and every query hard-scoped to `ctx.companyId`.
 *
 * @module marketingTools
 */

import {z} from "zod";
import {registerAssistantTool} from "@coreModule/domain/ai/tools/toolRegistry";
import type {AssistantTool, AssistantToolContext} from "@coreModule/domain/ai/tools/assistantTool.types";
import {discountService} from "@eCommerceModule/database/schemas/discount/discount.service";
import {productReviewService} from "@eCommerceModule/database/schemas/productReview/productReview.service";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {cartService} from "@eCommerceModule/database/schemas/cart/cart.service";
import type {DiscountType} from "@eCommerceModule/database/schemas/discount/discount";
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
    regexClause,
    roundMoney,
    shortText,
    toAmount,
    toNumber,
    userDisplayName
} from "@coreModule/domain/ai/tools/assistantToolKit";

const DISCOUNT_TYPE_VALUES = enumValues<DiscountType>({
    percentage: true,
    fixed: true,
    free_shipping: true,
    buy_x_get_y: true
});

// ── search_discounts ─────────────────────────────────────────────────────────

const SearchDiscountsArgs = z
    .object({
        search: z.string().trim().min(1).optional(),
        type: z.enum(DISCOUNT_TYPE_VALUES as [string, ...string[]]).optional(),
        liveOnly: z.coerce.boolean().optional(),
        expiredOnly: z.coerce.boolean().optional(),
        exhaustedOnly: z.coerce.boolean().optional(),
        limit: limitArg
    })
    .strip();

const discountParameters = {
    type: "object" as const,
    properties: {
        search: {type: "string", description: "Free text matched against the discount code or title."},
        type: {
            type: "string",
            enum: DISCOUNT_TYPE_VALUES,
            description: "Discount type: percentage, fixed, free_shipping, or buy_x_get_y."
        },
        liveOnly: {
            type: "boolean",
            description: "true = only discounts active and within their date window right now. Prefer this for \"what offers are running\"."
        },
        expiredOnly: {type: "boolean", description: "true = only discounts whose end date has passed."},
        exhaustedOnly: {
            type: "boolean",
            description: "true = only discounts that have hit their usage limit and can no longer be redeemed."
        },
        limit: limitParameter
    },
    required: [] as string[]
};

async function executeDiscounts(rawArgs: unknown, ctx: AssistantToolContext): Promise<unknown> {
    const args = SearchDiscountsArgs.parse(rawArgs ?? {});
    const now = new Date();

    // Hard company scope — the only scope the tool is allowed to read.
    const query: Record<string, unknown> = companyScope(ctx);

    if (args.search != null) {
        const rx = regexClause(args.search);
        query.$or = [{code: rx}, {title: rx}];
    }
    if (args.type) query.type = args.type;

    if (args.liveOnly === true) {
        // "Live" means all three at once: switched on, started, not yet ended.
        // An absent end date means open-ended, so it must still qualify.
        query.isActive = true;
        query.$and = [
            {$or: [{startsAt: null}, {startsAt: {$lte: now}}]},
            {$or: [{endsAt: null}, {endsAt: {$gte: now}}]}
        ];
    } else if (args.expiredOnly === true) {
        query.endsAt = {$lt: now};
    }

    if (args.exhaustedOnly === true) {
        query.$expr = {
            $and: [
                {$ne: ["$usageLimit", null]},
                {$gte: ["$usageCount", "$usageLimit"]}
            ]
        };
    }

    const limit = args.limit ?? DEFAULT_RESULTS;

    const discounts = await discountService.find(
        query,
        findOptions(ctx),
        undefined,
        "code title type value isActive startsAt endsAt usageCount usageLimit usageLimitPerCustomer " +
            "minimumOrderAmount minimumQuantity appliesTo",
        {endsAt: 1},
        limit
    );

    const results = discounts.map((d: any) => {
        const started = d.startsAt == null || new Date(d.startsAt) <= now;
        const notEnded = d.endsAt == null || new Date(d.endsAt) >= now;
        const exhausted = d.usageLimit != null && (d.usageCount ?? 0) >= d.usageLimit;
        return {
            id: d._id?.toString(),
            code: d.code ?? null,
            title: d.title ?? null,
            type: d.type ?? null,
            value: toNumber(d.value),
            isActive: d.isActive ?? false,
            live: (d.isActive ?? false) && started && notEnded && !exhausted,
            startsAt: d.startsAt ?? null,
            endsAt: d.endsAt ?? null,
            usageCount: d.usageCount ?? 0,
            usageLimit: d.usageLimit ?? null,
            usageLimitPerCustomer: d.usageLimitPerCustomer ?? null,
            exhausted,
            minimumOrderAmount: toNumber(d.minimumOrderAmount),
            appliesTo: d.appliesTo ?? null
        };
    });

    return listResult(
        discountService,
        query,
        results,
        ctx,
        "`live` means active, inside its date window and not exhausted — that is what a customer can actually redeem."
    );
}

export const searchDiscountsTool: AssistantTool = {
    name: "search_discounts",
    description:
        "Search the shop's discounts and promo codes. Filter by code or title, " +
        "type (percentage, fixed, free_shipping, buy_x_get_y), `liveOnly` for " +
        "offers customers can redeem right now, `expiredOnly`, or `exhaustedOnly` " +
        "for codes that have hit their usage cap. Returns each discount's value, " +
        "date window, usage count against its limit and whether it is currently " +
        "redeemable, plus `total` — the true number of matching discounts. Use " +
        "this for questions about promotions, coupon codes or campaign usage.",
    parameters: discountParameters,
    execute: executeDiscounts
};

// ── search_product_reviews ───────────────────────────────────────────────────

const SearchReviewsArgs = z
    .object({
        productSearch: z.string().trim().min(1).optional(),
        minRating: z.coerce.number().int().min(1).max(5).optional(),
        maxRating: z.coerce.number().int().min(1).max(5).optional(),
        since: z.coerce.date().optional(),
        until: z.coerce.date().optional(),
        limit: limitArg
    })
    .strip();

const reviewParameters = {
    type: "object" as const,
    properties: {
        productSearch: {type: "string", description: "Only reviews of products whose title or SKU matches this."},
        minRating: {type: "integer", description: "Minimum star rating, 1 to 5."},
        maxRating: {type: "integer", description: "Maximum star rating, 1 to 5. Use maxRating 2 for \"unhappy customers\"."},
        since: {type: "string", description: "ISO date; only reviews written on or after this date."},
        until: {type: "string", description: "ISO date; only reviews written on or before this date."},
        limit: limitParameter
    },
    required: [] as string[]
};

async function executeReviews(rawArgs: unknown, ctx: AssistantToolContext): Promise<unknown> {
    const args = SearchReviewsArgs.parse(rawArgs ?? {});

    // Hard company scope — the only scope the tool is allowed to read.
    const query: Record<string, unknown> = companyScope(ctx);

    if (args.productSearch != null) {
        const rx = regexClause(args.productSearch);
        const products = await productService.find(
            {...companyScope(ctx), $or: [{title: rx}, {sku: rx}]},
            findOptions(ctx),
            undefined,
            "_id",
            undefined,
            50
        );
        const productIds = products.map((p: any) => p._id).filter(Boolean);
        if (productIds.length === 0) {
            return emptyResult(`No product matching "${args.productSearch}" in this company.`);
        }
        query.product = {$in: productIds};
    }

    if (args.minRating != null || args.maxRating != null) {
        const rating: Record<string, number> = {};
        if (args.minRating != null) rating.$gte = args.minRating;
        if (args.maxRating != null) rating.$lte = args.maxRating;
        query.rating = rating;
    }

    const when = dateRange(args.since, args.until);
    if (when) query.createdAt = when;

    const limit = args.limit ?? DEFAULT_RESULTS;

    const reviews = await productReviewService.find(
        query,
        findOptions(ctx),
        [
            {path: "product", select: "title sku"},
            {path: "reviewer", select: "name surname fullName username"}
        ],
        "product reviewer rating title comment createdAt",
        {createdAt: -1},
        limit
    );

    const results = reviews.map((r: any) => ({
        id: r._id?.toString(),
        product: r.product?.title ?? null,
        sku: r.product?.sku ?? null,
        reviewer: userDisplayName(r.reviewer),
        rating: r.rating ?? null,
        title: r.title ?? null,
        comment: shortText(r.comment, 300),
        writtenAt: r.createdAt ?? null
    }));

    return listResult(productReviewService, query, results, ctx);
}

export const searchProductReviewsTool: AssistantTool = {
    name: "search_product_reviews",
    description:
        "Search customer reviews of shop products. Filter by product title or " +
        "SKU, a star-rating range, or a date range. Returns each review's product, " +
        "reviewer, rating and comment, plus `total` — the true number of matching " +
        "reviews. Use this for \"what are customers saying about X\", \"show me " +
        "bad reviews\" (maxRating 2), or review volume over a period. For a " +
        "product's average rating, search_products already returns it.",
    parameters: reviewParameters,
    execute: executeReviews
};

// ── search_abandoned_carts ───────────────────────────────────────────────────

const SearchCartsArgs = z
    .object({
        idleHours: z.coerce.number().int().positive().max(24 * 90).optional(),
        minValue: z.coerce.number().nonnegative().optional(),
        reminderSent: z.coerce.boolean().optional(),
        limit: limitArg
    })
    .strip();

/** Default idle window matching the abandoned-cart reminder cron. */
const DEFAULT_IDLE_HOURS = 24;
const MS_PER_HOUR = 3_600_000;

const cartParameters = {
    type: "object" as const,
    properties: {
        idleHours: {
            type: "integer",
            description: `Treat a cart as abandoned after this many hours of inactivity (default ${DEFAULT_IDLE_HOURS}).`
        },
        minValue: {type: "number", description: "Only carts worth at least this much, to focus on the valuable ones."},
        reminderSent: {
            type: "boolean",
            description: "true = only carts that already got a reminder; false = only those that have not."
        },
        limit: limitParameter
    },
    required: [] as string[]
};

async function executeCarts(rawArgs: unknown, ctx: AssistantToolContext): Promise<unknown> {
    const args = SearchCartsArgs.parse(rawArgs ?? {});
    const idleHours = args.idleHours ?? DEFAULT_IDLE_HOURS;
    const idleBefore = new Date(Date.now() - idleHours * MS_PER_HOUR);

    // Abandoned = has something in it, and untouched for the idle window.
    const query: Record<string, unknown> = {
        ...companyScope(ctx),
        "items.0": {$exists: true},
        updatedAt: {$lt: idleBefore}
    };

    if (args.minValue != null) query.estimatedTotal = {$gte: args.minValue};
    if (args.reminderSent === true) query.abandonedNotifiedAt = {$ne: null};
    if (args.reminderSent === false) query.abandonedNotifiedAt = null;

    const limit = args.limit ?? DEFAULT_RESULTS;

    const carts = await cartService.find(
        query,
        findOptions(ctx),
        [
            {path: "user", select: "name surname fullName username"},
            {path: "currency", select: "symbol abbreviation name"}
        ],
        "user sessionId items subtotal discountTotal estimatedTotal currency expiresAt abandonedNotifiedAt updatedAt",
        {estimatedTotal: -1},
        limit
    );

    const results = carts.map((c: any) => ({
        id: c._id?.toString(),
        customer: userDisplayName(c.user),
        // A cart with no user is an anonymous session; say so rather than null.
        anonymous: c.user == null,
        itemCount: Array.isArray(c.items) ? c.items.length : 0,
        subtotal: toNumber(c.subtotal),
        estimatedTotal: toNumber(c.estimatedTotal),
        currency: c.currency?.abbreviation || c.currency?.symbol || null,
        idleDays: daysOverdue(c.updatedAt) ?? 0,
        reminderSentAt: c.abandonedNotifiedAt ?? null,
        expiresAt: c.expiresAt ?? null
    }));

    const envelope = await listResult(cartService, query, results, ctx);

    // The value sitting in ALL abandoned carts, grouped by currency — the figure
    // "how much are we leaving on the table" actually asks for.
    const rows: any[] = await cartService.aggregate(
        [
            {$match: {...query, company: companyObjectId(ctx)}},
            {$group: {_id: "$currency", value: {$sum: {$toDouble: "$estimatedTotal"}}, carts: {$sum: 1}}},
            {$lookup: {from: "currencies", localField: "_id", foreignField: "_id", as: "currency"}}
        ],
        {logger: ctx.logger}
    );

    return {
        ...envelope,
        idleHours,
        abandonedValue: rows.map((row) => ({
            currency: row.currency?.[0]?.abbreviation ?? row.currency?.[0]?.symbol ?? null,
            value: roundMoney(toAmount(row.value)),
            carts: row.carts ?? 0
        }))
    };
}

export const searchAbandonedCartsTool: AssistantTool = {
    name: "search_abandoned_carts",
    description:
        "Find shopping carts that still have items but have been idle for a " +
        "while — potential lost sales. Filter by the idle window in hours, a " +
        "minimum cart value, or whether a reminder was already sent. Returns each " +
        "cart's customer (or anonymous), item count, value and days idle, plus " +
        "`total` (the true number of abandoned carts) and `abandonedValue` — the " +
        "total value sitting in ALL of them, grouped by currency. Use this for " +
        "\"how many abandoned carts\", \"how much are we leaving on the table\", " +
        "or \"who needs a reminder\".",
    parameters: cartParameters,
    execute: executeCarts
};

/** Registered by the core tool bootstrap (registerAllAssistantTools). */
export function registerMarketingAssistantTools(): void {
    registerAssistantTool(searchDiscountsTool);
    registerAssistantTool(searchProductReviewsTool);
    registerAssistantTool(searchAbandonedCartsTool);
}
