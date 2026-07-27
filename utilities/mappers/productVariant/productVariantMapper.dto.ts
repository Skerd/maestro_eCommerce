import type {IProductVariant} from "@eCommerceModule/database/schemas/productVariant/productVariant";
import type {ProductVariant} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/productVariant.dto";
import type {ProductSimpleRef} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.dto";
import {mapMedia, mapPopulatedRef, mapPopulatedSimpleCurrency} from "@coreModule/utilities/mappers/common.mapper";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapProductRef(ref: any): ProductSimpleRef {
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
        attributeCombination: (variant.attributeCombination ?? []).map((ac: any) => ({
            attribute: mapPopulatedRef(ac.attribute) ?? {_id: "", name: ""},
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
        company: mapPopulatedRef(variant.company as any),
        ...mapSoftDeleteToDTO(variant),
        ...mapOwnershipToDTO(variant),
        ...mapLifeCycleToDTO(variant),
    };
}

export function productVariantsToDTO(variants: IProductVariant[]): ProductVariant[] {
    return variants.map(productVariantToDTO);
}
