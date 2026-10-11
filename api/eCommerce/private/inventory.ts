import {ObjectId} from "mongodb";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {InventoryActions} from "@eCommerceModule/database/schemas/inventory/inventory.actions";
import {inventoryMovementService} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.service";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {inventoryToDTO, inventoriesToDTO} from "@eCommerceModule/utilities/mappers/inventory/inventoryMapper.dto";
import {inventoriesToSelect} from "@eCommerceModule/utilities/mappers/inventory/inventoryMapper.select";
import {createInventoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/createInventory.form.validator";
import {editInventoryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/editInventory.form.validator";
import {InventorySchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventory/inventory.schema-def";

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
        delete data.quantityOnHand;
        return data;
    },
    afterCreate: async (created, params) => {
        const {session, logger, languageCode, actionUserCtx} = params;
        const productId = nestedEntityToRef(created.product);
        if (productId) {
            await productService.updateByIdOrThrow(
                productId,
                {$push: {inventories: created._id}},
                {session, logger, languageCode, auditUserId: actionUserCtx.userId, auditAction: "create"},
            );
        }

        if (!created.quantityOnHand) return;

        const warehouseId = nestedEntityToRef(created.warehouse);
        if (!productId || !warehouseId) return;

        await inventoryMovementService.create(
            {
                inventory: created._id,
                product: productId,
                variant: nestedEntityToRef(created.variant),
                warehouse: warehouseId,
                quantity: created.quantityOnHand,
                reason: "initial",
                quantityBefore: 0,
                quantityAfter: created.quantityOnHand,
                occurredAt: new Date(),
                performedBy: new ObjectId(params.actionUserCtx.userId),
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
    afterDelete: async (params, doc) => {
        const {session, logger, languageCode, actionUserCtx} = params;
        const productId = nestedEntityToRef(doc.product);
        if (!productId) return;
        await productService.updateByIdOrThrow(
            productId,
            {$pull: {inventories: doc._id}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );
    },
    overrideRestoreHandler: async (params) => {
        const {logger, languageCode, session, _id, company, actionUserCtx} = params;
        SchemaGuard.checkModelPermission(Inventory, "restore", actionUserCtx, languageCode);

        const restored = await inventoryService.restoreOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const productId = nestedEntityToRef(restored.product);
        if (productId) {
            await productService.updateByIdOrThrow(
                productId,
                {$push: {inventories: restored._id}},
                {session, logger, languageCode, auditUserId: actionUserCtx.userId, auditAction: "restore"},
            );
        }

        return {message: "Inventory successfully restored"};
    },
    rateLimits: {read: 120, write: 30, delete: 10},
    actions: InventoryActions,
});
