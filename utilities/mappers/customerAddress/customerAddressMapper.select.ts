import type {ICustomerAddress} from "@eCommerceModule/database/schemas/customerAddress/customerAddress";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function customerAddressToSelect(address: ICustomerAddress): ApiSelectDatum {
    return {
        value: address._id.toString(),
        label: `${address.firstName} ${address.lastName}${address.city?.name ? ` — ${address.city?.name}` : ""}`,
    };
}

export function customerAddressesToSelect(addresses: ICustomerAddress[]): ApiSelectDatum[] {
    return addresses.map(customerAddressToSelect);
}
