import type {IWarehouse} from "@eCommerceModule/database/schemas/warehouse/warehouse";
import type {Warehouse} from "armonia/src/modules/eCommerce/api/eCommerce/private/warehouse/warehouse.dto";
import type {CountrySimple} from "armonia/src/modules/core/dto/country.dto";
import type {StateSimple} from "armonia/src/modules/core/dto/state.dto";
import type {CitySimple} from "armonia/src/modules/core/dto/city.dto";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {CountrySimpleSnippet} from "@coreModule/database/schemas/country/country.snippets";
import {StateSimpleSnippet} from "@coreModule/database/schemas/state/state.snippets";
import {CitySimpleSnippet} from "@coreModule/database/schemas/city/city.snippets";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function warehouseToDTO(warehouse: IWarehouse): Warehouse {
    return {
        _id: warehouse._id.toString(),
        name: warehouse.name,
        code: warehouse.code,
        address: warehouse.address ? {
            country: mapSnippet<CountrySimple>()(warehouse.address.country, CountrySimpleSnippet),
            state: mapSnippet<StateSimple>()(warehouse.address.state, StateSimpleSnippet),
            city: mapSnippet<CitySimple>()(warehouse.address.city, CitySimpleSnippet),
            street: warehouse.address.street,
            postalCode: warehouse.address.postalCode,
            latitude: warehouse.address.latitude,
            longitude: warehouse.address.longitude,
        } : undefined,
        isDefault: warehouse.isDefault,
        isActive: warehouse.isActive,
        ...mapSoftDeleteToDTO(warehouse),
        ...mapOwnershipToDTO(warehouse),
        ...mapLifeCycleToDTO(warehouse),
    };
}

export function warehousesToDTO(warehouses: IWarehouse[]): Warehouse[] {
    return warehouses.map(warehouseToDTO);
}
