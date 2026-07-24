import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {ProductOrderActions} from "@eCommerceModule/database/schemas/productOrder/productOrder.actions";
import {productOrderToDTO, productOrdersToDTO, productOrdersToSelect} from "@eCommerceModule/utilities/mappers/productOrderMapper.dto";
import {z} from "zod";

const orderStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;
const paymentStatuses = ["unpaid", "authorized", "paid", "partially_refunded", "refunded", "voided"] as const;
const fulfillmentStatuses = ["unfulfilled", "partially_fulfilled", "fulfilled", "returned"] as const;

function orderListSchema(_lang: string) {
    return z.object({
        page: z.coerce.number().optional(),
        limit: z.coerce.number().optional(),
        status: z.enum(orderStatuses).optional(),
        paymentStatus: z.enum(paymentStatuses).optional(),
        fulfillmentStatus: z.enum(fulfillmentStatuses).optional(),
        customerId: z.string().optional(),
        orderNumber: z.string().optional(),
    });
}

export const basePath = "/api/eCommerce/productOrder";
export const {router} = createCrudRouter({
    collectionName: "productOrders",
    model: ProductOrder,
    service: productOrderService,
    entityName: "ProductOrder",
    defaultSort: {createdAt: -1},
    listSchema: orderListSchema,
    createSchema: (_lang: string) => z.object({}),
    editSchema: (_lang: string) => z.object({_id: z.string()}),
    toDTO: productOrderToDTO,
    toDTOArray: productOrdersToDTO,
    toSelect: productOrdersToSelect,
    extraListFilter: async ({status, paymentStatus, fulfillmentStatus, customerId, orderNumber}) => {
        const filter: Record<string, unknown> = {};
        if (status) filter.status = status;
        if (paymentStatus) filter.paymentStatus = paymentStatus;
        if (fulfillmentStatus) filter.fulfillmentStatus = fulfillmentStatus;
        if (customerId) filter.customer = new ObjectId(customerId as string);
        if (orderNumber) filter.orderNumber = {$regex: String(orderNumber), $options: "i"};
        return filter;
    },
    buildCreateData: async () => ({}),
    buildUpdateData: async ({status, paymentStatus, fulfillmentStatus, notes}, writeFields) => {
        const update: Record<string, unknown> = {};
        if (status !== undefined && (writeFields as any).status) update.status = status;
        if (paymentStatus !== undefined && (writeFields as any).paymentStatus) update.paymentStatus = paymentStatus;
        if (fulfillmentStatus !== undefined && (writeFields as any).fulfillmentStatus) update.fulfillmentStatus = fulfillmentStatus;
        if (notes !== undefined && (writeFields as any).notes) update.notes = notes;
        return update;
    },
    rateLimits: {read: 60, write: 30, delete: 10},
    // Lifecycle mutations: POST /api/eCommerce/productOrder/{confirm|markProcessing|ship|cancel|refund}
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
                .limit(limit)
                .lean(),
            ProductOrder.countDocuments(filter),
        ]);

        return {data: orders.map(productOrderToDTO as any), total, page, limit};
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
        }).lean();

        if (!order) throw apiValidationException("order_not_found", null, null, languageCode);

        return {data: productOrderToDTO(order as any)};
    }),
);
