import {ObjectId} from "mongodb";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {transactionHandler} from "@coreModule/utilities/middlewares/transactionHandler";
import type {TransactionRequiredParams} from "@coreModule/utilities/middlewares/transactionUtils";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
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
import {inventoryMovementsToDTO} from "@eCommerceModule/utilities/mappers/inventoryMovement/inventoryMovementMapper.dto";
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
    enrichSingle: async (doc, params) => {
        const dto = inventoryToDTO(doc);
        const movements = await inventoryMovementService.find(
            {inventory: doc._id, company: params.company._id},
            {session: params.session, logger: params.logger, languageCode: params.languageCode},
            ["product", "variant", "warehouse", "inventory", "performedBy"],
            undefined,
            {occurredAt: -1, createdAt: -1},
            50,
        );
        dto.movements = inventoryMovementsToDTO(movements);
        return dto;
    },
    buildCreateData: buildCreateDataFromSchemaDef(InventorySchemaDef),
    buildUpdateData: async (params, writeFields) => {
        const data = await buildInventoryUpdate(params, writeFields);
        // A stock row's identity is fixed — moving it to another product/variant/warehouse
        // would orphan its reservations and movement history.
        delete data.product;
        delete data.variant;
        delete data.warehouse;
        delete data.quantityOnHand;
        return data;
    },
    afterCreate: async (created, params) => {
        const qty = Number(created.quantityOnHand ?? 0);
        if (!qty) return;

        const productId = nestedEntityToRef(created.product);
        const warehouseId = nestedEntityToRef(created.warehouse);
        if (!productId || !warehouseId) return;

        await inventoryMovementService.create(
            {
                inventory: created._id,
                product: productId,
                variant: nestedEntityToRef(created.variant),
                warehouse: warehouseId,
                quantity: qty,
                reason: "initial",
                quantityBefore: 0,
                quantityAfter: qty,
                occurredAt: new Date(),
                performedBy: params.actionUserCtx.userId,
                referenceType: "Inventory",
                referenceId: created._id,
                company: params.company._id,
            },
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
    asyncHandler(async (params: TransactionRequiredParams & {
        inventoryId?: string;
        delta?: number;
        reason?: string;
        notes?: string;
    }) => {
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

        const productId = nestedEntityToRef(inventory.product);
        const warehouseId = nestedEntityToRef(inventory.warehouse);
        if (!productId || !warehouseId) {
            throw apiValidationException("inventory_not_found", null, null, languageCode);
        }
        const variantId = nestedEntityToRef(inventory.variant);

        await inventoryService.adjust(
            productId,
            variantId,
            warehouseId,
            deltaNum,
            {logger, languageCode, session},
        );

        const reasonValue = movementReasons.find((entry) => entry === reason) ?? "adjustment";
        await inventoryMovementService.create(
            {
                inventory: inventory._id,
                product: productId,
                variant: variantId,
                warehouse: warehouseId,
                quantity: deltaNum,
                reason: reasonValue,
                note: notes,
                quantityBefore,
                quantityAfter: quantityBefore + deltaNum,
                occurredAt: new Date(),
                performedBy: actionUserCtx.userId,
                referenceType: "Inventory",
                referenceId: inventory._id,
                company: company._id,
            },
            {logger, languageCode, session},
        );

        const updated = await inventoryService.findById(inventory._id, {logger, languageCode, session});
        return {data: updated ? inventoryToDTO(updated) : null};
    }),
);
