import type {ICustomerGroupMember} from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function customerGroupMemberToSelect(member: ICustomerGroupMember): ApiSelectDatum {
    const user = member.user as any;
    const fullName = [user?.name, user?.surname].filter(Boolean).join(" ").trim();
    return {
        value: member._id.toString(),
        label: fullName || member._id.toString(),
    };
}

export function customerGroupMembersToSelect(members: ICustomerGroupMember[]): ApiSelectDatum[] {
    return members.map(customerGroupMemberToSelect);
}
