import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {createWarehouseFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/warehouse/createWarehouse.form.validator";
import {editWarehouseFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/warehouse/editWarehouse.form.validator";
import {WarehouseSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/warehouse/warehouse.schema-def";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import {warehouseService} from "@eCommerceModule/database/schemas/warehouse/warehouse.service";
import {warehouseToDTO, warehousesToDTO, warehouseToSelect, warehousesToSelect} from "@eCommerceModule/utilities/mappers/warehouseMapper.dto";

const warehouseTransforms = {
    code: (v: unknown) => String(v).trim().toUpperCase(),
} as const;

const buildWarehouseCreateFromSchemaDef = buildCreateDataFromSchemaDef(WarehouseSchemaDef, warehouseTransforms);
const buildWarehouseUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(WarehouseSchemaDef, warehouseTransforms);

export const basePath = "/api/eCommerce/warehouse";
export const {router} = createCrudRouter({
    collectionName: "warehouses",
    model: Warehouse,
    service: warehouseService,
    entityName: "Warehouse",
    selectSearchField: "name",
    defaultSort: {name: 1},
    createSchema: createWarehouseFormSchema,
    editSchema: editWarehouseFormSchema,
    toDTO: warehouseToDTO,
    toDTOArray: warehousesToDTO,
    toSelect: warehousesToSelect,
    buildCreateData: async (params) => buildWarehouseCreateFromSchemaDef(params),
    buildUpdateData: async (params, writeFields) => buildWarehouseUpdateFromSchemaDef(params, writeFields),
    rateLimits: {read: 60, write: 30, delete: 20},
});
