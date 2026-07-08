import type {IProductAttribute} from "@eCommerceModule/database/schemas/productAttribute/productAttribute";
import type {ProductAttribute} from "armonia/src/modules/eCommerce/api/eCommerce/private/productAttribute/productAttribute.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function productAttributeToDTO(attr: IProductAttribute): ProductAttribute {
    return {
        _id: attr._id.toString(),
        name: attr.name,
        values: attr.values ?? [],
        isVisibleOnProductPage: attr.isVisibleOnProductPage,
        isUsedForVariants: attr.isUsedForVariants,
        position: attr.position,
        valueCount: (attr.values ?? []).length,
        company: attr.company ? {_id: attr.company._id.toString(), name: attr.company.name} : undefined,
        ...mapSoftDeleteToDTO(attr),
        ...mapOwnershipToDTO(attr),
    };
}

export function productAttributesToDTO(attrs: IProductAttribute[]): ProductAttribute[] {
    return attrs.map(productAttributeToDTO);
}

export function productAttributeToSelect(attr: IProductAttribute): ApiSelectDatum {
    return {value: attr._id.toString(), label: attr.name};
}

export function productAttributesToSelect(attrs: IProductAttribute[]): ApiSelectDatum[] {
    return attrs.map(productAttributeToSelect);
}
