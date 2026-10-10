import {emitNotificationEvent} from "@coreModule/domain/notifications/notificationEventBus";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {buildCreateDataFromSchemaDef, buildUpdateDataFromSchemaDef} from "@coreModule/api/buildUpdateDataFromSchemaDef";
import {ReturnRequestSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/returnRequest.schema-def";
import {createReturnRequestFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/createReturnRequest.form.validator";
import {editReturnRequestFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/returnRequest/editReturnRequest.form.validator";
import ReturnRequest from "@eCommerceModule/database/schemas/returnRequest/returnRequest";
import {returnRequestService} from "@eCommerceModule/database/schemas/returnRequest/returnRequest.service";
import {ReturnRequestActions} from "@eCommerceModule/database/schemas/returnRequest/returnRequest.actions";
import {returnRequestToDTO, returnRequestsToDTO} from "@eCommerceModule/utilities/mappers/returnRequest/returnRequestMapper.dto";
import {returnRequestsToSelect} from "@eCommerceModule/utilities/mappers/returnRequest/returnRequestMapper.select";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import {findCompanyAdminReceiverIds} from "@eCommerceModule/utilities/services/companyStaffRecipients";

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
    buildCreateData: buildCreateDataFromSchemaDef(ReturnRequestSchemaDef),
    buildUpdateData: buildUpdateDataFromSchemaDef(ReturnRequestSchemaDef),
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
    },
});
