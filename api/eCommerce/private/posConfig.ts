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
import {
    getCompanyPosLock,
    isCompanyPosLockActive,
    isCompanyPosLocked,
} from "@eCommerceModule/utilities/services/posKillSwitch";
import {warehouseService} from "@eCommerceModule/database/schemas/warehouse/warehouse.service";
import {ObjectId} from "mongodb";
import "@eCommerceModule/database/schemas/posCompanyPosLock/posCompanyPosLock";

async function assertWarehousesActive(
    warehouseIds: ObjectId[],
    companyId: ObjectId,
    opts: {session?: any; logger?: any; languageCode: string},
): Promise<void> {
    if (!warehouseIds.length) return;
    const {session, logger, languageCode} = opts;
    const activeCount = await warehouseService.count(
        {_id: {$in: warehouseIds}, company: companyId, isActive: true},
        {session, logger, languageCode, withDeleted: false},
    );
    if (activeCount !== warehouseIds.length) {
        throw apiValidationException("pos_config_warehouse_inactive", "warehouses", null, languageCode);
    }
}

type CompanyLockDtoOpts = {
    companyLockActive: boolean;
    companyPauseReason: string | null;
};

function dtoOpts(params: Record<string, any>, lock: CompanyLockDtoOpts) {
    return {
        actionUserId: params?.actionUserCtx?.userId?.toString?.() ?? params?.actionUserCtx?.userId,
        companyLockActive: lock.companyLockActive,
        companyPauseReason: lock.companyPauseReason,
    };
}

async function companyLockDtoOpts(params: Record<string, any>): Promise<CompanyLockDtoOpts> {
    const lock = await getCompanyPosLock(params.company._id, params.session);
    return {
        companyLockActive: isCompanyPosLockActive(lock),
        companyPauseReason: lock?.pauseReason ?? null,
    };
}

async function prunePinsAfterManagerChange(doc: IPosConfig, params: Record<string, any>) {
    const pruned = pruneManagerPinsToAssigned(doc);
    const prev = doc.managerPins ?? [];
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
    doc.managerPins = pruned;
    if (!hasAnyManagerPin(doc)) {
        doc.pinForDiscount = false;
        doc.pinForCashOut = false;
        doc.pinForRefund = false;
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
    /** Till picker: active and not paused; company lock → empty. */
    extraSelectFilter: async (params) => {
        if (await isCompanyPosLocked(params.company._id)) {
            return {_id: {$in: []}};
        }
        return {
            isActive: true,
            $or: [{pausedAt: null}, {pausedAt: {$exists: false}}],
        };
    },
    buildCreateData: async (params) => {
        const data = buildCreateDataFromSchemaDef(PosConfigSchemaDef)(params);
        await assertWarehousesActive(data.warehouses as ObjectId[], params.company._id, {
            session: params.session,
            logger: params.logger,
            languageCode: params.languageCode,
        });
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const data = buildUpdateDataFromSchemaDef(PosConfigSchemaDef)(params, writeFields);
        if (data.warehouses !== undefined) {
            await assertWarehousesActive(data.warehouses as ObjectId[], params.company._id, {
                session: params.session,
                logger: params.logger,
                languageCode: params.languageCode,
            });
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
    enrichList: async (docs, params) => posConfigsToDTO(docs, dtoOpts(params, await companyLockDtoOpts(params))),
    enrichSingle: async (doc, params) => posConfigToDTO(doc, dtoOpts(params, await companyLockDtoOpts(params))),
    enrichUpdate: async (doc, params) => posConfigToDTO(doc, dtoOpts(params, await companyLockDtoOpts(params))),
});
