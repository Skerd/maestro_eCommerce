import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import Cart from "@eCommerceModule/database/schemas/cart/cart";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import Product from "@eCommerceModule/database/schemas/product/product";

export const basePath = "/api/eCommerce/analytics";
export const router = Router();

const readLimiter = rateLimiter({windowMs: 60000, max: 60});

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
    asyncHandler(async (req: any, res: any) => {
        const {company} = req;
        const {period = "30d"} = req.query;
        const {start, end} = dateRange(String(period));

        const [result] = await ProductOrder.aggregate([
            {
                $match: {
                    company: company._id,
                    createdAt: {$gte: start, $lte: end},
                    paymentStatus: "paid",
                    "deletedAt": null,
                },
            },
            {
                $group: {
                    _id: null,
                    totalRevenue: {$sum: "$grandTotal"},
                    orderCount: {$sum: 1},
                    averageOrderValue: {$avg: "$grandTotal"},
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
                    paymentStatus: "paid",
                    "deletedAt": null,
                },
            },
            {
                $group: {
                    _id: {$dateToString: {format: "%Y-%m-%d", date: "$createdAt"}},
                    revenue: {$sum: "$grandTotal"},
                    orders: {$sum: 1},
                },
            },
            {$sort: {"_id": 1}},
        ]);

        return res.json({
            data: {
                totalRevenue: result?.totalRevenue ?? 0,
                orderCount: result?.orderCount ?? 0,
                averageOrderValue: result?.averageOrderValue ?? 0,
                totalTax: result?.totalTax ?? 0,
                totalShipping: result?.totalShipping ?? 0,
                daily: dailyRevenue,
            },
        });
    }),
);

// Orders analytics
router.get(
    "/orders",
    authMW("private"),
    readLimiter,
    asyncHandler(async (req: any, res: any) => {
        const {company} = req;
        const {period = "30d"} = req.query;
        const {start, end} = dateRange(String(period));

        const statusCounts = await ProductOrder.aggregate([
            {$match: {company: company._id, createdAt: {$gte: start, $lte: end}, "deletedAt": null}},
            {$group: {_id: "$status", count: {$sum: 1}}},
        ]);

        return res.json({
            data: {
                byStatus: statusCounts.reduce((acc: any, {_id, count}: any) => ({...acc, [_id]: count}), {}),
            },
        });
    }),
);

// Inventory analytics
router.get(
    "/inventory",
    authMW("private"),
    readLimiter,
    asyncHandler(async (req: any, res: any) => {
        const {company} = req;

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

        return res.json({
            data: {
                lowStockCount: lowStock,
                outOfStockCount: outOfStock,
                totalOnHand: totalValue[0]?.totalOnHand ?? 0,
            },
        });
    }),
);

// Products analytics
router.get(
    "/products",
    authMW("private"),
    readLimiter,
    asyncHandler(async (req: any, res: any) => {
        const {company} = req;
        const {period = "30d", limit = 10} = req.query;
        const {start, end} = dateRange(String(period));

        const topProducts = await ProductOrder.aggregate([
            {$match: {company: company._id, createdAt: {$gte: start, $lte: end}, paymentStatus: "paid", "deletedAt": null}},
            {$unwind: "$items"},
            {$group: {_id: "$items.product", title: {$first: "$items.title"}, totalSold: {$sum: "$items.quantity"}, totalRevenue: {$sum: "$items.totalPrice"}}},
            {$sort: {totalRevenue: -1}},
            {$limit: Math.min(Number(limit), 50)},
        ]);

        const statusCounts = await Product.aggregate([
            {$match: {company: company._id, "deletedAt": null}},
            {$group: {_id: "$status", count: {$sum: 1}}},
        ]);

        return res.json({
            data: {
                topProducts,
                byStatus: statusCounts.reduce((acc: any, {_id, count}: any) => ({...acc, [_id]: count}), {}),
            },
        });
    }),
);

// Cart analytics (abandonment)
router.get(
    "/carts",
    authMW("private"),
    readLimiter,
    asyncHandler(async (req: any, res: any) => {
        const {company} = req;

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

        return res.json({
            data: {
                abandonedCarts,
                activeCarts,
                averageCartValue: avgCartValue[0]?.avg ?? 0,
            },
        });
    }),
);
