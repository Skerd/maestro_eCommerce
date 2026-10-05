import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductVariant, {type IProductVariant} from "./productVariant";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import type {CreateProductsResult} from "@eCommerceModule/database/schemas/product/product.defaults";
import type {CreateProductAttributesResult} from "@eCommerceModule/database/schemas/productAttribute/productAttribute.defaults";

export type ProductVariantSeed = {
    size: string;
    color: string;
    price: number;
    stock: number;
};

export const defaultProductVariantSeeds: readonly ProductVariantSeed[] = [
    {size: "S", color: "Black", price: 29.9, stock: 12},
    {size: "M", color: "Black", price: 29.9, stock: 20},
    {size: "L", color: "Black", price: 29.9, stock: 15},
    {size: "M", color: "White", price: 29.9, stock: 8},
    {size: "L", color: "Navy", price: 32.9, stock: 6},
    {size: "XL", color: "Navy", price: 32.9, stock: 3},
];

export function variantSku(size: string, color: string): string {
    return `PRX-TEE-${size}-${color.slice(0, 3).toUpperCase()}`;
}

export type CreateProductVariantsResult = {
    variantIds: Types.ObjectId[];
    bySku: Record<string, HydratedDocument<IProductVariant>>;
};

/**
 * Seeds Size×Color variants for the brand tee. Idempotent on `{company, sku}`.
 */
export async function createProductVariants(
    parentLogger: serverLogger,
    company: ICompany,
    currencyId: Types.ObjectId,
    products: CreateProductsResult,
    attributes: CreateProductAttributesResult,
): Promise<CreateProductVariantsResult> {
    const logger = getLogger("mongoDbInitialization-createProductVariants", parentLogger);
    logger.start("Creating product variants...");

    const variableProduct = products.bySeedKey["prod-01-brand-tee"];
    const attrSize = attributes.byName["Size"];
    const attrColor = attributes.byName["Color"];

    if (!variableProduct) {
        logger.warn("Skipping product variants: product \"prod-01-brand-tee\" was not seeded.");
        logger.finish("Finished creating product variants!", 0);
        return {variantIds: [], bySku: {}};
    }
    if (!attrSize || !attrColor) {
        logger.warn("Skipping product variants: Size/Color attributes were not seeded.");
        logger.finish("Finished creating product variants!", 0);
        return {variantIds: [], bySku: {}};
    }

    const variantIds: Types.ObjectId[] = [];
    const bySku: Record<string, HydratedDocument<IProductVariant>> = {};

    for (let i = 0; i < defaultProductVariantSeeds.length; i++) {
        const combo = defaultProductVariantSeeds[i];
        const sku = variantSku(combo.size, combo.color);
        try {
            const payload = {
                product: variableProduct._id,
                sku,
                attributeCombination: [
                    {attribute: attrSize._id, value: combo.size},
                    {attribute: attrColor._id, value: combo.color},
                ],
                price: combo.price,
                compareAtPrice: 39.9,
                costPrice: 12,
                currency: currencyId,
                order: i + 1,
                status: "active" as const,
                trackInventory: true,
                company: company._id,
                createdBy: company.createdBy,
            };

            let variant = await ProductVariant.findOne({company: company._id, sku});
            if (!variant) {
                variant = await ProductVariant.create(payload);
            } else {
                variant.set(payload);
                await variant.save();
            }
            variantIds.push(variant._id);
            bySku[sku] = variant;
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating product variant '${sku}': ${message}`);
        }
    }

    if (variantIds.length) {
        await Product.updateOne(
            {_id: variableProduct._id},
            {
                $set: {
                    defaultVariant: variantIds[1] ?? variantIds[0],
                    variantCount: variantIds.length,
                    hasVariants: true,
                },
            },
        );
    }

    logger.finish("Finished creating product variants!", variantIds.length);
    return {variantIds, bySku};
}
