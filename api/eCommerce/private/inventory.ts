import {ObjectId} from "mongodb";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {transactionHandler} from "@coreModule/utilities/middlewares/transactionHandler";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {
    InventoryActions,
    assertStockWrite,
    assertWithinReserved,
} from "@eCommerceModule/database/schemas/inventory/inventory.actions";
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

const buildInventoryUpdate = buildUpdateDataFromSchemaDef(InventorySchemaDef);

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
    buildUpdateData: async (params, writeFields) => {
        const data = await buildInventoryUpdate(params, writeFields);
        // A stock row's identity is fixed — moving it to another product/variant/warehouse
        // would orphan its reservations and movement history.
        delete data.product;
        delete data.variant;
        delete data.warehouse;
        if (data.quantityOnHand != null) {
            const delta = Number(data.quantityOnHand) - Number(params.existing.quantityOnHand ?? 0);
            assertWithinReserved(params.existing, delta, params.languageCode);
        }
        return data;
    },
    afterUpdate: async (params, existing) => {
        // Edited on-hand quantities get the same audit trail as restock/deduct
        const updated = await inventoryService.findById(existing._id, {session: params.session, logger: params.logger, languageCode: params.languageCode});
        const before = Number(existing.quantityOnHand ?? 0);
        const after = Number(updated?.quantityOnHand ?? before);
        if (!updated || after === before) return;

        await inventoryMovementService.create(
            {
                inventory: existing._id,
                product: (existing.product as any)?._id ?? existing.product,
                variant: (existing.variant as any)?._id ?? existing.variant,
                warehouse: (existing.warehouse as any)?._id ?? existing.warehouse,
                quantity: after - before,
                reason: "adjustment",
                note: "Edited on the inventory record",
                quantityBefore: before,
                quantityAfter: after,
                occurredAt: new Date(),
                performedBy: params.actionUserCtx?.userId,
                referenceType: "Inventory",
                referenceId: existing._id,
                company: params.company._id,
            } as any,
            {logger: params.logger, languageCode: params.languageCode, session: params.session},
        );
    },
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
    transactionHandler(),
    asyncHandler(async (params: any) => {
        const {logger, languageCode, actionUserCtx, company, session, inventoryId, delta, reason, notes} = params;
        assertStockWrite(params);

        const deltaNum = Number(delta);
        if (!inventoryId || !ObjectId.isValid(String(inventoryId)) || !Number.isFinite(deltaNum) || deltaNum === 0) {
            throw apiValidationException("inventory_id_and_delta_required", null, null, languageCode);
        }

        const inventory = await inventoryService.findOneOrThrow(
            {_id: new ObjectId(inventoryId), company: company._id},
            {logger, languageCode, session},
        );

        const quantityBefore = inventory.quantityOnHand;
        assertWithinReserved(inventory, deltaNum, languageCode);

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

        const updated = await inventoryService.findById(inventory._id, {logger, languageCode, session});
        return {data: updated ? inventoryToDTO(updated) : null};
    }),
);
