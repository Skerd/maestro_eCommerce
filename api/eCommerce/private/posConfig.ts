import bcrypt from "bcrypt";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {AUTHENTICATION} from "@coreModule/environment";
import {PosConfigSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/posConfig.schema-def";
import {createPosConfigFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/createPosConfig.form.validator";
import {editPosConfigFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/editPosConfig.form.validator";
import PosConfig from "@eCommerceModule/database/schemas/posConfig/posConfig";
import {posConfigService} from "@eCommerceModule/database/schemas/posConfig/posConfig.service";
import {posConfigToDTO, posConfigsToDTO, posConfigsToSelect} from "@eCommerceModule/utilities/mappers/posConfigMapper.dto";

const buildPosConfigCreateFromSchemaDef = buildCreateDataFromSchemaDef(PosConfigSchemaDef);
const buildPosConfigUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(PosConfigSchemaDef);

async function hashManagerPin(pin: string | undefined): Promise<string | undefined> {
    if (!pin?.trim()) return undefined;
    const salt = await bcrypt.genSalt(AUTHENTICATION.SALT || 10);
    return bcrypt.hash(pin.trim(), salt);
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
    toDTO: posConfigToDTO,
    toDTOArray: posConfigsToDTO,
    toSelect: posConfigsToSelect,
    buildCreateData: async (params) => {
        const data = await buildPosConfigCreateFromSchemaDef(params);
        const hash = await hashManagerPin(params.managerPin);
        if (hash) (data as any).managerPinHash = hash;
        delete (data as any).managerPin;
        delete (data as any).clearManagerPin;
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const data = await buildPosConfigUpdateFromSchemaDef(params, writeFields);
        delete (data as any).managerPin;
        delete (data as any).clearManagerPin;
        if (params.clearManagerPin) {
            (data as any).managerPinHash = null;
        } else {
            const hash = await hashManagerPin(params.managerPin);
            if (hash) (data as any).managerPinHash = hash;
        }
        return data;
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});
