import type {ICustomerAddress} from "@eCommerceModule/database/schemas/customerAddress/customerAddress";
import type {CustomerAddress} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/customerAddress.dto";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function customerAddressToDTO(address: ICustomerAddress): CustomerAddress {
    const country = address.country as any;
    return {
        _id: address._id.toString(),
        firstName: address.firstName,
        lastName: address.lastName,
        phone: address.phone,
        street: address.street,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: country ? {_id: country._id?.toString() ?? country.toString(), name: country.name, code: country.code} : undefined,
        isDefault: address.isDefault,
        label: address.label,
        company: address.company ? {_id: address.company._id.toString(), name: address.company.name} : undefined,
        ...mapSoftDeleteToDTO(address),
        ...mapOwnershipToDTO(address),
    };
}

export function customerAddressesToDTO(addresses: ICustomerAddress[]): CustomerAddress[] {
    return addresses.map(customerAddressToDTO);
}
