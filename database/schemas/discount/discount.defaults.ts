import dayjs from "dayjs";
import type {Types} from "mongoose";
import Discount, {type DiscountAppliesTo, type DiscountType} from "./discount";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import type {CreateCollectionsResult} from "@eCommerceModule/database/schemas/collection/collection.defaults";

export type DiscountSeed = {
    title: string;
    code: string;
    type: DiscountType;
    value: number;
    appliesTo: DiscountAppliesTo;
    collectionSlug?: string;
    minimumOrderAmount?: number;
};

export const defaultDiscountSeeds: readonly DiscountSeed[] = [
    {
        title: "Welcome 10%",
        code: "WELCOME10",
        type: "percentage",
        value: 10,
        appliesTo: "order",
        minimumOrderAmount: 40,
    },
    {
        title: "Merch €5 Off",
        code: "MERCH5",
        type: "fixed",
        value: 5,
        appliesTo: "collection",
        collectionSlug: "featured",
    },
    {
        title: "Free Shipping Weekend",
        code: "FREESHIP",
        type: "free_shipping",
        value: 0,
        appliesTo: "order",
        minimumOrderAmount: 60,
    },
];

/**
 * Seeds promo codes. Idempotent on `{company, code}`.
 */
export async function createDiscounts(
    parentLogger: serverLogger,
    company: ICompany,
    collections: CreateCollectionsResult,
): Promise<number> {
    const logger = getLogger("mongoDbInitialization-createDiscounts", parentLogger);
    logger.start("Creating discounts...");

    let count = 0;
    for (const seed of defaultDiscountSeeds) {
        try {
            let targetIds: Types.ObjectId[] = [];
            if (seed.collectionSlug) {
                const collection = collections.bySlug[seed.collectionSlug];
                if (!collection) {
                    logger.warn(
                        `Skipping discount "${seed.code}": collection "${seed.collectionSlug}" was not seeded.`,
                    );
                    continue;
                }
                targetIds = [collection._id];
            }

            const payload = {
                type: seed.type,
                title: seed.title,
                code: seed.code,
                value: seed.value,
                appliesTo: seed.appliesTo,
                targetIds,
                minimumOrderAmount: seed.minimumOrderAmount,
                usageLimit: 500,
                usageLimitPerCustomer: 3,
                usageCount: 0,
                isActive: true,
                startsAt: dayjs().subtract(3, "day").toDate(),
                endsAt: dayjs().add(60, "day").toDate(),
                company: company._id,
                createdBy: company.createdBy,
            };

            let doc = await Discount.findOne({company: company._id, code: seed.code});
            if (!doc) {
                await Discount.create(payload);
            } else {
                doc.set(payload);
                await doc.save();
            }
            count += 1;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating discount '${seed.code}': ${message}`);
        }
    }

    logger.finish("Finished creating discounts!", count);
    return count;
}
