import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {TaxZoneSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/taxZone/taxZone.schema-def";
import {createTaxZoneFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/taxZone/createTaxZone.form.validator";
import {editTaxZoneFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/taxZone/editTaxZone.form.validator";
import TaxZone from "@eCommerceModule/database/schemas/taxZone/taxZone";
import {taxZoneService} from "@eCommerceModule/database/schemas/taxZone/taxZone.service";
import {taxZoneToDTO, taxZonesToDTO, taxZoneToSelect, taxZonesToSelect} from "@eCommerceModule/utilities/mappers/taxZoneMapper.dto";

const taxZoneTransforms = {
    rates: (v: unknown) => v,
} as const;

const buildTaxZoneCreateFromSchemaDef = buildCreateDataFromSchemaDef(TaxZoneSchemaDef, taxZoneTransforms);
const buildTaxZoneUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(TaxZoneSchemaDef, taxZoneTransforms);

export const basePath = "/api/eCommerce/taxZone";
export const {router} = createCrudRouter({
    collectionName: "taxZones",
    model: TaxZone,
    service: taxZoneService,
    entityName: "TaxZone",
    selectSearchField: "name",
    defaultSort: {priority: -1},
    createSchema: createTaxZoneFormSchema,
    editSchema: editTaxZoneFormSchema,
    toDTO: taxZoneToDTO,
    toDTOArray: taxZonesToDTO,
    toSelect: taxZonesToSelect,
    buildCreateData: async (params) => buildTaxZoneCreateFromSchemaDef(params),
    buildUpdateData: async (params, writeFields) => buildTaxZoneUpdateFromSchemaDef(params, writeFields),
    rateLimits: {read: 60, write: 30, delete: 20},
});
