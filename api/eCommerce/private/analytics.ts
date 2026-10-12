import {Router, Request} from "express";
import type {Document, Model} from "mongoose";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW, {type AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import PaymentTransaction from "@financeModule/database/schemas/paymentTransaction/paymentTransaction";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import Cart from "@eCommerceModule/database/schemas/cart/cart";
import {cartService} from "@eCommerceModule/database/schemas/cart/cart.service";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import Product from "@eCommerceModule/database/schemas/product/product";
import Currency from "@coreModule/database/schemas/currency/currency";
import {ObjectId} from "mongodb";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";

export const basePath = "/api/eCommerce/analytics";
export const router = Router();

const readLimiter = rateLimiter({windowMs: 60000, max: 60});

/** Orders whose money counts as revenue (refunds are netted out separately). */
const REVENUE_PAYMENT_STATUSES = ["paid", "partially_refunded"];

/**
 * Store analytics expose company-wide money and stock figures, so they require
 * read access to the underlying field — the same rule the list views apply.
 */
function assertCanRead(params: AuthenticatedMWType, model: Model<Document>, field: string): void {
    const readable = SchemaGuard.sanitizeFields(model, {[field]: {}}, "read", params.actionUserCtx, params.languageCode);
    if (!readable[field]) {
        throw apiValidationException("user_permissions_not_sufficient", "", null, params.languageCode);
    }
}

/** Adds `netTotal` = grandTotal minus refunds recorded against the order. */
function netOfRefundsStages() {
    return [
        {
            $lookup: {
                from: PaymentTransaction.collection.name,
                let: {orderId: "$_id"},
                pipeline: [
                    {$match: {$expr: {$and: [
                        {$eq: ["$sourceId", "$$orderId"]},
                        {$eq: ["$sourceType", "productOrder"]},
                        {$eq: ["$type", "refund"]},
                    ]}}},
                    {$group: {_id: null, amount: {$sum: "$amount"}}},
                ],
                as: "refunds",
            },
        },
        {$addFields: {netTotal: {$subtract: ["$grandTotal", {$ifNull: [{$arrayElemAt: ["$refunds.amount", 0]}, 0]}]}}},
    ];
}

function queryString(req: Request, key: string, fallback: string): string {
    const value = req.query[key];
    return typeof value === "string" ? value : fallback;
}

function countsByKey(rows: {_id?: unknown; count?: unknown}[]): Record<string, number> {
    const out: Record<string, number> = {};
    for (const row of rows) {
        if (row._id == null) continue;
        out[String(row._id)] = Number(row.count ?? 0);
    }
    return out;
}

function dateRange(period: string): {start: Date; end: Date} {
    const end = new Date();
    const start = new Date();
    switch (period) {
        case "7d": start.setDate(start.getDate() - 7); break;
        case "30d": start.setDate(start.getDate() - 30); break;
        case "90d": start.setDate(start.getDate() - 90); break;
        case "1y": start.setFullYear(start.getFullYear() - 1); break;
        default: start.setDate(start.getDate() - 30);
    }
    return {start, end};
}

/**
 * Money is never summed across currencies: revenue figures are for one
 * currency — `?currency=<id>`, or else the one with the most paid orders in
 * the period. The response lists every currency that had sales so the panel
 * can switch.
 */
async function revenueCurrency(req: Request, companyId: ObjectId, start: Date, end: Date) {
    const used = await productOrderService.aggregate([
        {$match: {company: companyId, createdAt: {$gte: start, $lte: end}, paymentStatus: {$in: REVENUE_PAYMENT_STATUSES}, "deletedAt": null}},
        {$group: {_id: "$currency", orderCount: {$sum: 1}}},
        {$sort: {orderCount: -1}},
    ]);
    const codes = new Map(
        (await Currency.find({_id: {$in: used.map(row => row._id)}}, {abbreviation: 1}).lean())
            .map(currency => [currency._id.toString(), currency.abbreviation]),
    );
    const currencies = used.map(row => ({
        _id: String(row._id),
        abbreviation: codes.get(String(row._id)),
        orderCount: Number(row.orderCount ?? 0),
    }));

    const requested = queryString(req, "currency", "");
    const selectedId = ObjectId.isValid(requested) ? requested : currencies[0]?._id;
    return {
        currencyId: selectedId ? new ObjectId(selectedId) : null,
        currency: currencies.find(currency => currency._id === selectedId) ?? null,
        currencies,
    };
}

// Revenue analytics
router.get(
    "/revenue",
    authMW("private"),
    readLimiter,
    asyncHandler(async (params: AuthenticatedMWType, _queryParams: unknown, req: Request) => {
        const {company} = params;
        assertCanRead(params, ProductOrder, "grandTotal");
        const period = queryString(req, "period", "30d");
        const {start, end} = dateRange(period);
        const {currencyId, currency, currencies} = await revenueCurrency(req, company._id, start, end);

        const [result] = await productOrderService.aggregate([
            {
                $match: {
                    company: company._id,
                    createdAt: {$gte: start, $lte: end},
                    paymentStatus: {$in: REVENUE_PAYMENT_STATUSES},
                    currency: currencyId,
                    "deletedAt": null,
                },
            },
            ...netOfRefundsStages(),
            {
                $group: {
                    _id: null,
                    totalRevenue: {$sum: "$netTotal"},
                    orderCount: {$sum: 1},
                    averageOrderValue: {$avg: "$netTotal"},
                    totalTax: {$sum: "$taxTotal"},
                    totalShipping: {$sum: "$shippingTotal"},
                },
            },
        ]);

        const dailyRevenue = await productOrderService.aggregate([
            {
                $match: {
                    company: company._id,
                    createdAt: {$gte: start, $lte: end},
                    paymentStatus: {$in: REVENUE_PAYMENT_STATUSES},
                    currency: currencyId,
                    "deletedAt": null,
                },
            },
            ...netOfRefundsStages(),
            {
                $group: {
                    _id: {$dateToString: {format: "%Y-%m-%d", date: "$createdAt"}},
                    revenue: {$sum: "$netTotal"},
                    orders: {$sum: 1},
                },
            },
            {$sort: {"_id": 1}},
        ]);

        return {
            data: {
                totalRevenue: result?.totalRevenue ?? 0,
                orderCount: result?.orderCount ?? 0,
                averageOrderValue: result?.averageOrderValue ?? 0,
                totalTax: result?.totalTax ?? 0,
                totalShipping: result?.totalShipping ?? 0,
                daily: dailyRevenue,
                currency,
                currencies,
            },
        };
    }),
);

// Orders analytics
router.get(
    "/orders",
    authMW("private"),
    readLimiter,
    asyncHandler(async (params: AuthenticatedMWType, _queryParams: unknown, req: Request) => {
        const {company} = params;
        assertCanRead(params, ProductOrder, "status");
        const period = queryString(req, "period", "30d");
        const {start, end} = dateRange(period);

        const statusCounts = await productOrderService.aggregate([
            {$match: {company: company._id, createdAt: {$gte: start, $lte: end}, "deletedAt": null}},
            {$group: {_id: "$status", count: {$sum: 1}}},
        ]);

        return {
            data: {
                byStatus: countsByKey(statusCounts),
            },
        };
    }),
);

// Inventory analytics
router.get(
    "/inventory",
    authMW("private"),
    readLimiter,
    asyncHandler(async (params: AuthenticatedMWType) => {
        const {company} = params;
        assertCanRead(params, Inventory, "quantityOnHand");

        const [lowStock, outOfStock, totalValue] = await Promise.all([
            inventoryService.count({
                company: company._id,
                $expr: {$and: [{$lt: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, "$reorderPoint"]}, {$gt: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, 0]}]},
            }),
            inventoryService.count({
                company: company._id,
                $expr: {$lte: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, 0]},
            }),
            inventoryService.aggregate([
                {$match: {company: company._id}},
                {$group: {_id: null, totalOnHand: {$sum: "$quantityOnHand"}}},
            ]),
        ]);

        return {
            data: {
                lowStockCount: lowStock,
                outOfStockCount: outOfStock,
                totalOnHand: totalValue[0]?.totalOnHand ?? 0,
            },
        };
    }),
);

// Products analytics
router.get(
    "/products",
    authMW("private"),
    readLimiter,
    asyncHandler(async (params: AuthenticatedMWType, _queryParams: unknown, req: Request) => {
        const {company} = params;
        assertCanRead(params, ProductOrder, "grandTotal");
        const period = queryString(req, "period", "30d");
        const limit = Number(queryString(req, "limit", "10"));
        const {start, end} = dateRange(period);
        const {currencyId, currency} = await revenueCurrency(req, company._id, start, end);

        const topProducts = await productOrderService.aggregate([
            {$match: {company: company._id, createdAt: {$gte: start, $lte: end}, paymentStatus: {$in: REVENUE_PAYMENT_STATUSES}, currency: currencyId, "deletedAt": null}},
            {$unwind: "$items"},
            {
                $group: {
                    _id: "$items.product",
                    // Order items snapshot titles under items.snapshot.title; older rows used items.title
                    title: {$first: {$ifNull: ["$items.snapshot.title", "$items.title"]}},
                    totalSold: {$sum: "$items.quantity"},
                    totalRevenue: {$sum: "$items.totalPrice"},
                },
            },
            {$sort: {totalRevenue: -1}},
            {$limit: Math.min(Number.isFinite(limit) ? limit : 10, 50)},
        ]);

        const statusCounts = await productService.aggregate([
            {$match: {company: company._id, "deletedAt": null}},
            {$group: {_id: "$status", count: {$sum: 1}}},
        ]);

        return {
            data: {
                topProducts,
                byStatus: countsByKey(statusCounts),
                currency,
            },
        };
    }),
);

// Cart analytics (abandonment)
router.get(
    "/carts",
    authMW("private"),
    readLimiter,
    asyncHandler(async (params: AuthenticatedMWType) => {
        const {company} = params;
        assertCanRead(params, Cart, "subtotal");

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const [abandonedCarts, activeCarts] = await Promise.all([
            cartService.count({
                company: company._id,
                "items.0": {$exists: true},
                updatedAt: {$lt: oneHourAgo},
                "deletedAt": null,
            }),
            cartService.count({
                company: company._id,
                "items.0": {$exists: true},
                updatedAt: {$gte: oneHourAgo},
            }),
        ]);

        const avgCartValue = await cartService.aggregate([
            {$match: {company: company._id, "items.0": {$exists: true}}},
            {$group: {_id: null, avg: {$avg: "$subtotal"}}},
        ]);

        return {
            data: {
                abandonedCarts,
                activeCarts,
                averageCartValue: avgCartValue[0]?.avg ?? 0,
            },
        };
    }),
);
