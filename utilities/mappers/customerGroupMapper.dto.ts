import type {ICustomerGroup} from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import type {CustomerGroup} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroup/customerGroup.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapCompanyLabel(company: any): {_id: string; name: string} | undefined {
    if (!company) return undefined;
    if (typeof company === "object" && company._id) {
        return {_id: company._id.toString(), name: company.name ?? ""};
    }
    return {_id: company.toString(), name: ""};
}

export function customerGroupToDTO(group: ICustomerGroup): CustomerGroup {
    return {
        _id: group._id.toString(),
        name: group.name,
        description: group.description,
        memberCount: group.memberCount,
        isDefault: group.isDefault,
        company: mapCompanyLabel(group.company),
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
