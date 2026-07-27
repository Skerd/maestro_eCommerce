import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {PosConfigSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/posConfig.schema-def";
import {createPosConfigFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/createPosConfig.form.validator";
import {editPosConfigFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/editPosConfig.form.validator";
import PosConfig, {IPosConfig} from "@eCommerceModule/database/schemas/posConfig/posConfig";
import {posConfigService} from "@eCommerceModule/database/schemas/posConfig/posConfig.service";
import {PosConfigActions} from "@eCommerceModule/database/schemas/posConfig/posConfig.actions";
import {posConfigToDTO, posConfigsToDTO} from "@eCommerceModule/utilities/mappers/posConfig/posConfigMapper.dto";
import {posConfigsToSelect} from "@eCommerceModule/utilities/mappers/posConfig/posConfigMapper.select";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {
    hasAnyManagerPin,
    pruneManagerPinsToAssigned,
} from "@eCommerceModule/utilities/services/posManagerPin";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import {ObjectId} from "mongodb";

/** Leaf read permissions skip populate — always hydrate label refs for DTO/chips. */
const POS_CONFIG_LABEL_POPULATE = [
    {path: "paymentMethods", select: "name type isActive cashQuickAmounts terminalEnabled terminalProvider terminalHost terminalPort terminalId terminalPath"},
    {path: "managers", select: "name surname username"},
    {path: "warehouses", select: "name code isActive"},
    {path: "currency", select: "name symbol abbreviation"},
];

async function assertWarehousesActive(
    warehouseIds: ObjectId[],
    companyId: ObjectId,
    languageCode: string,
): Promise<void> {
    if (!warehouseIds.length) return;
    const activeCount = await Warehouse.countDocuments({
        _id: {$in: warehouseIds},
        company: companyId,
        isActive: true,
        deletedAt: null,
    });
    if (activeCount !== warehouseIds.length) {
        throw apiValidationException("pos_config_warehouse_inactive", "warehouses", null, languageCode);
    }
}

async function withPosConfigLabels(doc: IPosConfig): Promise<IPosConfig> {
    // Migrate legacy single `warehouse` → `warehouses[]` on read (idempotent).
    const warehouses = ((doc as any).warehouses as any[]) ?? [];
    const legacy = (doc as any).warehouse;
    if ((!warehouses || warehouses.length === 0) && legacy) {
        const legacyId = legacy?._id ?? legacy;
        await PosConfig.updateOne(
            {_id: doc._id},
            {$set: {warehouses: [legacyId]}, $unset: {warehouse: 1}},
        );
        (doc as any).warehouses = [legacyId];
        (doc as any).warehouse = undefined;
    }
    await doc.populate(POS_CONFIG_LABEL_POPULATE);
    return doc;
}

function dtoOpts(params: Record<string, any>) {
    return {actionUserId: params?.actionUserCtx?.userId?.toString?.() ?? params?.actionUserCtx?.userId};
}

async function prunePinsAfterManagerChange(doc: IPosConfig, params: Record<string, any>) {
    const pruned = pruneManagerPinsToAssigned(doc);
    const prev = ((doc as any).managerPins as any[] | undefined) ?? [];
    if (pruned.length === prev.length) return;

    const update: Record<string, unknown> = {managerPins: pruned};
    if (!pruned.some((p) => !!p.pinHash)) {
        update.pinForDiscount = false;
        update.pinForCashOut = false;
        update.pinForRefund = false;
    }
    await posConfigService.updateByIdOrThrow(
        doc._id,
        {$set: update},
        {
            session: params.session,
            logger: params.logger,
            languageCode: params.languageCode,
            auditUserId: params.actionUserCtx?.userId,
        },
    );
    (doc as any).managerPins = pruned;
    if (!hasAnyManagerPin(doc)) {
        (doc as any).pinForDiscount = false;
        (doc as any).pinForCashOut = false;
        (doc as any).pinForRefund = false;
    }
}

export const basePath = "/api/eCommerce/posConfig";
export const {router} = createCrudRouter({
    collectionName: "posConfigs",
    model: PosConfig,
    service: posConfigService,
    entityName: "PosConfig",
    selectSearchField: "name",
    defaultSort: {name: 1},
    createSchema: createPosConfigFormSchema,
    editSchema: editPosConfigFormSchema,
    toDTO: (doc) => posConfigToDTO(doc),
    toDTOArray: (docs) => posConfigsToDTO(docs),
    toSelect: posConfigsToSelect,
    buildCreateData: async (params) => {
        const data = buildCreateDataFromSchemaDef(PosConfigSchemaDef)(params);
        if (!Array.isArray(data.warehouses) || data.warehouses.length === 0) {
            throw apiValidationException("pos_config_warehouse_required", "warehouses", null, params.languageCode);
        }
        await assertWarehousesActive(data.warehouses as ObjectId[], params.company._id, params.languageCode);
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const data = buildUpdateDataFromSchemaDef(PosConfigSchemaDef)(params, writeFields);
        if (data.warehouses !== undefined) {
            if (!Array.isArray(data.warehouses) || data.warehouses.length === 0) {
                throw apiValidationException("pos_config_warehouse_required", "warehouses", null, params.languageCode);
            }
            await assertWarehousesActive(data.warehouses as ObjectId[], params.company._id, params.languageCode);
        }
        return data;
    },
    actions: PosConfigActions,
    rateLimits: {read: 60, write: 30, delete: 20},
    afterUpdate: async (params, existing) => {
        // Re-load with updated managers so pin rows for removed users are pruned.
        const fresh = await posConfigService.findById(existing._id, {
            session: params.session,
            logger: params.logger,
            languageCode: params.languageCode,
        });
        if (fresh) await prunePinsAfterManagerChange(fresh, params);
    },
    enrichList: async (docs, params) => {
        await Promise.all(docs.map((doc) => withPosConfigLabels(doc)));
        return posConfigsToDTO(docs, dtoOpts(params));
    },
    enrichSingle: async (doc, params) => posConfigToDTO(await withPosConfigLabels(doc), dtoOpts(params)),
    enrichUpdate: async (doc, params) => posConfigToDTO(await withPosConfigLabels(doc), dtoOpts(params)),
});
