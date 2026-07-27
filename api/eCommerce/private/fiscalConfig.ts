import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {FiscalConfigSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/fiscalConfig/fiscalConfig.schema-def";
import {createFiscalConfigFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/fiscalConfig/createFiscalConfig.form.validator";
import {editFiscalConfigFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/fiscalConfig/editFiscalConfig.form.validator";
import FiscalConfig from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig";
import {fiscalConfigService} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig.service";
import {
    fiscalConfigToDTO,
    fiscalConfigsToDTO,
    fiscalConfigsToSelect,
} from "@eCommerceModule/utilities/mappers/fiscalConfigMapper.dto";
import {FiscalConfigActions} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig.actions";

const buildFiscalConfigCreateFromSchemaDef = buildCreateDataFromSchemaDef(FiscalConfigSchemaDef);
const buildFiscalConfigUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(FiscalConfigSchemaDef);

function applyCertificateFields(data: Record<string, unknown>, params: any, isCreate: boolean) {
    delete data.certificateBase64;
    delete data.certificatePassword;
    delete data.clearCertificate;
    delete data.hasCertificate;

    if (params.clearCertificate) {
        data.certificateBase64 = null;
        data.certificatePassword = null;
        data.hasCertificate = false;
        return;
    }
    if (params.certificateBase64?.trim()) {
        if (!params.certificatePassword?.trim() && isCreate) {
            // Require password with new cert on create — leave unset so validation surfaces via missing hasCertificate usage
            return;
        }
        data.certificateBase64 = String(params.certificateBase64).replace(/\s+/g, "");
        data.hasCertificate = true;
        if (params.certificatePassword != null && String(params.certificatePassword).length) {
            data.certificatePassword = String(params.certificatePassword);
        }
    } else if (params.certificatePassword != null && String(params.certificatePassword).length) {
        data.certificatePassword = String(params.certificatePassword);
    }
}

export const basePath = "/api/eCommerce/fiscalConfig";
export const {router} = createCrudRouter({
    collectionName: "fiscalConfigs",
    model: FiscalConfig,
    service: fiscalConfigService,
    entityName: "FiscalConfig",
    selectSearchField: "name",
    defaultSort: {name: 1},
    createSchema: createFiscalConfigFormSchema,
    editSchema: editFiscalConfigFormSchema,
    toDTO: fiscalConfigToDTO,
    toDTOArray: fiscalConfigsToDTO,
    toSelect: fiscalConfigsToSelect,
    buildCreateData: async params => {
        const data = await buildFiscalConfigCreateFromSchemaDef(params);
        applyCertificateFields(data as any, params, true);
        if (data.isActive === undefined) data.isActive = true;
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const data = await buildFiscalConfigUpdateFromSchemaDef(params, writeFields);
        // Active state is managed via activate/deactivate actions, not the edit form.
        delete data.isActive;
        applyCertificateFields(data as any, params, false);
        return data;
    },
    actions: FiscalConfigActions,
    rateLimits: {read: 60, write: 30, delete: 20},
});
