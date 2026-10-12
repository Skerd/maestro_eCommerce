import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {FulfillmentSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/fulfillment.schema-def";
import {createFulfillmentFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/createFulfillment.form.validator";
import {editFulfillmentFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/editFulfillment.form.validator";
import Fulfillment from "@eCommerceModule/database/schemas/fulfillment/fulfillment";
import {fulfillmentService} from "@eCommerceModule/database/schemas/fulfillment/fulfillment.service";
import {FulfillmentActions} from "@eCommerceModule/database/schemas/fulfillment/fulfillment.actions";
import {fulfillmentToDTO, fulfillmentsToDTO} from "@eCommerceModule/utilities/mappers/fulfillment/fulfillmentMapper.dto";
import {fulfillmentsToSelect} from "@eCommerceModule/utilities/mappers/fulfillment/fulfillmentMapper.select";

const buildFulfillmentCreate = buildCreateDataFromSchemaDef(FulfillmentSchemaDef);
const buildFulfillmentUpdate = buildUpdateDataFromSchemaDef(FulfillmentSchemaDef);

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
    /** Items must be lines of this company's order, within what is still left to fulfil. */
    buildCreateData: async (params) => {
        const {company, session, logger, languageCode} = params;
        const data = buildFulfillmentCreate(params);
        const order = await productOrderService.findOneOrThrow(
            {_id: new ObjectId(String(params.order)), company: company._id},
            {session, logger, languageCode, withDeleted: false},
        );
        const remaining = await fulfillmentService.remainingQuantities(order, {session, logger, languageCode});
        for (const item of params.items) {
            const lineId = String(item.orderItemId);
            const open = remaining.get(lineId) ?? 0;
            if (item.quantity > open) {
                throw apiValidationException("fulfillment_quantity_exceeds_order", "items", null, languageCode);
            }
            remaining.set(lineId, open - item.quantity);
        }
        return data;
    },
    buildUpdateData: (params, writeFields) => {
        const data = buildFulfillmentUpdate(params, writeFields);
        // What is fulfilled is fixed once created — re-pointing it would corrupt the order's fulfilled quantities
        delete data.order;
        delete data.items;
        return data;
    },
    rateLimits: {read: 60, write: 30, delete: 10},
});
