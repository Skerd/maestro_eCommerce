import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW, {type AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {assertCanDelete} from "@coreModule/database/relationsRegistry";
import type {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {checkoutService} from "@eCommerceModule/database/schemas/checkout/checkout.service";
import {paymentTransactionService} from "@financeModule/database/schemas/paymentTransaction/paymentTransaction.service";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import type {TransactionEnabledParams} from "@coreModule/utilities/middlewares/transactionUtils";
import {ProductOrderActions} from "@eCommerceModule/database/schemas/productOrder/productOrder.actions";
import {productOrderToDTO, productOrdersToDTO} from "@eCommerceModule/utilities/mappers/productOrder/productOrderMapper.dto";
import {productOrdersToSelect} from "@eCommerceModule/utilities/mappers/productOrder/productOrderMapper.select";
import {fulfillmentService} from "@eCommerceModule/database/schemas/fulfillment/fulfillment.service";
import {returnRequestService} from "@eCommerceModule/database/schemas/returnRequest/returnRequest.service";
import {fulfillmentsToDTO} from "@eCommerceModule/utilities/mappers/fulfillment/fulfillmentMapper.dto";
import {returnRequestsToDTO} from "@eCommerceModule/utilities/mappers/returnRequest/returnRequestMapper.dto";
import {paymentTransactionsToDTO} from "@financeModule/utilities/mappers/paymentTransaction/paymentTransactionMapper.dto";
import {z} from "zod";

async function enrichProductOrderSingle(doc: IProductOrder, params: TransactionEnabledParams) {
    const dto = productOrderToDTO(doc);

    const orderId = doc._id;
    const companyId = params.company._id;
    if (!orderId) {
        dto.paymentTransactions = [];
        dto.fulfillments = [];
        dto.returnRequests = [];
        return dto;
    }

    const or: Record<string, unknown>[] = [
        {sourceType: "productOrder", sourceId: orderId},
    ];

    // Charges created at checkout may still only reference checkout until confirm re-points them.
    if (doc.idempotencyKey && companyId) {
        const checkout = await checkoutService.findOne(
            {idempotencyKey: doc.idempotencyKey, company: companyId},
            {logger: params.logger, languageCode: params.languageCode, session: params.session},
            undefined,
            "_id",
        );
        if (checkout?._id) {
            or.push({sourceType: "checkout", sourceId: checkout._id});
        }
    }

    const filter: Record<string, unknown> = {$or: or};
    if (companyId) filter.company = companyId;

    const txs = await paymentTransactionService.find(
        filter,
        {logger: params.logger, languageCode: params.languageCode, session: params.session},
        ["currency"],
        undefined,
        {_id: -1},
        50,
    );
    dto.paymentTransactions = paymentTransactionsToDTO(txs);

    const ctx = {session: params.session, logger: params.logger, languageCode: params.languageCode};
    const [fulfillments, returnRequests] = await Promise.all([
        fulfillmentService.find({order: orderId, company: companyId}, ctx, ["order"], undefined, {createdAt: -1}, 50),
        returnRequestService.find({order: orderId, company: companyId}, ctx, ["order", "resolvedBy"], undefined, {createdAt: -1}, 50),
    ]);
    dto.fulfillments = fulfillmentsToDTO(fulfillments);
    dto.returnRequests = returnRequestsToDTO(returnRequests);
    return dto;
}

export const basePath = "/api/eCommerce/productOrder";
/**
 * Product orders are created by checkout/system flows only. Panel is read +
 * lifecycle actions (confirm/ship/cancel/refund) — no CRUD create/edit.
 * List filtering uses the standard DSL (`body.filter`), not top-level extras.
 */
export const {router} = createCrudRouter({
    collectionName: "productOrders",
    model: ProductOrder,
    service: productOrderService,
    entityName: "ProductOrder",
    defaultSort: {createdAt: -1},
    createSchema: (_lang: string) => z.object({}),
    editSchema: (_lang: string) => z.object({_id: z.string()}),
    toDTO: productOrderToDTO,
    toDTOArray: productOrdersToDTO,
    toSelect: productOrdersToSelect,
    enrichSingle: enrichProductOrderSingle,
    buildCreateData: async () => ({}),
    buildUpdateData: async () => ({}),
    rateLimits: {read: 60, write: 30, delete: 10},
    actions: ProductOrderActions,
    /** Orders that moved money stay on record — only unpaid or closed-out orders can be removed. */
    beforeDelete: async (params, doc) => {
        const deletable = doc.status === "cancelled"
            || doc.paymentStatus === "refunded"
            || (doc.paymentStatus === "unpaid" && doc.status === "pending");
        if (!deletable) {
            throw apiValidationException("order_with_payment_cannot_be_deleted", null, null, params.languageCode);
        }
        // Keep the default relation check that a custom beforeDelete replaces
        await assertCanDelete(ProductOrder.modelName, doc._id, params.languageCode, params.session);
    },
});

/**
 * Buyer self-service routes (storefront account pages). Scoped hard to the
 * authenticated customer — no admin model permissions required.
 */
router.post(
    "/my",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: AuthenticatedMWType & {page?: unknown; limit?: unknown}) => {
        const {company, actionUserCtx, logger, languageCode} = params;
        const page = Math.max(1, Number(params.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(params.limit) || 10));

        const filter = {company: company._id, customer: new ObjectId(actionUserCtx.userId), deletedAt: null};
        const ctx = {logger, languageCode};

        const [orders, total] = await Promise.all([
            productOrderService.find(
                filter,
                ctx,
                undefined,
                "orderNumber status paymentStatus fulfillmentStatus grandTotal subtotal shippingTotal taxTotal discountTotal items createdAt",
                {createdAt: -1},
                limit,
                (page - 1) * limit,
            ),
            productOrderService.count(filter, ctx),
        ]);

        return {data: orders.map(productOrderToDTO), total, page, limit};
    }),
);

router.post(
    "/mySingle",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: AuthenticatedMWType & {_id?: string}) => {
        const {languageCode, company, actionUserCtx, logger, _id} = params;

        if (!_id) throw apiValidationException("id_required", null, null, languageCode);

        const order = await productOrderService.findOne(
            {
                _id: new ObjectId(_id),
                company: company._id,
                customer: new ObjectId(actionUserCtx.userId),
                deletedAt: null,
            },
            {logger, languageCode},
        );

        if (!order) throw apiValidationException("order_not_found", null, null, languageCode);

        return {data: productOrderToDTO(order)};
    }),
);
