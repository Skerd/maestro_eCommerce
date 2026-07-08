import type {IProductVariant} from "@eCommerceModule/database/schemas/productVariant/productVariant";
import type {ProductVariant} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/productVariant.dto";
import {mapMedia, mapPopulatedSimpleCurrency} from "@coreModule/utilities/mappers/common.mapper";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

function mapProductRef(ref: any): {_id: string; title: string; slug: string} {
    return {
        _id: ref?._id?.toString() ?? String(ref ?? ""),
        title: ref?.title ?? "",
        slug: ref?.slug ?? "",
    };
}

export function productVariantToDTO(variant: IProductVariant): ProductVariant {
    return {
        _id: variant._id.toString(),
        product: mapProductRef(variant.product),
        sku: variant.sku,
        barcode: variant.barcode,
        attributeCombination: variant.attributeCombination?.map((ac: any) => ({
            attribute: {
                _id: ac.attribute?._id?.toString() ?? ac.attribute?.toString() ?? "",
                name: ac.attribute?.name ?? "",
            },
            value: ac.value,
        })),
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        costPrice: variant.costPrice,
        currency: mapPopulatedSimpleCurrency(variant.currency as any),
        weight: variant.weight,
        dimensions: variant.dimensions,
        mainImage: variant.mainImage ? mapMedia(variant.mainImage) : undefined,
        position: variant.position,
        status: variant.status,
        trackInventory: variant.trackInventory,
        company: variant.company ? {_id: variant.company._id.toString(), name: variant.company.name} : undefined,
        ...mapSoftDeleteToDTO(variant),
        ...mapOwnershipToDTO(variant),
    };
}

export function productVariantsToDTO(variants: IProductVariant[]): ProductVariant[] {
    return variants.map(productVariantToDTO);
}

function variantLabel(variant: IProductVariant): string {
    if (variant.sku) return variant.sku;
    const combo = variant.attributeCombination?.map((ac: any) => ac.value).filter(Boolean).join(" / ");
    return combo || variant._id.toString();
}

export function productVariantToSelect(variant: IProductVariant): ApiSelectDatum {
    return {value: variant._id.toString(), label: variantLabel(variant)};
}

export function productVariantsToSelect(variants: IProductVariant[]): ApiSelectDatum[] {
    return variants.map(productVariantToSelect);
}
