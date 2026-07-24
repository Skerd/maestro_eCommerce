import type {IProductAttribute} from "@eCommerceModule/database/schemas/productAttribute/productAttribute";
import type {ProductAttribute} from "armonia/src/modules/eCommerce/api/eCommerce/private/productAttribute/productAttribute.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapCompanyLabel(company: any): {_id: string; name: string} | undefined {
    if (!company) return undefined;
    if (typeof company === "object" && company._id) {
        return {_id: company._id.toString(), name: company.name ?? ""};
    }
    return {_id: company.toString(), name: ""};
}

export function productAttributeToDTO(attr: IProductAttribute): ProductAttribute {
    return {
        _id: attr._id.toString(),
        name: attr.name,
        values: attr.values ?? [],
        isVisibleOnProductPage: attr.isVisibleOnProductPage,
        isUsedForVariants: attr.isUsedForVariants,
        position: attr.position,
        valueCount: (attr.values ?? []).length,
        company: mapCompanyLabel(attr.company),
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
