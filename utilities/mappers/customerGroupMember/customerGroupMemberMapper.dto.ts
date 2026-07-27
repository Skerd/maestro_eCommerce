import type {ICustomerGroupMember} from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember";
import type {CustomerGroupMember} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroupMember/customerGroupMember.dto";
import {mapPopulatedRef, mapPopulatedUserWithPhoto} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function customerGroupMemberToDTO(member: ICustomerGroupMember): CustomerGroupMember {
    return {
        _id: member._id.toString(),
        user: mapPopulatedUserWithPhoto(member.user) ?? {_id: "", name: "", surname: ""},
        customerGroup: mapPopulatedRef(member.customerGroup as any) ?? {_id: "", name: ""},
        ...mapSoftDeleteToDTO(member),
        ...mapOwnershipToDTO(member),
        ...mapLifeCycleToDTO(member),
    };
}

export function customerGroupMembersToDTO(members: ICustomerGroupMember[]): CustomerGroupMember[] {
    return members.map(customerGroupMemberToDTO);
}
