import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import InventoryMovement from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import {inventoryMovementService} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.service";
import {inventoryToDTO, inventoriesToDTO} from "@eCommerceModule/utilities/mappers/inventoryMapper.dto";
import {z} from "zod";
import {createInventoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/createInventory.form.validator";
import {editInventoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/editInventory.form.validator";
import {InventorySchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/inventory.schema-def";

function inventoryListSchema(_languageCode: string) {
    return z.object({
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
        productId: z.string().optional(),
        warehouseId: z.string().optional(),
        belowReorderPoint: z.boolean().optional(),
    });
}

const buildInventoryCreateFromSchemaDef = buildCreateDataFromSchemaDef(InventorySchemaDef);
const buildInventoryUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(InventorySchemaDef);

export const basePath = "/api/eCommerce/inventory";
export const {router} = createCrudRouter({
    collectionName: "inventories",
    model: Inventory,
    service: inventoryService,
    entityName: "Inventory",
    defaultSort: {createdAt: -1},
    listSchema: inventoryListSchema,
    createSchema: createInventoryFormSchema,
    editSchema: editInventoryFormSchema,
    toDTO: inventoryToDTO,
    toDTOArray: inventoriesToDTO,
    toSelect: (docs: any[]) => docs.map((d: any) => ({value: d._id.toString(), label: `${d.product?.title ?? d.product} @ ${d.warehouse?.name ?? d.warehouse}`})),
    extraListFilter: async ({productId, warehouseId, belowReorderPoint}) => {
        const filter: Record<string, unknown> = {};
        if (productId) filter.product = new ObjectId(productId as string);
        if (warehouseId) filter.warehouse = new ObjectId(warehouseId as string);
        if (belowReorderPoint) filter.$expr = {$lt: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, "$reorderPoint"]};
        return filter;
    },
    buildCreateData: async (params) => {
        const data = buildInventoryCreateFromSchemaDef(params);
        data.quantityReserved = 0;
        return data;
    },
    buildUpdateData: async (params, writeFields) => buildInventoryUpdateFromSchemaDef(params, writeFields),
    rateLimits: {read: 120, write: 30, delete: 10},
});

// Adjust inventory
router.post(
    "/adjust",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (req: any, res: any) => {
        const {logger, languageCode, actionUserCtx, company, session} = req;
        const {inventoryId, delta, reason, notes} = req.body;

        if (!inventoryId || delta == null) {
            return res.status(400).json({message: "inventoryId and delta required"});
        }

        const inventory = await inventoryService.findOneOrThrow(
            {_id: new ObjectId(inventoryId), company: company._id},
            {logger, languageCode, session},
        );

        await inventoryService.adjust(
            inventory.product as ObjectId,
            inventory.variant as ObjectId | undefined,
            inventory.warehouse as ObjectId,
            Number(delta),
            {logger, languageCode, session},
        );

        await inventoryMovementService.create({
            inventory: inventory._id,
            product: inventory.product as ObjectId,
            variant: inventory.variant as ObjectId | undefined,
            warehouse: inventory.warehouse as ObjectId,
            type: "adjustment",
            quantityChange: Number(delta),
            reason,
            notes,
            performedBy: actionUserCtx.userId,
            company: company._id,
        }, {logger, languageCode, session});

        const updated = await inventoryService.findById(inventory._id, {logger, languageCode});
        return res.json({data: updated ? inventoryToDTO(updated) : null});
    }),
);
