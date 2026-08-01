import type {ICustomerAddress} from "@eCommerceModule/database/schemas/customerAddress/customerAddress";
import type {CustomerAddress} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/customerAddress.dto";
import {mapPopulatedRef, mapPopulatedSimpleUser} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function customerAddressToDTO(address: ICustomerAddress): CustomerAddress {
    return {
        _id: address._id.toString(),
        customer: mapPopulatedSimpleUser(address.customer),
        firstName: address.firstName,
        lastName: address.lastName,
        phone: address.phone,
        street: address.street,
        city: mapPopulatedRef(address.city),
        state: mapPopulatedRef(address.state),
        postalCode: address.postalCode,
        country: mapPopulatedRef(address.country),
        latitude: address.latitude,
        longitude: address.longitude,
        isDefault: address.isDefault,
        label: address.label,
        ...mapSoftDeleteToDTO(address),
        ...mapOwnershipToDTO(address),
        ...mapLifeCycleToDTO(address),
    };
}

export function customerAddressesToDTO(addresses: ICustomerAddress[]): CustomerAddress[] {
    return addresses.map(customerAddressToDTO);
}
