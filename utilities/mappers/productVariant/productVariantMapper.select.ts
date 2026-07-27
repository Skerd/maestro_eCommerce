import type {IProductVariant} from "@eCommerceModule/database/schemas/productVariant/productVariant";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

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
