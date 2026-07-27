import {ObjectId} from "mongodb";
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

const warehouseTransforms = {
    code: (v: unknown) => String(v).trim().toUpperCase(),
} as const;

const buildWarehouseCreateFromSchemaDef = buildCreateDataFromSchemaDef(WarehouseSchemaDef, warehouseTransforms);
const buildWarehouseUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(WarehouseSchemaDef, warehouseTransforms);

async function clearOtherDefaultWarehouses(companyId: ObjectId, exceptId?: ObjectId): Promise<void> {
    const filter: Record<string, unknown> = {company: companyId, isDefault: true};
    if (exceptId) filter._id = {$ne: exceptId};
    await Warehouse.updateMany(filter, {$set: {isDefault: false}});
}

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
    buildCreateData: async (params) => {
        const data = buildWarehouseCreateFromSchemaDef(params);
        if (data.isDefault === undefined) data.isDefault = false;
        if (data.isActive === undefined) data.isActive = true;
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const data = buildWarehouseUpdateFromSchemaDef(params, writeFields);
        // Active state is managed via activate/deactivate actions, not the edit form.
        delete data.isActive;
        return data;
    },
    afterCreate: async (created, params) => {
        if (created.isDefault) {
            await clearOtherDefaultWarehouses(params.company._id, created._id);
        }
    },
    afterUpdate: async (params) => {
        if (params.isDefault === true) {
            await clearOtherDefaultWarehouses(params.company._id, new ObjectId(params._id));
        }
    },
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
