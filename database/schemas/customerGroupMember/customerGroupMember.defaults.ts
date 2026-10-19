import type {Types} from "mongoose";
import CustomerGroup from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import CustomerGroupMember from "./customerGroupMember";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import type {CreateCustomerGroupsResult} from "@eCommerceModule/database/schemas/customerGroup/customerGroup.defaults";

/**
 * Adds the demo user to VIP and Wholesale.
 * Idempotent on `{company, customerGroup, user}`.
 */
export async function createCustomerGroupMembers(
    parentLogger: serverLogger,
    company: ICompany,
    groups: CreateCustomerGroupsResult,
    userId: Types.ObjectId,
): Promise<number> {
    const logger = getLogger("mongoDbInitialization-createCustomerGroupMembers", parentLogger);
    logger.start("Creating customer group members...");

    const vipGroup = groups.bySeedKey["group-vip"];
    const wholesaleGroup = groups.bySeedKey["group-wholesale"];
    let created = 0;

    for (const [i, group] of [vipGroup, wholesaleGroup].entries()) {
        if (!group) {
            logger.warn(`Skipping customer group member ${i}: target group was not seeded.`);
            continue;
        }
        try {
            const existing = await CustomerGroupMember.findOne({
                company: company._id,
                customerGroup: group._id,
                user: userId,
            });
            if (!existing) {
                await CustomerGroupMember.create({
                    customerGroup: group._id,
                    user: userId,
                    company: company._id,
                    createdBy: company.createdBy,
                });
                created += 1;
            }
            await CustomerGroup.syncMemberCount(group._id, company._id);
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating customer group member ${i}: ${message}`);
        }
    }

    logger.finish("Finished creating customer group members!", created);
    return created;
}
