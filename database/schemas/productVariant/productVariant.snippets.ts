import type {ProductVariantSimple} from "armonia/src/modules/eCommerce/dto/productVariant.dto";
import type {IProductVariant} from "@eCommerceModule/database/schemas/productVariant/productVariant";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const ProductVariantSimpleSnippet = defineSnippet<IProductVariant, ProductVariantSimple>()({
    keys: {
        _id: {},
        sku: {},
        attributeCombination: {},
        price: {},
        status: {},
    },
});
