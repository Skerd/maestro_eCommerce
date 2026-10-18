import {ObjectId} from "mongodb";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import {reviewService} from "@eCommerceModule/database/schemas/review/review.service";

export type ProviderProfileMetrics = {
    averageRating?: number;
    reviewCount?: number;
    completionRate?: number;
};

export async function loadProviderProfileMetrics(
    userId: ObjectId | string | undefined,
    companyId: ObjectId,
    ctx: {logger: unknown; languageCode: string},
): Promise<ProviderProfileMetrics> {
    if (!userId) {
        return {reviewCount: 0};
    }

    const providerId = userId instanceof ObjectId ? userId : new ObjectId(userId);
    const {logger, languageCode} = ctx;

    const [reviewAgg, orderCounts] = await Promise.all([
        reviewService.aggregate(
            [
                {
                    $lookup: {
                        from: "listings",
                        localField: "listing",
                        foreignField: "_id",
                        as: "listingDoc",
                    },
                },
                {$unwind: {path: "$listingDoc", preserveNullAndEmptyArrays: true}},
                {
                    $match: {
                        "listingDoc.provider": providerId,
                        company: companyId,
                    },
                },
                {
                    $group: {
                        _id: null,
                        avgRating: {$avg: "$rating"},
                        count: {$sum: 1},
                    },
                },
            ],
            {logger, languageCode},
        ),
        orderService.aggregate(
            [
                {
                    $match: {
                        provider: providerId,
                        company: companyId,
                        status: {$in: ["completed", "cancelled"]},
                    },
                },
                {
                    $group: {
                        _id: "$status",
                        count: {$sum: 1},
                    },
                },
            ],
            {logger, languageCode},
        ),
    ]);

    const reviewStats = reviewAgg[0];
    const completedCount = orderCounts.find((r: {_id: string; count: number}) => r._id === "completed")?.count ?? 0;
    const cancelledCount = orderCounts.find((r: {_id: string; count: number}) => r._id === "cancelled")?.count ?? 0;
    const totalRelevant = completedCount + cancelledCount;
    const completionRate = totalRelevant > 0 ? Math.round((completedCount / totalRelevant) * 100) : undefined;

    return {
        averageRating: reviewStats?.avgRating
            ? Math.round(reviewStats.avgRating * 10) / 10
            : undefined,
        reviewCount: reviewStats?.count ?? 0,
        completionRate,
    };
}
