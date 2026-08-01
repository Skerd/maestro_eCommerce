import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {FulfillmentSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/fulfillment.schema-def";
import {createFulfillmentFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/createFulfillment.form.validator";
import {editFulfillmentFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/editFulfillment.form.validator";
import Fulfillment from "@eCommerceModule/database/schemas/fulfillment/fulfillment";
import {fulfillmentService} from "@eCommerceModule/database/schemas/fulfillment/fulfillment.service";
import {FulfillmentActions} from "@eCommerceModule/database/schemas/fulfillment/fulfillment.actions";
import {fulfillmentToDTO, fulfillmentsToDTO} from "@eCommerceModule/utilities/mappers/fulfillment/fulfillmentMapper.dto";
import {fulfillmentsToSelect} from "@eCommerceModule/utilities/mappers/fulfillment/fulfillmentMapper.select";

export const basePath = "/api/eCommerce/fulfillment";
export const {router} = createCrudRouter({
    collectionName: "fulfillments",
    model: Fulfillment,
    service: fulfillmentService,
    entityName: "Fulfillment",
    defaultSort: {createdAt: -1},
    createSchema: createFulfillmentFormSchema,
    editSchema: editFulfillmentFormSchema,
    toDTO: fulfillmentToDTO,
    toDTOArray: fulfillmentsToDTO,
    toSelect: fulfillmentsToSelect,
    actions: FulfillmentActions,
    buildCreateData: buildCreateDataFromSchemaDef(FulfillmentSchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(FulfillmentSchemaDef),
    rateLimits: {read: 60, write: 30, delete: 10},
});
