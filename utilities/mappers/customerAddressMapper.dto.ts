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

function mapUserLabel(user: any): {_id: string; name?: string; surname?: string} | undefined {
    if (!user) return undefined;
    if (typeof user === "object" && user._id) {
        return {_id: user._id.toString(), name: user.name, surname: user.surname};
    }
    return {_id: user.toString()};
}

function toIso(value: unknown): string | undefined {
    if (!value) return undefined;
    if (value instanceof Date) return value.toISOString();
    if (typeof value === "string") return value;
    const d = new Date(value as any);
    return Number.isNaN(d.getTime()) ? undefined : d.toISOString();
}

export function customerAddressToDTO(address: ICustomerAddress): CustomerAddress {
    const country = address.country as any;
    return {
        _id: address._id.toString(),
        user: mapUserLabel(address.user),
        firstName: address.firstName,
        lastName: address.lastName,
        phone: address.phone,
        street: address.street,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: country
            ? {_id: country._id?.toString() ?? country.toString(), name: country.name, code: country.code}
            : undefined,
        latitude: address.latitude,
        longitude: address.longitude,
        isDefault: address.isDefault,
        label: address.label,
        company: mapCompanyLabel(address.company),
        createdAt: toIso((address as any).createdAt),
        updatedAt: toIso((address as any).updatedAt),
        ...mapSoftDeleteToDTO(address),
        ...mapOwnershipToDTO(address),
    };
}

export function customerAddressesToDTO(addresses: ICustomerAddress[]): CustomerAddress[] {
    return addresses.map(customerAddressToDTO);
}
