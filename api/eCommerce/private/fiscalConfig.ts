import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {mediaUploadMW} from "@coreModule/utilities/middlewares/mediaUploadMW";
import {FiscalConfigSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/fiscalConfig/fiscalConfig.schema-def";
import {createFiscalConfigFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/fiscalConfig/createFiscalConfig.form.validator";
import {editFiscalConfigFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/fiscalConfig/editFiscalConfig.form.validator";
import FiscalConfig from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig";
import {fiscalConfigService} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig.service";
import {fiscalConfigToDTO, fiscalConfigsToDTO} from "@eCommerceModule/utilities/mappers/fiscalConfig/fiscalConfigMapper.dto";
import {fiscalConfigsToSelect} from "@eCommerceModule/utilities/mappers/fiscalConfig/fiscalConfigMapper.select";
import {FiscalConfigActions} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig.actions";

const buildFiscalConfigCreateFromSchemaDef = buildCreateDataFromSchemaDef(FiscalConfigSchemaDef);
const buildFiscalConfigUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(FiscalConfigSchemaDef);

const mediaUpload = mediaUploadMW({
    fields: {
        certificate: 1,
    },
    fieldMimeTypes: {
        certificate: ["application/x-pkcs12", "application/pkcs12"],
    },
    maxFileSize: 10 * 1024 * 1024,
});

/** Edit always posts the password blank unless the user typed a new one. */
function omitBlankCertificatePassword(data: Record<string, unknown>) {
    if (typeof data.certificatePassword !== "string" || data.certificatePassword.length === 0) {
        delete data.certificatePassword;
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
    createMiddleware: [mediaUpload],
    editMiddleware: [mediaUpload],
    buildCreateData: async params => {
        const data = await buildFiscalConfigCreateFromSchemaDef(params);
        omitBlankCertificatePassword(data);
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const data = await buildFiscalConfigUpdateFromSchemaDef(params, writeFields);
        omitBlankCertificatePassword(data);
        return data;
    },
    actions: FiscalConfigActions,
    rateLimits: {read: 60, write: 30, delete: 20},
});
