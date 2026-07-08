import type {IWarehouse} from "@eCommerceModule/database/schemas/warehouse/warehouse";
import type {Warehouse} from "armonia/src/modules/eCommerce/api/eCommerce/private/warehouse/warehouse.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapPopulatedRef(ref: any): {_id: string; name: string} | undefined {
    if (!ref) return undefined;
    return {_id: ref?._id?.toString() ?? ref?.toString() ?? "", name: ref?.name ?? ""};
}

export function warehouseToDTO(warehouse: IWarehouse): Warehouse {
    const addr = warehouse.address;
    return {
        _id: warehouse._id.toString(),
        name: warehouse.name,
        code: warehouse.code,
        address: addr ? {
            country: mapPopulatedRef((addr as any).country),
            state: mapPopulatedRef((addr as any).state),
            city: mapPopulatedRef((addr as any).city),
            street: (addr as any).street,
            postalCode: (addr as any).postalCode,
        } : undefined,
        isDefault: warehouse.isDefault,
        isActive: warehouse.isActive,
        company: warehouse.company ? {_id: warehouse.company._id.toString(), name: warehouse.company.name} : undefined,
        ...mapSoftDeleteToDTO(warehouse),
        ...mapOwnershipToDTO(warehouse),
    };
}

export function warehousesToDTO(warehouses: IWarehouse[]): Warehouse[] {
    return warehouses.map(warehouseToDTO);
}

export function warehouseToSelect(warehouse: IWarehouse): ApiSelectDatum {
    return {value: warehouse._id.toString(), label: `${warehouse.name} (${warehouse.code})`};
}

export function warehousesToSelect(warehouses: IWarehouse[]): ApiSelectDatum[] {
    return warehouses.map(warehouseToSelect);
}
