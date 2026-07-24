import type {ICustomerAddress} from "@eCommerceModule/database/schemas/customerAddress/customerAddress";
import type {CustomerAddress} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/customerAddress.dto";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapCompanyLabel(company: any): {_id: string; name: string} | undefined {
    if (!company) return undefined;
    if (typeof company === "object" && company._id) {
        return {_id: company._id.toString(), name: company.name ?? ""};
    }
    return {_id: company.toString(), name: ""};
}

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
        company: mapCompanyLabel(address.company),
        ...mapSoftDeleteToDTO(address),
        ...mapOwnershipToDTO(address),
    };
}

export function customerAddressesToDTO(addresses: ICustomerAddress[]): CustomerAddress[] {
    return addresses.map(customerAddressToDTO);
}
