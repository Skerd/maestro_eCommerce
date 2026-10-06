import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {TaxZoneSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/taxZone/taxZone.schema-def";
import {createTaxZoneFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/taxZone/createTaxZone.form.validator";
import {editTaxZoneFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/taxZone/editTaxZone.form.validator";
import TaxZone from "@eCommerceModule/database/schemas/taxZone/taxZone";
import {taxZoneService} from "@eCommerceModule/database/schemas/taxZone/taxZone.service";
import {TaxZoneActions} from "@eCommerceModule/database/schemas/taxZone/taxZone.actions";
import {taxZoneToDTO, taxZonesToDTO} from "@eCommerceModule/utilities/mappers/taxZone/taxZoneMapper.dto";
import {taxZonesToSelect} from "@eCommerceModule/utilities/mappers/taxZone/taxZoneMapper.select";

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
    buildCreateData: buildCreateDataFromSchemaDef(TaxZoneSchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(TaxZoneSchemaDef),
    actions: TaxZoneActions,
    rateLimits: {read: 60, write: 30, delete: 20},
});
