import type {ProductAttributeSimple} from "armonia/src/modules/eCommerce/dto/productAttribute.dto";
import type {IProductAttribute} from "@eCommerceModule/database/schemas/productAttribute/productAttribute";
import {defineSnippet} from "@coreModule/database/utilities/snippet";

export const ProductAttributeSimpleSnippet = defineSnippet<IProductAttribute, ProductAttributeSimple>()({
    keys: {
        _id: {},
        name: {},
        values: {},
    },
});
