import type {ClientSession, Types} from "mongoose";
import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import CustomerGroupMember, {ICustomerGroupMember} from "./customerGroupMember";

export class CustomerGroupMemberService extends BaseCrudService<ICustomerGroupMember, typeof CustomerGroupMember> {
    constructor() {
        super(CustomerGroupMember, "CustomerGroupMember");
    }

    /**
     * Brings back the members a group's own delete removed (deleted by `deletedBy` within `deletedWithGroup`),
     * except users re-added since, who keep their live row.
     */
    async restoreDeletedWithGroup(
        filter: {customerGroup: Types.ObjectId; company: Types.ObjectId},
        deletedBy: unknown,
        deletedWithGroup: {$gte: Date; $lte: Date},
        session: ClientSession | undefined,
    ): Promise<void> {
        const liveUsers = await CustomerGroupMember.distinct("user", {...filter, deletedAt: null}).session(session ?? null);
        await CustomerGroupMember.updateMany(
            {...filter, deletedBy, deletedAt: deletedWithGroup, user: {$nin: liveUsers}},
            {$set: {deletedAt: null, deletedBy: null}},
            {session},
        );
    }
}

export const customerGroupMemberService = new CustomerGroupMemberService();
