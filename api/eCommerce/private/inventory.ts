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
import {inventoryMovementService} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.service";
import {inventoryToDTO, inventoriesToDTO} from "@eCommerceModule/utilities/mappers/inventory/inventoryMapper.dto";
import {inventoriesToSelect} from "@eCommerceModule/utilities/mappers/inventory/inventoryMapper.select";
import {createInventoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/createInventory.form.validator";
import {editInventoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/editInventory.form.validator";
import {InventorySchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/inventory.schema-def";

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

export const basePath = "/api/eCommerce/inventory";
export const {router} = createCrudRouter({
    collectionName: "inventories",
    model: Inventory,
    service: inventoryService,
    entityName: "Inventory",
    defaultSort: {createdAt: -1},
    createSchema: createInventoryFormSchema,
    editSchema: editInventoryFormSchema,
    toDTO: inventoryToDTO,
    toDTOArray: inventoriesToDTO,
    toSelect: inventoriesToSelect,
    buildCreateData: buildCreateDataFromSchemaDef(InventorySchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(InventorySchemaDef),
    afterCreate: async (created, params) => {
        const qty = Number(created.quantityOnHand ?? 0);
        if (!qty) return;

        await inventoryMovementService.create(
            {
                inventory: created._id,
                product: created.product?._id ?? created.product,
                variant: created.variant?._id ?? created.variant,
                warehouse: created.warehouse?._id ?? created.warehouse,
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
