import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import PaymentTransaction from "@financeModule/database/schemas/paymentTransaction/paymentTransaction";
import Checkout from "@eCommerceModule/database/schemas/checkout/checkout";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {ProductOrderActions} from "@eCommerceModule/database/schemas/productOrder/productOrder.actions";
import {productOrderToDTO, productOrdersToDTO} from "@eCommerceModule/utilities/mappers/productOrder/productOrderMapper.dto";
import {productOrdersToSelect} from "@eCommerceModule/utilities/mappers/productOrder/productOrderMapper.select";
import {paymentTransactionsToDTO} from "@financeModule/utilities/mappers/paymentTransaction/paymentTransactionMapper.dto";
import {z} from "zod";

async function enrichProductOrderSingle(doc: any, params: any) {
    const dto = productOrderToDTO(doc);
    const {user} = params;

    const orderId = doc._id;
    const companyId = user?.company?._id;
    if (!orderId) {
        dto.paymentTransactions = [];
        return dto;
    }

    const or: Record<string, unknown>[] = [
        {sourceType: "productOrder", sourceId: orderId},
    ];

    // Charges created at checkout may still only reference checkout until confirm re-points them.
    if (doc.idempotencyKey && companyId) {
        const checkout = await Checkout.findOne({idempotencyKey: doc.idempotencyKey, company: companyId})
            .select("_id")
            .lean();
        if (checkout?._id) {
            or.push({sourceType: "checkout", sourceId: checkout._id});
        }
    }

    const filter: Record<string, unknown> = {$or: or};
    if (companyId) filter.company = companyId;

    const txs = await PaymentTransaction.find(filter)
        .populate("currency", "name symbol abbreviation")
        .sort({_id: -1})
        .limit(50);
    dto.paymentTransactions = paymentTransactionsToDTO(txs);
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
});

/**
 * Buyer self-service routes (storefront account pages). Scoped hard to the
 * authenticated customer — no admin model permissions required.
 */
router.post(
    "/my",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any) => {
        const {company, actionUserCtx} = params;
        const page = Math.max(1, Number(params.page) || 1);
        const limit = Math.min(50, Math.max(1, Number(params.limit) || 10));

        const filter = {company: company._id, customer: new ObjectId(actionUserCtx.userId), deletedAt: null};

        const [orders, total] = await Promise.all([
            ProductOrder.find(filter)
                .select("orderNumber status paymentStatus fulfillmentStatus grandTotal subtotal shippingTotal taxTotal discountTotal items createdAt")
                .sort({createdAt: -1})
                .skip((page - 1) * limit)
                .limit(limit),
            ProductOrder.countDocuments(filter),
        ]);

        return {data: orders.map(productOrderToDTO), total, page, limit};
    }),
);

router.post(
    "/mySingle",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    asyncHandler(async (params: any) => {
        const {languageCode, company, actionUserCtx, _id} = params;

        if (!_id) throw apiValidationException("id_required", null, null, languageCode);

        const order = await ProductOrder.findOne({
            _id: new ObjectId(_id),
            company: company._id,
            customer: new ObjectId(actionUserCtx.userId),
            deletedAt: null,
        });

        if (!order) throw apiValidationException("order_not_found", null, null, languageCode);

        return {data: productOrderToDTO(order)};
    }),
);
