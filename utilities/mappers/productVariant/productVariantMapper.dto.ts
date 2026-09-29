import type {IProductVariant} from "@eCommerceModule/database/schemas/productVariant/productVariant";
import type {ProductVariant} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/productVariant.dto";
import type {CurrencySimple} from "armonia/src/modules/core/dto/currency.dto";
import type {ProductSimple} from "armonia/src/modules/eCommerce/dto/product.dto";
import type {ProductAttributeSimple} from "armonia/src/modules/eCommerce/dto/productAttribute.dto";
import {mapMedia, mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductAttributeSimpleSnippet} from "@eCommerceModule/database/schemas/productAttribute/productAttribute.snippets";
import {
    mapLifeCycleToDTO,
    mapOwnershipToDTO,
    mapSoftDeleteToDTO,
} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

export function productVariantToDTO(variant: IProductVariant): ProductVariant {
    return {
        _id: variant._id.toString(),
        product: mapSnippet<ProductSimple>()(variant.product, ProductSimpleSnippet)!,
        sku: variant.sku,
        barcode: variant.barcode,
        attributeCombination: (variant.attributeCombination ?? []).map((ac) => ({
            attribute: mapSnippet<ProductAttributeSimple>()(ac.attribute, ProductAttributeSimpleSnippet)!,
            value: ac.value,
        })),
        price: variant.price,
        compareAtPrice: variant.compareAtPrice,
        costPrice: variant.costPrice,
        currency: mapSnippet<CurrencySimple>()(variant.currency, CurrencySimpleSnippet),
        weight: variant.weight,
        dimensions: variant.dimensions,
        mainImage: variant.mainImage ? mapMedia(variant.mainImage) : undefined,
        position: variant.position,
        status: variant.status,
        trackInventory: variant.trackInventory,
        ...mapSoftDeleteToDTO(variant),
        ...mapOwnershipToDTO(variant),
        ...mapLifeCycleToDTO(variant),
    };
}

export function productVariantsToDTO(variants: IProductVariant[]): ProductVariant[] {
    return variants.map(productVariantToDTO);
}
