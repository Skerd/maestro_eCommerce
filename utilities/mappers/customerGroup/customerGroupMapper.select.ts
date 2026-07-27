import type {ICustomerGroup} from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function customerGroupsToSelect(groups: ICustomerGroup[]): ApiSelectDatum[] {
    return groups.map((c) => ({
        value: c._id.toString(),
        label: c.name,
    }));
}
