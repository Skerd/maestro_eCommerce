import {emitNotificationEvent} from "@coreModule/domain/notifications/notificationEventBus";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {ReturnRequestSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/returnRequest.schema-def";
import {createReturnRequestFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/createReturnRequest.form.validator";
import {editReturnRequestFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/editReturnRequest.form.validator";
import ReturnRequest from "@eCommerceModule/database/schemas/returnRequest/returnRequest";
import {returnedItemsValue, returnRequestService} from "@eCommerceModule/database/schemas/returnRequest/returnRequest.service";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {ObjectId} from "mongodb";
import {ReturnRequestActions} from "@eCommerceModule/database/schemas/returnRequest/returnRequest.actions";
import {returnRequestToDTO, returnRequestsToDTO} from "@eCommerceModule/utilities/mappers/returnRequest/returnRequestMapper.dto";
import {returnRequestsToSelect} from "@eCommerceModule/utilities/mappers/returnRequest/returnRequestMapper.select";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import {findCompanyAdminReceiverIds} from "@eCommerceModule/utilities/services/companyStaffRecipients";
import {runAfterCommit} from "@coreModule/utilities/middlewares/transactionUtils";

const buildReturnCreate = buildCreateDataFromSchemaDef(ReturnRequestSchemaDef);
const buildReturnUpdate = buildUpdateDataFromSchemaDef(ReturnRequestSchemaDef);

export const basePath = "/api/eCommerce/returnRequest";
export const {router} = createCrudRouter({
    collectionName: "returnRequests",
    model: ReturnRequest,
    service: returnRequestService,
    entityName: "ReturnRequest",
    defaultSort: {createdAt: -1},
    createSchema: createReturnRequestFormSchema,
    editSchema: editReturnRequestFormSchema,
    toDTO: returnRequestToDTO,
    toDTOArray: returnRequestsToDTO,
    toSelect: returnRequestsToSelect,
    actions: ReturnRequestActions,
    /** Items must be shipped lines of this company's order, not already claimed by another return. */
    buildCreateData: async (params) => {
        const {company, session, logger, languageCode} = params;
        const data = buildReturnCreate(params);
        const order = await productOrderService.findOneOrThrow(
            {_id: new ObjectId(String(params.order)), company: company._id},
            {session, logger, languageCode, withDeleted: false},
        );
        // Till sales are returned and refunded at the till
        if (order.idempotencyKey.startsWith("pos:")) {
            throw apiValidationException("refund_via_pos", "", null, languageCode);
        }
        const returnable = await returnRequestService.returnableQuantities(order, {session, logger, languageCode});
        for (const item of params.items) {
            const lineId = String(item.orderItemId);
            const open = returnable.get(lineId) ?? 0;
            if (item.quantity > open) {
                throw apiValidationException("return_quantity_exceeds_shipped", "items", null, languageCode);
            }
            returnable.set(lineId, open - item.quantity);
        }
        if (data.refundAmount != null && data.refundAmount > returnedItemsValue(order, params.items)) {
            throw apiValidationException("return_refund_exceeds_items", "refundAmount", null, languageCode);
        }
        return data;
    },
    buildUpdateData: async (params, writeFields) => {
        const {company, session, logger, languageCode, existing} = params;
        const data = buildReturnUpdate(params, writeFields);
        // What is returned is fixed once requested; the refund is settled once resolved
        delete data.order;
        delete data.items;
        delete data.type;
        if (existing.status !== "pending") delete data.refundAmount;
        if (data.refundAmount != null) {
            const order = await productOrderService.findOneOrThrow(
                {_id: existing.order, company: company._id},
                {session, logger, languageCode},
            );
            if (data.refundAmount > returnedItemsValue(order, existing.items)) {
                throw apiValidationException("return_refund_exceeds_items", "refundAmount", null, languageCode);
            }
        }
        return data;
    },
    rateLimits: {read: 60, write: 30, delete: 10},
    afterCreate: async (created, params) => {
        const {company, languageCode, logger, session} = params;
        const companyId = company._id;
        const orderId = nestedEntityToRef(created.order);
        const order = orderId
            ? await productOrderService.findOne(
                {_id: orderId, company: companyId},
                {session, logger, languageCode},
            )
            : null;
        // Staff hear about the request only once it is saved
        await runAfterCommit(session, async () => {
            const receiverIds = await findCompanyAdminReceiverIds(companyId);
            if (!receiverIds.length) return;
            emitNotificationEvent(NotificationEventCodes.RETURN_REQUEST_CREATED, {
                receiverIds,
                payload: {
                    companyId: companyId.toString(),
                    languageCode,
                    returnRequestId: created._id.toString(),
                    orderId: order?._id.toString() ?? orderId?.toString() ?? "",
                    orderNumber: order?.orderNumber ?? "",
                },
            });
        });
    },
});
