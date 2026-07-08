import type {ICustomerGroupMember} from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember";
import type {CustomerGroupMember} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroupMember/customerGroupMember.dto";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function customerGroupMemberToDTO(member: ICustomerGroupMember): CustomerGroupMember {
    const user = member.user as any;
    const group = member.customerGroup as any;
    return {
        _id: member._id.toString(),
        user: {
            _id: user?._id?.toString() ?? user?.toString() ?? "",
            name: user?.name ?? "",
            surname: user?.surname ?? "",
            email: user?.email,
        },
        customerGroup: {
            _id: group?._id?.toString() ?? group?.toString() ?? "",
            name: group?.name ?? "",
        },
        ...mapSoftDeleteToDTO(member),
        ...mapOwnershipToDTO(member),
        createdAt: member.createdAt?.toISOString?.(),
    };
}

export function customerGroupMembersToDTO(members: ICustomerGroupMember[]): CustomerGroupMember[] {
    return members.map(customerGroupMemberToDTO);
}
