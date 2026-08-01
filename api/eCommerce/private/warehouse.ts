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
    beforeDelete: async (params, doc) => {
        await detachWarehouseFromPosConfigsOrThrow({
            warehouseId: doc._id,
            companyId: params.company._id,
            languageCode: params.languageCode,
            session: params.session,
        });
    },
    extraSelectFilter: () => ({isActive: true}),
    actions: WarehouseActions,
    rateLimits: {read: 60, write: 30, delete: 20},
});
