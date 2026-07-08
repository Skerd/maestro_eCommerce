import {Schema} from "mongoose";

export function applyProductVariantIndexes(ProductVariantSchema: Schema): void {
    ProductVariantSchema.index({product: 1, position: 1});
    ProductVariantSchema.index({product: 1, status: 1});
    ProductVariantSchema.index({company: 1, sku: 1}, {sparse: true});
    ProductVariantSchema.index({company: 1, barcode: 1}, {sparse: true});
}
