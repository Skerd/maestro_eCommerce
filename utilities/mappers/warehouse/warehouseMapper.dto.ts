import type {IWarehouse} from "@eCommerceModule/database/schemas/warehouse/warehouse";
import type {Warehouse} from "armonia/src/modules/eCommerce/api/eCommerce/private/warehouse/warehouse.dto";
import {mapPopulatedRef} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function warehouseToDTO(warehouse: IWarehouse): Warehouse {
    const addr = warehouse.address as any;
    return {
        _id: warehouse._id.toString(),
        name: warehouse.name,
        code: warehouse.code,
        address: addr ? {
              country: mapPopulatedRef(addr.country),
              state: mapPopulatedRef(addr.state),
              city: mapPopulatedRef(addr.city),
              street: addr.street,
              postalCode: addr.postalCode,
              latitude: addr.latitude,
              longitude: addr.longitude,
          } : undefined,
        isDefault: warehouse.isDefault,
        isActive: warehouse.isActive,
        company: mapPopulatedRef(warehouse.company),
        ...mapSoftDeleteToDTO(warehouse),
        ...mapOwnershipToDTO(warehouse),
        ...mapLifeCycleToDTO(warehouse),
    };
}

export function warehousesToDTO(warehouses: IWarehouse[]): Warehouse[] {
    return warehouses.map(warehouseToDTO);
}
