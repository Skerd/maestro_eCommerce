import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {FulfillmentSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/fulfillment.schema-def";
import {createFulfillmentFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/createFulfillment.form.validator";
import {editFulfillmentFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/fulfillment/editFulfillment.form.validator";
import Fulfillment from "@eCommerceModule/database/schemas/fulfillment/fulfillment";
import {fulfillmentService} from "@eCommerceModule/database/schemas/fulfillment/fulfillment.service";
import {fulfillmentToDTO, fulfillmentsToDTO} from "@eCommerceModule/utilities/mappers/fulfillmentMapper.dto";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";

const fulfillmentTransforms = {
    items: (v: unknown) => v,
} as const;

const buildFulfillmentCreateFromSchemaDef = buildCreateDataFromSchemaDef(FulfillmentSchemaDef, fulfillmentTransforms);
const buildFulfillmentUpdateFromSchemaDef = buildUpdateDataFromSchemaDef(FulfillmentSchemaDef, fulfillmentTransforms);

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
    toSelect: (docs: any[]) => docs.map((d: any) => ({value: d._id.toString(), label: d.trackingNumber ?? d._id.toString()})),
    extraListFilter: async ({orderId}) => {
        if (!orderId) return {};
        return {order: new ObjectId(orderId as string)};
    },
    buildCreateData: async (params) => {
        const {company, logger, languageCode, order} = params;
        await productOrderService.findOneOrThrow({_id: new ObjectId(order as string), company: company._id}, {logger, languageCode});
        const data = buildFulfillmentCreateFromSchemaDef(params);
        if (data.status === undefined) data.status = "pending";
        return data;
    },
    buildUpdateData: async (params, writeFields) => buildFulfillmentUpdateFromSchemaDef(params, writeFields),
    rateLimits: {read: 60, write: 30, delete: 10},
});
