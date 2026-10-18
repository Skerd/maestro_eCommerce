import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {createDisputeFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/dispute/createDispute.form.validator";
import {editDisputeFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/dispute/editDispute.form.validator";
import Dispute from "@eCommerceModule/database/schemas/dispute/dispute";
import {DisputeActions} from "@eCommerceModule/database/schemas/dispute/dispute.actions";
import {disputeService} from "@eCommerceModule/database/schemas/dispute/dispute.service";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import {disputeToDTO, disputesToDTO} from "@eCommerceModule/utilities/mappers/dispute/disputeMapper.dto";
import {disputesToSelect} from "@eCommerceModule/utilities/mappers/dispute/disputeMapper.select";

async function assertOrderPartyAccess(orderId: string, params: Record<string, any>): Promise<void> {
    const {logger, languageCode, actionUserCtx, company} = params;
    const currentUserId = actionUserCtx.userId?.toString?.();

    const order = await orderService.findOne(
        {_id: new ObjectId(orderId), company: company._id},
        {logger, languageCode},
        "customer provider",
        "_id customer provider",
    );

    if (!order) {
        throw apiValidationException("order_not_found", null, null, languageCode);
    }

    const customerId = (order as any).customer?._id?.toString?.() || (order as any).customer?.toString?.();
    const providerId = (order as any).provider?._id?.toString?.() || (order as any).provider?.toString?.();

    if (customerId !== currentUserId && providerId !== currentUserId) {
        throw apiValidationException("only_order_parties_can_view_disputes", null, null, languageCode);
    }
}

async function nonAdminOrderScope(params: Record<string, any>): Promise<Record<string, unknown>> {
    const {logger, languageCode, actionUserCtx, company} = params;
    const currentUserId = actionUserCtx.userId?.toString?.();

    const myOrders = await orderService.find(
        {
            company: company._id,
            $or: [
                {customer: new ObjectId(currentUserId)},
                {provider: new ObjectId(currentUserId)},
            ],
        },
        {logger, languageCode},
        null,
        "_id",
    );
    const orderIds = myOrders.map((o: any) => o._id);
    return {order: orderIds.length === 0 ? {$in: []} : {$in: orderIds}};
}

export const basePath = "/api/eCommerceMarketplace/dispute";
export const {router} = createCrudRouter({
    collectionName: "disputes",
    model: Dispute,
    service: disputeService,
    entityName: "Dispute",
    defaultSort: {createdAt: -1},
    selectSearchField: "reason",
    rateLimits: {read: 60, write: 30, delete: 20},
    createSchema: createDisputeFormSchema,
    editSchema: editDisputeFormSchema,
    toDTO: disputeToDTO,
    toDTOArray: disputesToDTO,
    toSelect: disputesToSelect,
    extraListFilter: async ({actionUserCtx, company, logger, languageCode}) => {
        if (actionUserCtx.isAdmin) {
            return {};
        }
        return nonAdminOrderScope({actionUserCtx, company, logger, languageCode});
    },
    enrichSingle: async (doc, params) => {
        const orderId =
            (doc as any).order?._id?.toString?.() || (doc as any).order?.toString?.();
        if (!params.actionUserCtx.isAdmin && orderId) {
            await assertOrderPartyAccess(orderId, params);
        }
        return disputeToDTO(doc);
    },
    /** Domain-guard create (like productReview): order-party/uniqueness checks; initiator derived. status default on schema. */
    buildCreateData: async ({order: orderRef, reason, actionUserCtx, company, session, logger, languageCode}) => {
        const order = await orderService.findOne(
            {_id: new ObjectId(orderRef), company: company._id},
            {session, logger, languageCode},
            "customer provider",
            "_id customer provider status",
        );

        if (!order) {
            throw apiValidationException("order_not_found", null, null, languageCode);
        }

        const customerId = (order as any).customer?._id?.toString?.() || (order as any).customer?.toString?.();
        const providerId = (order as any).provider?._id?.toString?.() || (order as any).provider?.toString?.();
        const currentUserId = actionUserCtx.userId?.toString?.();

        if (customerId !== currentUserId && providerId !== currentUserId) {
            throw apiValidationException("only_order_parties_can_raise_dispute", null, null, languageCode);
        }

        const existingDispute = await disputeService.findOne(
            {order: new ObjectId(orderRef)},
            {session, logger, languageCode},
        );

        if (existingDispute) {
            throw apiValidationException("dispute_already_exists_for_order", null, null, languageCode);
        }

        if (["cancelled", "completed"].includes((order as any).status)) {
            throw apiValidationException("cannot_dispute_final_order", null, null, languageCode);
        }

        return {
            order: new ObjectId(orderRef),
            initiator: actionUserCtx.userId,
            reason: reason.trim(),
        };
    },
    /** Status and resolution via DisputeActions. */
    buildUpdateData: async () => ({}),
    actions: DisputeActions,
});
