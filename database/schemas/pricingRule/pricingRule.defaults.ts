import dayjs from "dayjs";
import type {Types} from "mongoose";
import PricingRule, {type PricingRuleAppliesTo, type PricingRuleType} from "./pricingRule";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {demoName} from "@coreModule/utilities/helpers";
import type {CreateCollectionsResult} from "@eCommerceModule/database/schemas/collection/collection.defaults";
import type {CreateCustomerGroupsResult} from "@eCommerceModule/database/schemas/customerGroup/customerGroup.defaults";

export type PricingRuleSeed = {
    name: string;
    type: PricingRuleType;
    value: number;
    appliesTo: PricingRuleAppliesTo;
    groupSeedKey?: string;
    collectionSlug?: string;
    minimumOrderAmount?: number;
    priority: number;
};

export const defaultPricingRuleSeeds: readonly PricingRuleSeed[] = [
    {
        name: demoName("VIP 15% Off"),
        type: "percentage_discount",
        value: 15,
        appliesTo: "customer_group",
        groupSeedKey: "group-vip",
        priority: 10,
    },
    {
        name: demoName("Wholesale Flat €5 Off"),
        type: "fixed_discount",
        value: 5,
        appliesTo: "customer_group",
        groupSeedKey: "group-wholesale",
        minimumOrderAmount: 100,
        priority: 20,
    },
    {
        name: demoName("Digital Bundle Surcharge"),
        type: "surcharge",
        value: 2,
        appliesTo: "collection",
        collectionSlug: "digital-downloads",
        priority: 5,
    },
];

/**
 * Seeds catalog pricing rules. Idempotent on `{company, name}`.
 */
export async function createPricingRules(
    parentLogger: serverLogger,
    company: ICompany,
    groups: CreateCustomerGroupsResult,
    collections: CreateCollectionsResult,
): Promise<number> {
    const logger = getLogger("mongoDbInitialization-createPricingRules", parentLogger);
    logger.start("Creating pricing rules...");

    let count = 0;
    for (const seed of defaultPricingRuleSeeds) {
        try {
            const customerGroups: Types.ObjectId[] = [];
            const targetIds: Types.ObjectId[] = [];

            if (seed.groupSeedKey) {
                const group = groups.bySeedKey[seed.groupSeedKey];
                if (!group) {
                    logger.warn(
                        `Skipping pricing rule "${seed.name}": customer group "${seed.groupSeedKey}" was not seeded.`,
                    );
                    continue;
                }
                customerGroups.push(group._id);
            }
            if (seed.collectionSlug) {
                const collection = collections.bySlug[seed.collectionSlug];
                if (!collection) {
                    logger.warn(
                        `Skipping pricing rule "${seed.name}": collection "${seed.collectionSlug}" was not seeded.`,
                    );
                    continue;
                }
                targetIds.push(collection._id);
            }

            const payload = {
                name: seed.name,
                type: seed.type,
                value: seed.value,
                appliesTo: seed.appliesTo,
                targetIds,
                customerGroups,
                minimumOrderAmount: seed.minimumOrderAmount,
                priority: seed.priority,
                isActive: true,
                startsAt: dayjs().subtract(1, "day").toDate(),
                endsAt: dayjs().add(90, "day").toDate(),
                company: company._id,
                createdBy: company.createdBy,
            };

            let doc = await PricingRule.findOne({company: company._id, name: seed.name});
            if (!doc) {
                await PricingRule.create(payload);
            } else {
                doc.set(payload);
                await doc.save();
            }
            count += 1;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating pricing rule '${seed.name}': ${message}`);
        }
    }

    logger.finish("Finished creating pricing rules!", count);
    return count;
}
