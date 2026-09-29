import type {ICustomerGroupMember} from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember";
import type {CustomerGroupMember} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroupMember/customerGroupMember.dto";
import type {SimpleUser} from "armonia/src/modules/core/dto/user.dto";
import type {CustomerGroupSimple} from "armonia/src/modules/eCommerce/dto/customerGroup.dto";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {CustomerGroupSimpleSnippet} from "@eCommerceModule/database/schemas/customerGroup/customerGroup.snippets";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function customerGroupMemberToDTO(member: ICustomerGroupMember): CustomerGroupMember {
    return {
        _id: member._id.toString(),
        user: mapSnippet<SimpleUser>()(member.user, SimpleUserSnippet)!,
        customerGroup: mapSnippet<CustomerGroupSimple>()(member.customerGroup, CustomerGroupSimpleSnippet)!,
        ...mapSoftDeleteToDTO(member),
        ...mapOwnershipToDTO(member),
        ...mapLifeCycleToDTO(member),
    };
}

export function customerGroupMembersToDTO(members: ICustomerGroupMember[]): CustomerGroupMember[] {
    return members.map(customerGroupMemberToDTO);
}
