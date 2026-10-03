import {Router, Request} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import PaymentTransaction from "@financeModule/database/schemas/paymentTransaction/paymentTransaction";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import Cart from "@eCommerceModule/database/schemas/cart/cart";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import Product from "@eCommerceModule/database/schemas/product/product";

export const basePath = "/api/eCommerce/analytics";
export const router = Router();

const readLimiter = rateLimiter({windowMs: 60000, max: 60});

/** Orders whose money counts as revenue (refunds are netted out separately). */
const REVENUE_PAYMENT_STATUSES = ["paid", "partially_refunded"];

/**
 * Store analytics expose company-wide money and stock figures, so they require
 * read access to the underlying field — the same rule the list views apply.
 */
function assertCanRead(params: any, model: any, field: string): void {
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

// Revenue analytics
router.get(
    "/revenue",
    authMW("private"),
    readLimiter,
    asyncHandler(async (params: any, _queryParams: any, req: Request) => {
        const {company} = params;
        assertCanRead(params, ProductOrder, "grandTotal");
        const period = String((req.query?.period as string) ?? "30d");
        const {start, end} = dateRange(period);

        const [result] = await ProductOrder.aggregate([
            {
                $match: {
                    company: company._id,
                    createdAt: {$gte: start, $lte: end},
                    paymentStatus: {$in: REVENUE_PAYMENT_STATUSES},
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

        const dailyRevenue = await ProductOrder.aggregate([
            {
                $match: {
                    company: company._id,
                    createdAt: {$gte: start, $lte: end},
                    paymentStatus: {$in: REVENUE_PAYMENT_STATUSES},
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
            },
        };
    }),
);

// Orders analytics
router.get(
    "/orders",
    authMW("private"),
    readLimiter,
    asyncHandler(async (params: any, _queryParams: any, req: Request) => {
        const {company} = params;
        assertCanRead(params, ProductOrder, "status");
        const period = String((req.query?.period as string) ?? "30d");
        const {start, end} = dateRange(period);

        const statusCounts = await ProductOrder.aggregate([
            {$match: {company: company._id, createdAt: {$gte: start, $lte: end}, "deletedAt": null}},
            {$group: {_id: "$status", count: {$sum: 1}}},
        ]);

        return {
            data: {
                byStatus: statusCounts.reduce((acc: any, {_id, count}: any) => ({...acc, [_id]: count}), {}),
            },
        };
    }),
);

// Inventory analytics
router.get(
    "/inventory",
    authMW("private"),
    readLimiter,
    asyncHandler(async (params: any) => {
        const {company} = params;
        assertCanRead(params, Inventory, "quantityOnHand");

        const [lowStock, outOfStock, totalValue] = await Promise.all([
            Inventory.countDocuments({
                company: company._id,
                $expr: {$and: [{$lt: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, "$reorderPoint"]}, {$gt: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, 0]}]},
            }),
            Inventory.countDocuments({
                company: company._id,
                $expr: {$lte: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, 0]},
            }),
            Inventory.aggregate([
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
    asyncHandler(async (params: any, _queryParams: any, req: Request) => {
        const {company} = params;
        assertCanRead(params, ProductOrder, "grandTotal");
        const period = String((req.query?.period as string) ?? "30d");
        const limit = Number((req.query?.limit as string) ?? 10);
        const {start, end} = dateRange(period);

        const topProducts = await ProductOrder.aggregate([
            {$match: {company: company._id, createdAt: {$gte: start, $lte: end}, paymentStatus: {$in: REVENUE_PAYMENT_STATUSES}, "deletedAt": null}},
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

        const statusCounts = await Product.aggregate([
            {$match: {company: company._id, "deletedAt": null}},
            {$group: {_id: "$status", count: {$sum: 1}}},
        ]);

        return {
            data: {
                topProducts,
                byStatus: statusCounts.reduce((acc: any, {_id, count}: any) => ({...acc, [_id]: count}), {}),
            },
        };
    }),
);

// Cart analytics (abandonment)
router.get(
    "/carts",
    authMW("private"),
    readLimiter,
    asyncHandler(async (params: any) => {
        const {company} = params;
        assertCanRead(params, Cart, "subtotal");

        const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);

        const [abandonedCarts, activeCarts] = await Promise.all([
            Cart.countDocuments({
                company: company._id,
                "items.0": {$exists: true},
                updatedAt: {$lt: oneHourAgo},
                "deletedAt": null,
            }),
            Cart.countDocuments({
                company: company._id,
                "items.0": {$exists: true},
                updatedAt: {$gte: oneHourAgo},
            }),
        ]);

        const avgCartValue = await Cart.aggregate([
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
