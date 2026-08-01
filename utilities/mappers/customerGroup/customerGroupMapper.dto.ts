import type {ICustomerGroup} from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import type {CustomerGroup} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroup/customerGroup.dto";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function customerGroupToDTO(group: ICustomerGroup): CustomerGroup {
    return {
        _id: group._id.toString(),
        name: group.name,
        description: group.description,
        memberCount: group.memberCount,
        isDefault: group.isDefault,
        ...mapSoftDeleteToDTO(group),
        ...mapOwnershipToDTO(group),
        ...mapLifeCycleToDTO(group),
    };
}

export function customerGroupsToDTO(groups: ICustomerGroup[]): CustomerGroup[] {
    return groups.map(customerGroupToDTO);
}
