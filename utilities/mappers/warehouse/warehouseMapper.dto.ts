import type {IWarehouse} from "@eCommerceModule/database/schemas/warehouse/warehouse";
import type {Warehouse} from "armonia/src/modules/eCommerce/api/eCommerce/private/warehouse/warehouse.dto";
import {mapPopulatedRef} from "@coreModule/utilities/mappers/common.mapper";
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
            country: mapPopulatedRef(warehouse.address.country),
            state: mapPopulatedRef(warehouse.address.state),
            city: mapPopulatedRef(warehouse.address.city),
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
