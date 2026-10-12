import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import ProductVariant, {IProductVariant} from "@eCommerceModule/database/schemas/productVariant/productVariant";

export class ProductVariantService extends BaseCrudService<IProductVariant, typeof ProductVariant> {
    constructor() {
        super(ProductVariant, "ProductVariant");
    }
}

/** The chosen option values of a variant, e.g. "Red / XL". */
export function variantOptionsLabel(variant: {attributeCombination?: {value?: string}[]}): string {
    return (variant.attributeCombination ?? []).map(option => option.value).filter(Boolean).join(" / ");
}

export const productVariantService = new ProductVariantService();
