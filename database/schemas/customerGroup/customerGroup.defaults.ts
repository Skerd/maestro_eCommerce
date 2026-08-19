import type {HydratedDocument} from "mongoose";
import CustomerGroup, {type ICustomerGroup} from "./customerGroup";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";

export type CustomerGroupSeed = {
    seedKey: string;
    name: string;
    description: string;
    isDefault: boolean;
};

export const defaultCustomerGroupSeeds: readonly CustomerGroupSeed[] = [
    {seedKey: "group-vip", name: "VIP Customers", description: "High-value repeat buyers for pricing demos.", isDefault: false},
    {seedKey: "group-wholesale", name: "Wholesale", description: "B2B wholesale pricing tier.", isDefault: false},
    {seedKey: "group-retail", name: "Retail", description: "Default retail shoppers.", isDefault: true},
];

export type CreateCustomerGroupsResult = {
    bySeedKey: Record<string, HydratedDocument<ICustomerGroup>>;
    byName: Record<string, HydratedDocument<ICustomerGroup>>;
};

/**
 * Seeds VIP / Wholesale / Retail. Idempotent on `{company, name}`.
 * `memberCount` is immutable — left to `CustomerGroup.syncMemberCount` after members land.
 */
export async function createCustomerGroups(
    parentLogger: serverLogger,
    company: ICompany,
): Promise<CreateCustomerGroupsResult> {
    const logger = getLogger("mongoDbInitialization-createCustomerGroups", parentLogger);
    logger.start("Creating customer groups...");

    const bySeedKey: Record<string, HydratedDocument<ICustomerGroup>> = {};
    const byName: Record<string, HydratedDocument<ICustomerGroup>> = {};

    for (const seed of defaultCustomerGroupSeeds) {
        try {
            const payload = {
                name: seed.name,
                description: seed.description,
                isDefault: seed.isDefault,
                company: company._id,
                createdBy: company.createdBy,
            };

            let doc = await CustomerGroup.findOne({company: company._id, name: seed.name});
            if (!doc) {
                doc = await CustomerGroup.create(payload);
            } else {
                doc.set(payload);
                await doc.save();
            }
            bySeedKey[seed.seedKey] = doc;
            byName[seed.name] = doc;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating customer group '${seed.seedKey}': ${message}`);
        }
    }

    logger.finish("Finished creating customer groups!", Object.keys(bySeedKey).length);
    return {bySeedKey, byName};
}
