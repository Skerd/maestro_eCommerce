import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import Inventory, {type IInventory} from "./inventory";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {
    defaultProductSeeds,
    type CreateProductsResult,
} from "@eCommerceModule/database/schemas/product/product.defaults";
import {
    defaultProductVariantSeeds,
    variantSku,
    type CreateProductVariantsResult,
} from "@eCommerceModule/database/schemas/productVariant/productVariant.defaults";

export type CreateInventoriesResult = {
    rows: HydratedDocument<IInventory>[];
    hoodieInventory?: HydratedDocument<IInventory>;
};

/**
 * Seeds on-hand stock for tee variants and simple tracked products.
 * Idempotent on `{company, product, variant?, warehouse}`.
 */
export async function createInventories(
    parentLogger: serverLogger,
    company: ICompany,
    products: CreateProductsResult,
    warehouseId: Types.ObjectId | undefined,
    variants: CreateProductVariantsResult,
): Promise<CreateInventoriesResult> {
    const logger = getLogger("mongoDbInitialization-createInventories", parentLogger);
    logger.start("Creating inventory...");

    if (!warehouseId) {
        logger.warn("Skipping inventory: Tirana warehouse was not seeded.");
        logger.finish("Finished creating inventory!", 0);
        return {rows: []};
    }

    const rows: HydratedDocument<IInventory>[] = [];
    const variableProduct = products.bySeedKey["prod-01-brand-tee"];

    if (variableProduct) {
        for (let i = 0; i < defaultProductVariantSeeds.length; i++) {
            const combo = defaultProductVariantSeeds[i];
            const sku = variantSku(combo.size, combo.color);
            const variant = variants.bySku[sku];
            if (!variant) {
                logger.warn(`Skipping inventory for variant "${sku}": variant was not seeded.`);
                continue;
            }
            try {
                const invPayload = {
                    product: variableProduct._id,
                    variant: variant._id,
                    warehouse: warehouseId,
                    quantityOnHand: combo.stock,
                    quantityReserved: i === 0 ? 1 : 0,
                    reorderPoint: 5,
                    reorderQuantity: 20,
                    company: company._id,
                    createdBy: company.createdBy,
                };
                let inv = await Inventory.findOne({
                    company: company._id,
                    product: variableProduct._id,
                    variant: variant._id,
                    warehouse: warehouseId,
                });
                if (!inv) {
                    inv = await Inventory.create(invPayload);
                } else {
                    inv.set(invPayload);
                    await inv.save();
                }
                rows.push(inv);
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                console.log(e);
                logger.err(`Error creating inventory for variant '${sku}': ${message}`);
            }
        }
    } else {
        logger.warn("Skipping variant inventory: product \"prod-01-brand-tee\" was not seeded.");
    }

    let hoodieInventory: HydratedDocument<IInventory> | undefined;

    for (const seed of defaultProductSeeds) {
        if (seed.hasVariants || !seed.trackInventory) continue;
        const product = products.bySeedKey[seed.seedKey];
        if (!product) {
            logger.warn(`Skipping inventory for "${seed.seedKey}": product was not seeded.`);
            continue;
        }
        try {
            let inv = await Inventory.findOne({
                company: company._id,
                product: product._id,
                warehouse: warehouseId,
                variant: {$exists: false},
            });
            if (!inv) {
                inv = await Inventory.findOne({
                    company: company._id,
                    product: product._id,
                    warehouse: warehouseId,
                    $or: [{variant: null}, {variant: {$exists: false}}],
                });
            }
            const invPayload = {
                product: product._id,
                warehouse: warehouseId,
                quantityOnHand: seed.stock ?? 0,
                quantityReserved: seed.reserved ?? 0,
                reorderPoint: 5,
                reorderQuantity: 25,
                company: company._id,
                createdBy: company.createdBy,
            };
            if (!inv) {
                inv = await Inventory.create(invPayload);
            } else {
                inv.set(invPayload);
                await inv.save();
            }
            rows.push(inv);
            if (seed.seedKey === "prod-02-hoodie") {
                hoodieInventory = inv;
            }
        } catch (e: unknown) {
            const message = e instanceof Error ? e.message : String(e);
            console.log(e);
            logger.err(`Error creating inventory for '${seed.seedKey}': ${message}`);
        }
    }

    logger.finish("Finished creating inventory!", rows.length);
    return {rows, hoodieInventory};
}
