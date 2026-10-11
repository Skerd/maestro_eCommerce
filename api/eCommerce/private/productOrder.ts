import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW, {type AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {myProductOrdersFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/myProductOrders.form.validator";
import type {MyProductOrdersFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/myProductOrders.form.validator";
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
    const readOpts = {logger: params.logger, languageCode: params.languageCode, session: params.session};

    const or: Record<string, unknown>[] = [
        {sourceType: "productOrder", sourceId: orderId},
    ];

    // Charges created at checkout may still only reference checkout until confirm re-points them.
    const checkout = await checkoutService.findOne(
        {idempotencyKey: doc.idempotencyKey, company: companyId},
        readOpts,
        undefined,
        "_id",
    );
    if (checkout) {
        or.push({sourceType: "checkout", sourceId: checkout._id});
    }

    const txs = await paymentTransactionService.find(
        {$or: or, company: companyId},
        readOpts,
        ["currency"],
        undefined,
        {_id: -1},
        50,
    );
    dto.paymentTransactions = paymentTransactionsToDTO(txs);

    const [fulfillments, returnRequests] = await Promise.all([
        fulfillmentService.find({order: orderId, company: companyId}, readOpts, ["order"], undefined, {createdAt: -1}, 50),
        returnRequestService.find({order: orderId, company: companyId}, readOpts, ["order", "resolvedBy"], undefined, {createdAt: -1}, 50),
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
    selectSearchField: "orderNumber",
    defaultSort: {createdAt: -1},
    createSchema: () => z.object({}),
    editSchema: () => z.object({_id: z.string()}),
    toDTO: productOrderToDTO,
    toDTOArray: productOrdersToDTO,
    toSelect: productOrdersToSelect,
    enrichSingle: enrichProductOrderSingle,
    buildCreateData: (params) => {
        throw apiValidationException("user_permissions_not_sufficient", "", null, params.languageCode);
    },
    buildUpdateData: (params) => {
        throw apiValidationException("user_permissions_not_sufficient", "", null, params.languageCode);
    },
    rateLimits: {read: 60, write: 30, delete: 10},
    actions: ProductOrderActions,
    /** Orders that moved money stay on record — only unpaid or closed-out orders can be removed. */
    beforeDelete: async (params, doc) => {
        const deletable = doc.status === "cancelled"
            || doc.paymentStatus === "refunded"
            || (doc.paymentStatus === "unpaid" && doc.status === "pending");
        if (!deletable) {
            throw apiValidationException("order_with_payment_cannot_be_deleted", "", null, params.languageCode);
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
    validateFormZod(myProductOrdersFormSchema),
    asyncHandler(async (params: AuthenticatedMWType & MyProductOrdersFormType) => {
        const {company, actionUserCtx, logger, languageCode} = params;
        const page = params.page ?? 1;
        const limit = params.limit ?? 10;

        const filter = {company: company._id, customer: new ObjectId(actionUserCtx.userId)};
        const ctx = {logger, languageCode};

        const [orders, total] = await Promise.all([
            productOrderService.find(
                filter,
                {...ctx, withDeleted: false},
                undefined,
                "orderNumber status paymentStatus fulfillmentStatus grandTotal subtotal shippingTotal taxTotal discountTotal items createdAt",
                {createdAt: -1},
                limit,
                (page - 1) * limit,
            ),
            productOrderService.count(filter, {...ctx, withDeleted: false}),
        ]);

        return {data: orders.map(productOrderToDTO), total, page, limit};
    }),
);

router.post(
    "/mySingle",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(validateSingleForm),
    asyncHandler(async (params: AuthenticatedMWType & {_id: string}) => {
        const {languageCode, company, actionUserCtx, logger, _id} = params;

        const order = await productOrderService.findOne(
            {
                _id: new ObjectId(_id),
                company: company._id,
                customer: new ObjectId(actionUserCtx.userId),
            },
            {withDeleted: false, logger, languageCode},
        );

        if (!order) throw apiValidationException("order_not_found", "", null, languageCode);

        return {data: productOrderToDTO(order)};
    }),
);
