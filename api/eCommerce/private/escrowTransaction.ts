import { Router } from "express";
import { ObjectId } from "mongodb";
import { asyncHandler } from "@coreModule/utilities/middlewares/asyncHandler";
import authMW, { AuthenticatedMWType } from "@coreModule/utilities/middlewares/authMW";
import { rateLimiter } from "@coreModule/utilities/middlewares/rateLimiter";
import { validateFormZod } from "@coreModule/utilities/middlewares/validateFormZod";
import { escrowTransactionService } from "@eCommerceModule/database/schemas/escrowTransaction/escrowTransaction.service";
import { orderService } from "@eCommerceMarketplaceModule/database/schemas/order/order.service";
import {COLLECTED_DATA} from "@coreModule/database/collections";
import { EscrowTransactionFormResponseType } from "armonia/src/modules/eCommerce/api/eCommerce/private/escrowTransaction/escrowTransaction.form.response.type";
import { EscrowTransactionFormType } from "armonia/src/modules/eCommerce/api/eCommerce/private/escrowTransaction/escrowTransaction.form.type";
import { escrowTransactionFormSchema } from "armonia/src/modules/eCommerce/api/eCommerce/private/escrowTransaction/escrowTransaction.form.validator";
import { escrowSummaryFormSchema } from "armonia/src/modules/eCommerce/api/eCommerce/private/escrowTransaction/escrowSummary.form.validator";
import { EscrowSummaryFormType } from "armonia/src/modules/eCommerce/api/eCommerce/private/escrowTransaction/escrowSummary.form.type";
import { EscrowStuckHold, EscrowSummary } from "armonia/src/modules/eCommerce/api/eCommerce/private/escrowTransaction/escrowSummary.form.response.type";
import {
    providerEarningsFormSchema,
    ProviderEarningsFormType,
    ProviderEarningsResponse,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/escrowTransaction/providerEarnings.form.validator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import EscrowTransactionModel from "@eCommerceModule/database/schemas/escrowTransaction/escrowTransaction";
import { escrowTransactionsToDTO } from "@eCommerceModule/utilities/mappers/escrowTransactionMapper.dto";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";

const router = Router();

/**
 * POST /api/eCommerce/escrowTransaction
 *
 * List escrow transactions, optionally filtered by orderId.
 * User must be customer or provider of the order.
 */
router.post(
    "",
    authMW("private"),
    rateLimiter({ windowMs: 60000, max: 60 }),
    validateFormZod(escrowTransactionFormSchema),
    asyncHandler(getEscrowTransactions)
);

async function getEscrowTransactions(
    params: AuthenticatedMWType & EscrowTransactionFormType
): Promise<EscrowTransactionFormResponseType> {
    const { logger, languageCode, actionUserCtx, company, orderId, type, page, limit } = params;

    const filter: any = { company: company._id };
    if (type) filter.type = type;

    if (orderId) {
        const order = await orderService.findOne(
            { _id: new ObjectId(orderId), company: company._id },
            { logger, languageCode },
            "customer provider",
            "_id customer provider"
        );

        if (!order) {
            throw apiValidationException("order_not_found", null, null, languageCode);
        }

        const customerId = (order as any).customer?._id?.toString?.() || (order as any).customer?.toString?.();
        const providerId = (order as any).provider?._id?.toString?.() || (order as any).provider?.toString?.();
        const currentUserId = actionUserCtx.userId?.toString?.();

        if (customerId !== currentUserId && providerId !== currentUserId && !actionUserCtx.isAdmin) {
            throw apiValidationException("only_order_parties_can_view_escrow", null, null, languageCode);
        }

        filter.order = new ObjectId(orderId);
    }

    logger.start(`Fetching escrow transactions...`);

    const sanitized = SchemaGuard.sanitizeFields(
        EscrowTransactionModel,
        COLLECTED_DATA.escrowtransactions?.readFields ?? [],
        "read",
        actionUserCtx,
        languageCode
    );
    const populate = SchemaGuard.generatePopulate(sanitized, EscrowTransactionModel.schema);

    const pageNum = page || 1;
    const limitNum = limit || 50;
    const skip = (pageNum - 1) * limitNum;

    const [txs, total] = await Promise.all([
        escrowTransactionService.find(
            filter,
            { logger, languageCode },
            populate.populate,
            populate.select || "",
            { createdAt: 1 },
            limitNum,
            skip
        ),
        escrowTransactionService.count(filter, { logger, languageCode }),
    ]);

    logger.finish(`Fetched ${txs.length} escrow transactions`);

    return {
        data: escrowTransactionsToDTO(txs),
        total,
    };
}

/**
 * POST /api/eCommerce/escrowTransaction/summary
 *
 * Financial summary: holds, releases, refunds, fees by currency. Admin only.
 */
router.post(
    "/summary",
    authMW("private"),
    rateLimiter({ windowMs: 60000, max: 30 }),
    validateFormZod(escrowSummaryFormSchema),
    asyncHandler(getEscrowSummary)
);

async function getEscrowSummary(
    params: AuthenticatedMWType & EscrowSummaryFormType
): Promise<EscrowSummary> {
    const { logger, languageCode, actionUserCtx, company, startDate, endDate } = params;

    if (!actionUserCtx.isAdmin) {
        throw apiValidationException("admin_only", null, null, languageCode);
    }

    const filter: any = { company: company._id, status: "completed" };
    if (startDate) filter.createdAt = filter.createdAt || {};
    if (startDate) filter.createdAt.$gte = new Date(startDate);
    if (endDate) {
        filter.createdAt = filter.createdAt || {};
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filter.createdAt.$lte = end;
    }

    const rows = await EscrowTransactionModel.aggregate([
        { $match: filter },
        {
            $lookup: {
                from: "currencies",
                localField: "currency",
                foreignField: "_id",
                as: "currencyDoc",
            },
        },
        { $unwind: { path: "$currencyDoc", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: { currency: "$currency", type: "$type", recipient: "$recipient" },
                total: { $sum: "$amount" },
                symbol: { $first: "$currencyDoc.symbol" },
            },
        },
    ]);

    const byCurrency: Record<string, { holds: number; releases: number; refunds: number; fees: number; symbol?: string }> = {};

    for (const row of rows) {
        const cid = row._id.currency?.toString() ?? "unknown";
        if (!byCurrency[cid]) {
            byCurrency[cid] = { holds: 0, releases: 0, refunds: 0, fees: 0, symbol: row.symbol };
        }
        if (row._id.type === "hold") byCurrency[cid].holds += row.total;
        else if (row._id.type === "release" && row._id.recipient === "provider") byCurrency[cid].releases += row.total;
        else if (row._id.type === "refund") byCurrency[cid].refunds += row.total;
        else if (row._id.type === "fee") byCurrency[cid].fees += row.total;
    }

    // Stuck holds: completed holds with no release/refund row for the same
    // order — money still sitting in escrow (plus its gateway mirror status).
    const stuckRows = await EscrowTransactionModel.aggregate([
        { $match: { company: company._id, type: "hold", status: "completed" } },
        {
            $lookup: {
                from: "escrowtransactions",
                let: { orderId: "$order" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$order", "$$orderId"] },
                                    { $in: ["$type", ["release", "refund"]] },
                                ],
                            },
                        },
                    },
                    { $limit: 1 },
                ],
                as: "settlements",
            },
        },
        { $match: { settlements: { $size: 0 } } },
        {
            $lookup: {
                from: "currencies",
                localField: "currency",
                foreignField: "_id",
                as: "currencyDoc",
            },
        },
        { $unwind: { path: "$currencyDoc", preserveNullAndEmptyArrays: true } },
        { $sort: { createdAt: 1 } },
        { $limit: 100 },
        {
            $project: {
                order: 1,
                amount: 1,
                currency: 1,
                gatewayStatus: 1,
                createdAt: 1,
                currencySymbol: "$currencyDoc.symbol",
            },
        },
    ]);

    const now = Date.now();
    const stuckHolds: EscrowStuckHold[] = stuckRows.map((row: any) => ({
        escrowTransactionId: row._id.toString(),
        orderId: row.order?.toString() ?? "",
        amount: row.amount ?? 0,
        currencyId: row.currency?.toString(),
        currencySymbol: row.currencySymbol,
        gatewayStatus: row.gatewayStatus,
        createdAt: row.createdAt ? new Date(row.createdAt).toISOString() : undefined,
        ageDays: row.createdAt ? Math.floor((now - new Date(row.createdAt).getTime()) / 86400000) : 0,
    }));

    return {
        byCurrency: Object.entries(byCurrency).map(([currencyId, data]) => ({
            currencyId,
            currencySymbol: data.symbol,
            holds: data.holds,
            releases: data.releases,
            refunds: data.refunds,
            fees: data.fees,
        })),
        stuckHolds,
    };
}

/**
 * POST /api/eCommerce/escrowTransaction/providerEarnings
 *
 * Earnings for the CURRENT user as marketplace provider: released payouts,
 * fees taken, refunds, and holds still pending — grouped by currency.
 */
router.post(
    "/providerEarnings",
    authMW("private"),
    rateLimiter({ windowMs: 60000, max: 30 }),
    validateFormZod(providerEarningsFormSchema),
    asyncHandler(getProviderEarnings)
);

async function getProviderEarnings(
    params: AuthenticatedMWType & ProviderEarningsFormType
): Promise<ProviderEarningsResponse> {
    const { logger, actionUserCtx, company, startDate, endDate } = params;

    logger.start("Computing provider earnings...");

    const match: any = { company: company._id, status: "completed" };
    if (startDate) match.createdAt = { ...(match.createdAt ?? {}), $gte: new Date(startDate) };
    if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        match.createdAt = { ...(match.createdAt ?? {}), $lte: end };
    }

    const rows = await EscrowTransactionModel.aggregate([
        { $match: match },
        {
            $lookup: {
                from: "orders",
                localField: "order",
                foreignField: "_id",
                as: "orderDoc",
            },
        },
        { $unwind: "$orderDoc" },
        { $match: { "orderDoc.provider": new ObjectId(actionUserCtx.userId) } },
        {
            $lookup: {
                from: "currencies",
                localField: "currency",
                foreignField: "_id",
                as: "currencyDoc",
            },
        },
        { $unwind: { path: "$currencyDoc", preserveNullAndEmptyArrays: true } },
        {
            $group: {
                _id: { currency: "$currency", type: "$type", recipient: "$recipient" },
                total: { $sum: "$amount" },
                orderIds: { $addToSet: "$order" },
                symbol: { $first: "$currencyDoc.symbol" },
            },
        },
    ]);

    const byCurrency: Record<string, { released: number; fees: number; refunded: number; holds: number; settledOrders: Set<string>; heldOrders: Map<string, number>; symbol?: string }> = {};

    for (const row of rows) {
        const cid = row._id.currency?.toString() ?? "unknown";
        if (!byCurrency[cid]) {
            byCurrency[cid] = { released: 0, fees: 0, refunded: 0, holds: 0, settledOrders: new Set(), heldOrders: new Map(), symbol: row.symbol };
        }
        const bucket = byCurrency[cid];
        const orderIds: string[] = (row.orderIds ?? []).map((id: any) => id.toString());

        if (row._id.type === "release" && row._id.recipient === "provider") {
            bucket.released += row.total;
            orderIds.forEach(id => bucket.settledOrders.add(id));
        } else if (row._id.type === "fee") {
            bucket.fees += row.total;
        } else if (row._id.type === "refund") {
            bucket.refunded += row.total;
            orderIds.forEach(id => bucket.settledOrders.add(id));
        } else if (row._id.type === "hold") {
            // per-order hold totals; pending = holds on orders never settled
            bucket.holds += row.total;
            orderIds.forEach(id => bucket.heldOrders.set(id, (bucket.heldOrders.get(id) ?? 0)));
        }
    }

    // Second pass for pending holds needs per-order amounts; recompute cheaply
    const holdRows = await EscrowTransactionModel.aggregate([
        { $match: { ...match, type: "hold" } },
        {
            $lookup: {
                from: "orders",
                localField: "order",
                foreignField: "_id",
                as: "orderDoc",
            },
        },
        { $unwind: "$orderDoc" },
        { $match: { "orderDoc.provider": new ObjectId(actionUserCtx.userId) } },
        {
            $lookup: {
                from: "escrowtransactions",
                let: { orderId: "$order" },
                pipeline: [
                    {
                        $match: {
                            $expr: {
                                $and: [
                                    { $eq: ["$order", "$$orderId"] },
                                    { $in: ["$type", ["release", "refund"]] },
                                ],
                            },
                        },
                    },
                    { $limit: 1 },
                ],
                as: "settlements",
            },
        },
        { $match: { settlements: { $size: 0 } } },
        {
            $group: {
                _id: "$currency",
                pendingHolds: { $sum: "$amount" },
            },
        },
    ]);

    const pendingByCurrency: Record<string, number> = {};
    for (const row of holdRows) {
        pendingByCurrency[row._id?.toString() ?? "unknown"] = row.pendingHolds ?? 0;
    }

    logger.finish("Computed provider earnings");

    return {
        byCurrency: Object.entries(byCurrency).map(([currencyId, data]) => ({
            currencyId,
            currencySymbol: data.symbol,
            released: data.released,
            fees: data.fees,
            refunded: data.refunded,
            pendingHolds: pendingByCurrency[currencyId] ?? 0,
        })),
    };
}

export { router };
