import dayjs from "dayjs";
import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import InventoryMovement, {type IInventoryMovement} from "./inventoryMovement";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import type {CreateProductsResult} from "@eCommerceModule/database/schemas/product/product.defaults";
import type {CreateInventoriesResult} from "@eCommerceModule/database/schemas/inventory/inventory.defaults";

export const HOODIE_INITIAL_MOVE_NOTE = `ecom-demo-seed:move-hoodie-initial`;

/**
 * Seeds one `initial` restock against the primary warehouse + the studio hoodie.
 * Write-locked schema — `Model.create` still works. Idempotent via `note`.
 */
export async function createInventoryMovements(
    parentLogger: serverLogger,
    company: ICompany,
    products: CreateProductsResult,
    warehouseId: Types.ObjectId | undefined,
    inventories: CreateInventoriesResult,
): Promise<HydratedDocument<IInventoryMovement> | undefined> {
    const logger = getLogger("mongoDbInitialization-createInventoryMovements", parentLogger);
    logger.start("Creating inventory movements...");

    const hoodie = products.bySeedKey["prod-02-hoodie"];
    if (!hoodie) {
        logger.warn("Skipping inventory movement: product \"prod-02-hoodie\" was not seeded.");
        logger.finish("Finished creating inventory movements!", 0);
        return undefined;
    }
    if (!warehouseId) {
        logger.warn("Skipping inventory movement: primary warehouse was not seeded.");
        logger.finish("Finished creating inventory movements!", 0);
        return undefined;
    }

    const quantity = Number(hoodie.trackInventory ? 42 : 0) || 42;

    try {
        const payload = {
            ...(inventories.hoodieInventory ? {inventory: inventories.hoodieInventory._id} : {}),
            product: hoodie._id,
            warehouse: warehouseId,
            quantity,
            reason: "initial" as const,
            note: `Initial restock of Studio Hoodie. [${HOODIE_INITIAL_MOVE_NOTE}]`,
            quantityBefore: 0,
            quantityAfter: quantity,
            occurredAt: dayjs().subtract(30, "day").toDate(),
            unitCost: 28,
            performedBy: company.createdBy,
            company: company._id,
            createdBy: company.createdBy,
        };

        let doc = await InventoryMovement.findOne({
            company: company._id,
            note: {$regex: HOODIE_INITIAL_MOVE_NOTE},
        });
        if (!doc) {
            doc = await InventoryMovement.create(payload);
        } else {
            doc.set(payload);
            await doc.save();
        }
        logger.finish("Finished creating inventory movements!", 1);
        return doc;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(e);
        logger.err(`Error creating inventory movement: ${message}`);
        logger.fail("Failed to create inventory movements!");
        return undefined;
    }
}
