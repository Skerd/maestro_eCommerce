import type {ICustomerAddress} from "@eCommerceModule/database/schemas/customerAddress/customerAddress";
import type {CustomerAddress} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/customerAddress.dto";
import type {CountrySimple} from "armonia/src/modules/core/dto/country.dto";
import type {StateSimple} from "armonia/src/modules/core/dto/state.dto";
import type {CitySimple} from "armonia/src/modules/core/dto/city.dto";
import type {SimpleBlankUser} from "armonia/src/modules/core/dto/user.dto";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {CountrySimpleSnippet} from "@coreModule/database/schemas/country/country.snippets";
import {StateSimpleSnippet} from "@coreModule/database/schemas/state/state.snippets";
import {CitySimpleSnippet} from "@coreModule/database/schemas/city/city.snippets";
import {SimpleBlankUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function customerAddressToDTO(address: ICustomerAddress): CustomerAddress {
    return {
        _id: address._id.toString(),
        customer: mapSnippet<SimpleBlankUser>()(address.customer, SimpleBlankUserSnippet),
        firstName: address.firstName,
        lastName: address.lastName,
        phone: address.phone,
        street: address.street,
        city: mapSnippet<CitySimple>()(address.city, CitySimpleSnippet),
        state: mapSnippet<StateSimple>()(address.state, StateSimpleSnippet),
        postalCode: address.postalCode,
        country: mapSnippet<CountrySimple>()(address.country, CountrySimpleSnippet),
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
