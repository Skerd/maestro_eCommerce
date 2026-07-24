import type {IWarehouse} from "@eCommerceModule/database/schemas/warehouse/warehouse";
import type {Warehouse} from "armonia/src/modules/eCommerce/api/eCommerce/private/warehouse/warehouse.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapPopulatedRef(ref: any): {_id: string; name: string} | undefined {
    if (!ref) return undefined;
    return {_id: ref?._id?.toString() ?? ref?.toString() ?? "", name: ref?.name ?? ""};
}

function mapCompanyLabel(company: any): {_id: string; name: string} | undefined {
    if (!company) return undefined;
    if (typeof company === "object" && company._id) {
        return {_id: company._id.toString(), name: company.name ?? ""};
    }
    return {_id: company.toString(), name: ""};
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
        company: mapCompanyLabel(warehouse.company),
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
