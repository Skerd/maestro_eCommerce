import type {ICustomerGroup} from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import type {CustomerGroup} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroup/customerGroup.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function customerGroupToDTO(group: ICustomerGroup): CustomerGroup {
    return {
        _id: group._id.toString(),
        name: group.name,
        description: group.description,
        memberCount: group.memberCount,
        isDefault: group.isDefault,
        company: group.company ? {_id: group.company._id.toString(), name: group.company.name} : undefined,
        ...mapSoftDeleteToDTO(group),
        ...mapOwnershipToDTO(group),
    };
}

export function customerGroupsToDTO(groups: ICustomerGroup[]): CustomerGroup[] {
    return groups.map(customerGroupToDTO);
}

export function customerGroupToSelect(group: ICustomerGroup): ApiSelectDatum {
    return {value: group._id.toString(), label: group.name};
}

export function customerGroupsToSelect(groups: ICustomerGroup[]): ApiSelectDatum[] {
    return groups.map(customerGroupToSelect);
}
