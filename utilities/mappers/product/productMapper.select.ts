import type {IProduct} from "@eCommerceModule/database/schemas/product/product";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function productToSelect(product: IProduct): ApiSelectDatum {
    return {
        value: product._id.toString(), 
        label: product.title
    };
}

export function productsToSelect(products: IProduct[]): ApiSelectDatum[] {
    return products.map(productToSelect);
}
