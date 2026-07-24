import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {PosPaymentMethodSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/posPaymentMethod/posPaymentMethod.schema-def";
import {createPosPaymentMethodFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posPaymentMethod/createPosPaymentMethod.form.validator";
import {editPosPaymentMethodFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/posPaymentMethod/editPosPaymentMethod.form.validator";
import PosPaymentMethod from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod";
import {posPaymentMethodService} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod.service";
import {
    posPaymentMethodToDTO,
    posPaymentMethodsToDTO,
    posPaymentMethodsToSelect,
} from "@eCommerceModule/utilities/mappers/posPaymentMethodMapper.dto";

const buildPosPaymentMethodCreateFromSchemaDef = buildCreateDataFromSchemaDef(PosPaymentMethodSchemaDef);
const buildPosPaymentMethodUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(PosPaymentMethodSchemaDef);

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
    buildCreateData: async (params) => buildPosPaymentMethodCreateFromSchemaDef(params),
    buildUpdateData: async (params, writeFields) => buildPosPaymentMethodUpdateFromSchemaDef(params, writeFields),
    rateLimits: {read: 60, write: 30, delete: 20},
});
