import type {IProductAttribute} from "@eCommerceModule/database/schemas/productAttribute/productAttribute";
import type {ProductAttribute} from "armonia/src/modules/eCommerce/api/eCommerce/private/productAttribute/productAttribute.dto";
import {mapPopulatedRef} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function productAttributeToDTO(attr: IProductAttribute): ProductAttribute {
    const values = attr.values ?? [];
    return {
        _id: attr._id.toString(),
        name: attr.name,
        values,
        isVisibleOnProductPage: attr.isVisibleOnProductPage,
        isUsedForVariants: attr.isUsedForVariants,
        position: attr.position,
        valueCount: values.length,
        company: mapPopulatedRef(attr.company as any),
        ...mapSoftDeleteToDTO(attr),
        ...mapOwnershipToDTO(attr),
        ...mapLifeCycleToDTO(attr),
    };
}

export function productAttributesToDTO(attrs: IProductAttribute[]): ProductAttribute[] {
    return attrs.map(productAttributeToDTO);
}
