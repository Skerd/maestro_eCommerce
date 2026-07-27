import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {PosPaymentMethodSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/posPaymentMethod/posPaymentMethod.schema-def";
import {createPosPaymentMethodFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posPaymentMethod/createPosPaymentMethod.form.validator";
import {editPosPaymentMethodFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posPaymentMethod/editPosPaymentMethod.form.validator";
import PosPaymentMethod from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod";
import {posPaymentMethodService} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod.service";
import {PosPaymentMethodActions} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod.actions";
import {posPaymentMethodToDTO, posPaymentMethodsToDTO} from "@eCommerceModule/utilities/mappers/posPaymentMethod/posPaymentMethodMapper.dto";
import {posPaymentMethodsToSelect} from "@eCommerceModule/utilities/mappers/posPaymentMethod/posPaymentMethodMapper.select";
import {detachPosPaymentMethodFromConfigs} from "@eCommerceModule/utilities/services/posPaymentMethodDetach";

const buildPosPaymentMethodCreateFromSchemaDef = buildCreateDataFromSchemaDef(PosPaymentMethodSchemaDef);
const buildPosPaymentMethodUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(PosPaymentMethodSchemaDef);

function truthyFlag(value: unknown): boolean {
    return value === true || value === "true" || value === 1 || value === "1";
}

/** Bank POS terminal ↔ type: on → card; off → leave card (default cash). */
function applyTerminalTypeRule(
    data: Record<string, any>,
    params: Record<string, any>,
    existing?: {terminalEnabled?: boolean; type?: string},
) {
    const terminalEnabled =
        params.terminalEnabled !== undefined
            ? truthyFlag(params.terminalEnabled)
            : data.terminalEnabled !== undefined
              ? truthyFlag(data.terminalEnabled)
              : !!existing?.terminalEnabled;

    if (terminalEnabled) {
        data.type = "card";
        data.terminalEnabled = true;
        return data;
    }

    data.terminalEnabled = false;
    const effectiveType = data.type ?? params.type ?? existing?.type;
    if (effectiveType === "card") {
        data.type = "cash";
    }
    return data;
}

export const basePath = "/api/eCommerce/posPaymentMethod";
export const {router} = createCrudRouter({
    collectionName: "posPaymentMethods",
    model: PosPaymentMethod,
    service: posPaymentMethodService,
    entityName: "PosPaymentMethod",
    selectSearchField: "name",
    defaultSort: {sequence: 1, name: 1},
    createSchema: createPosPaymentMethodFormSchema,
    editSchema: editPosPaymentMethodFormSchema,
    toDTO: posPaymentMethodToDTO,
    toDTOArray: posPaymentMethodsToDTO,
    toSelect: posPaymentMethodsToSelect,
    buildCreateData: async (params) => {
        const data = buildPosPaymentMethodCreateFromSchemaDef(params);
        return applyTerminalTypeRule(data, params);
    },
    buildUpdateData: async (params, writeFields) => {
        const data = buildPosPaymentMethodUpdateFromSchemaDef(params, writeFields);
        const existing = params.existing as {terminalEnabled?: boolean; type?: string} | undefined;
        return applyTerminalTypeRule(data, params, existing);
    },
    actions: PosPaymentMethodActions,
    /** POS config assignment chips should only offer active methods. */
    extraSelectFilter: () => ({isActive: true}),
    beforeDelete: async (params, doc) => {
        await detachPosPaymentMethodFromConfigs(doc._id, {
            companyId: params.company._id,
            languageCode: params.languageCode,
            session: params.session,
        });
    },
    rateLimits: {read: 60, write: 30, delete: 20},
});
