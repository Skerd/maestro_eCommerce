import {ObjectId} from "mongodb";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {InventoryActions} from "@eCommerceModule/database/schemas/inventory/inventory.actions";
import InventoryMovement from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import {inventoryMovementService} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.service";
import {inventoryToDTO, inventoriesToDTO} from "@eCommerceModule/utilities/mappers/inventoryMapper.dto";
import {inventoryMovementsToDTO} from "@eCommerceModule/utilities/mappers/inventoryMovementMapper.dto";
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

const movementReasons = [
    "restock",
    "sale",
    "return",
    "adjustment",
    "damage",
    "transfer_in",
    "transfer_out",
    "initial",
    "write_off",
] as const;

async function enrichInventorySingle(doc: any) {
    const dto = inventoryToDTO(doc) as ReturnType<typeof inventoryToDTO> & {
        movements?: ReturnType<typeof inventoryMovementsToDTO>;
    };

    const inventoryId = doc._id;
    const productId = (doc.product as any)?._id ?? doc.product;
    const warehouseId = (doc.warehouse as any)?._id ?? doc.warehouse;
    const companyId = (doc.company as any)?._id ?? doc.company;

    if (!inventoryId || !companyId) {
        dto.movements = [];
        return dto;
    }

    const or: Record<string, unknown>[] = [
        {inventory: inventoryId},
        {referenceType: "Inventory", referenceId: inventoryId},
    ];
    if (productId && warehouseId) {
        or.push({product: productId, warehouse: warehouseId});
    }

    const rows = await InventoryMovement.find({company: companyId, $or: or})
        .populate("product", "title sku")
        .populate("variant", "sku attributeCombination")
        .populate("warehouse", "name code")
        .populate("performedBy", "name surname")
        .populate("receipts")
        .sort({occurredAt: -1, createdAt: -1})
        .limit(200)
        .lean();
    dto.movements = inventoryMovementsToDTO(rows as any);
    return dto;
}

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
    toSelect: (docs: any[]) =>
        docs.map((d: any) => ({
            value: d._id.toString(),
            label: `${d.product?.title ?? d.product} @ ${d.warehouse?.name ?? d.warehouse}`,
        })),
    enrichSingle: async (doc) => enrichInventorySingle(doc),
    extraListFilter: async ({productId, warehouseId, belowReorderPoint}) => {
        const filter: Record<string, unknown> = {};
        if (productId) filter.product = new ObjectId(productId as string);
        if (warehouseId) filter.warehouse = new ObjectId(warehouseId as string);
        if (belowReorderPoint) {
            filter.$expr = {$lt: [{$subtract: ["$quantityOnHand", "$quantityReserved"]}, "$reorderPoint"]};
        }
        return filter;
    },
    buildCreateData: async (params) => {
        const data = buildInventoryCreateFromSchemaDef(params);
        data.quantityReserved = 0;
        return data;
    },
    buildUpdateData: async (params, writeFields) => buildInventoryUpdateFromSchemaDef(params, writeFields),
    afterCreate: async (created, params) => {
        const qty = Number(created.quantityOnHand ?? 0);
        if (!qty) return;

        await inventoryMovementService.create(
            {
                inventory: created._id,
                product: (created.product as any)?._id ?? created.product,
                variant: (created.variant as any)?._id ?? created.variant,
                warehouse: (created.warehouse as any)?._id ?? created.warehouse,
                quantity: qty,
                reason: "initial",
                quantityBefore: 0,
                quantityAfter: qty,
                occurredAt: new Date(),
                performedBy: params.actionUserCtx?.userId,
                referenceType: "Inventory",
                referenceId: created._id,
                company: params.company._id,
            } as any,
            {
                logger: params.logger,
                languageCode: params.languageCode,
                session: params.session,
            },
        );
    },
    rateLimits: {read: 120, write: 30, delete: 10},
    actions: InventoryActions,
});

// Legacy adjust endpoint (kept for API clients); prefer /restock and /deduct.
router.post(
    "/adjust",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, actionUserCtx, company, session, inventoryId, delta, reason, notes} = params;

        if (!inventoryId || delta == null) {
            throw apiValidationException("inventory_id_and_delta_required", null, null, languageCode);
        }

        const inventory = await inventoryService.findOneOrThrow(
            {_id: new ObjectId(inventoryId), company: company._id},
            {logger, languageCode, session},
        );

        const quantityBefore = inventory.quantityOnHand;
        const deltaNum = Number(delta);

        await inventoryService.adjust(
            (inventory.product as any)?._id ?? (inventory.product as any),
            (inventory.variant as any)?._id ?? (inventory.variant as any),
            (inventory.warehouse as any)?._id ?? (inventory.warehouse as any),
            deltaNum,
            {logger, languageCode, session},
        );

        await inventoryMovementService.create(
            {
                inventory: inventory._id,
                product: (inventory.product as any)?._id ?? (inventory.product as any),
                variant: (inventory.variant as any)?._id ?? (inventory.variant as any),
                warehouse: (inventory.warehouse as any)?._id ?? (inventory.warehouse as any),
                quantity: deltaNum,
                reason: movementReasons.includes(reason) ? reason : "adjustment",
                note: notes,
                quantityBefore,
                quantityAfter: quantityBefore + deltaNum,
                occurredAt: new Date(),
                performedBy: actionUserCtx.userId,
                referenceType: "Inventory",
                referenceId: inventory._id,
                company: company._id,
            } as any,
            {logger, languageCode, session},
        );

        const updated = await inventoryService.findById(inventory._id, {logger, languageCode});
        return {data: updated ? inventoryToDTO(updated) : null};
    }),
);
