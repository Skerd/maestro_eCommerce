import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {productOrderToDTO, productOrdersToDTO, productOrderToSelect, productOrdersToSelect} from "@eCommerceModule/utilities/mappers/productOrderMapper.dto";
import {z} from "zod";

const orderStatuses = ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"] as const;
const paymentStatuses = ["pending", "paid", "failed", "refunded", "partially_refunded"] as const;
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
});

// Update order status
router.post(
    "/update-status",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 30}),
    asyncHandler(async (req: any, res: any) => {
        const {logger, languageCode, company, actionUserCtx} = req;
        const {orderId, status, notes} = req.body;

        if (!orderId || !status) return res.status(400).json({message: "orderId and status required"});
        if (!orderStatuses.includes(status)) return res.status(400).json({message: "invalid_status"});

        const order = await productOrderService.findOneOrThrow(
            {_id: new ObjectId(orderId), company: company._id},
            {logger, languageCode},
        );

        const timelineEntry = {
            status,
            notes: notes || undefined,
            changedBy: actionUserCtx.userId,
            changedAt: new Date(),
        };

        await ProductOrder.updateOne(
            {_id: order._id},
            {
                $set: {status},
                $push: {timeline: timelineEntry} as any,
            },
        );

        const updated = await productOrderService.findById(order._id, {logger, languageCode});
        return res.json({data: updated ? productOrderToDTO(updated) : null});
    }),
);

// Cancel order
router.post(
    "/cancel",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 10}),
    asyncHandler(async (req: any, res: any) => {
        const {logger, languageCode, company, actionUserCtx} = req;
        const {orderId, reason} = req.body;

        if (!orderId) return res.status(400).json({message: "orderId required"});

        const order = await productOrderService.findOneOrThrow(
            {_id: new ObjectId(orderId), company: company._id},
            {logger, languageCode},
        );

        if (["shipped", "delivered", "cancelled"].includes(order.status)) {
            return res.status(400).json({message: "order_cannot_be_cancelled"});
        }

        await ProductOrder.updateOne(
            {_id: order._id},
            {
                $set: {status: "cancelled"},
                $push: {
                    timeline: {
                        status: "cancelled",
                        notes: reason || "Cancelled by admin",
                        changedBy: actionUserCtx.userId,
                        changedAt: new Date(),
                    },
                } as any,
            },
        );

        const updated = await productOrderService.findById(order._id, {logger, languageCode});
        return res.json({data: updated ? productOrderToDTO(updated) : null});
    }),
);
