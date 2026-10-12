import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {createWarehouseFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/warehouse/createWarehouse.form.validator";
import {editWarehouseFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/warehouse/editWarehouse.form.validator";
import {WarehouseSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/warehouse/warehouse.schema-def";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import {warehouseService} from "@eCommerceModule/database/schemas/warehouse/warehouse.service";
import {WarehouseActions} from "@eCommerceModule/database/schemas/warehouse/warehouse.actions";
import {warehouseToDTO, warehousesToDTO} from "@eCommerceModule/utilities/mappers/warehouse/warehouseMapper.dto";
import {warehousesToSelect} from "@eCommerceModule/utilities/mappers/warehouse/warehouseMapper.select";
import {detachWarehouseFromPosConfigsOrThrow} from "@eCommerceModule/utilities/services/warehousePosConfigGuard";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {restoreUnlessKeyTaken} from "@eCommerceModule/utilities/services/restoreUnlessKeyTaken";

export const basePath = "/api/eCommerce/warehouse";
export const {router} = createCrudRouter({
    collectionName: "warehouses",
    model: Warehouse,
    service: warehouseService,
    entityName: "Warehouse",
    selectSearchField: "name",
    selectProjection: "_id name code",
    defaultSort: {name: 1},
    createSchema: createWarehouseFormSchema,
    editSchema: editWarehouseFormSchema,
    toDTO: warehouseToDTO,
    toDTOArray: warehousesToDTO,
    toSelect: warehousesToSelect,
    buildCreateData: buildCreateDataFromSchemaDef(WarehouseSchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(WarehouseSchemaDef),
    /** Stock can't vanish with its warehouse: rows holding stock or reservations block the delete. */
    beforeDelete: async (params, doc) => {
        const holdsStock = await inventoryService.exists(
            {
                company: params.company._id,
                warehouse: doc._id,
                deletedAt: null,
                $or: [{quantityOnHand: {$ne: 0}}, {quantityReserved: {$gt: 0}}],
            },
            {session: params.session, logger: params.logger, languageCode: params.languageCode},
        );
        if (holdsStock) {
            throw apiValidationException("warehouse_has_stock", "", null, params.languageCode);
        }
        await detachWarehouseFromPosConfigsOrThrow({
            warehouseId: doc._id,
            companyId: params.company._id,
            languageCode: params.languageCode,
            session: params.session,
        });
    },
    extraSelectFilter: () => ({isActive: true}),
    actions: WarehouseActions,
    overrideRestoreHandler: restoreUnlessKeyTaken({
        model: Warehouse,
        service: warehouseService,
        entityName: "Warehouse",
        keys: ["code"],
        errorCode: "warehouse_already_exists",
    }),
    rateLimits: {read: 60, write: 30, delete: 20},
});
