import { Router } from "express";
import { ObjectId } from "mongodb";
import { asyncHandler } from "@coreModule/utilities/middlewares/asyncHandler";
import { transactionHandler, TransactionRequiredParams } from "@coreModule/utilities/middlewares/transactionUtils";
import authMW, { AuthenticatedMWType } from "@coreModule/utilities/middlewares/authMW";
import { rateLimiter } from "@coreModule/utilities/middlewares/rateLimiter";
import { validateFormZod } from "@coreModule/utilities/middlewares/validateFormZod";
import { orderDeliveryService } from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery.service";
import { orderService } from "@eCommerceMarketplaceModule/database/schemas/order/order.service";
import { createEscrowReleaseAndFee } from "@eCommerceModule/utilities/escrowHelper";
import {COLLECTED_DATA} from "@coreModule/database/collections";
import {
    OrderDeliveryFormResponseType,
    OrderDelivery as OrderDeliveryData,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/orderDelivery/orderDelivery.form.response.type";
import { OrderDeliveryFormType } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderDelivery/orderDelivery.form.type";
import { orderDeliveryFormSchema } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderDelivery/orderDelivery.form.validator";
import { CreateOrderDeliveryFormType } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderDelivery/createOrderDelivery.form.type";
import { createOrderDeliveryFormSchema } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderDelivery/createOrderDelivery.form.validator";
import { AcceptOrderDeliveryFormType } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderDelivery/acceptOrderDelivery.form.type";
import { acceptOrderDeliveryFormSchema } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderDelivery/acceptOrderDelivery.form.validator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import OrderDelivery from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery";
import { orderDeliveryToDTO, orderDeliveriesToDTO } from "@eCommerceModule/utilities/mappers/orderDeliveryMapper.dto";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";

const router = Router();

/**
 * POST /api/eCommerce/orderDelivery
 * List deliveries for an order.
 */
router.post(
    "",
    authMW("private"),
    rateLimiter({ windowMs: 60000, max: 60 }),
    validateFormZod(orderDeliveryFormSchema),
    asyncHandler(getOrderDeliveries)
);

async function getOrderDeliveries(
    params: AuthenticatedMWType & OrderDeliveryFormType
): Promise<OrderDeliveryFormResponseType> {
    const { logger, languageCode, actionUserCtx, company, limit, page, orderId } = params;

    logger.start("Fetching order deliveries...");

    if (!orderId) {
        return { data: [], total: 0 };
    }

    await orderService.findOneOrThrow(
        { _id: new ObjectId(orderId), company: company._id },
        { logger, languageCode }
    );

    const sanitizedFields = SchemaGuard.sanitizeFields(
        OrderDelivery,
        COLLECTED_DATA.orderdeliveries?.readFields ?? [],
        "read",
        actionUserCtx,
        languageCode
    );
    const populate = SchemaGuard.generatePopulate(sanitizedFields, OrderDelivery.schema);

    const filter = { order: new ObjectId(orderId), company: company._id };
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
        orderDeliveryService.find(
            filter,
            { logger, languageCode },
            populate.populate,
            populate.select || "",
            { createdAt: -1 },
            limitNum,
            skip
        ),
        orderDeliveryService.count(filter, { logger, languageCode }),
    ]);

    logger.finish("Finished fetching order deliveries!");

    return {
        data: orderDeliveriesToDTO(items),
        total,
    };
}

/**
 * PUT /api/eCommerce/orderDelivery
 * Submit delivery (provider only).
 */
router.put(
    "",
    authMW("private"),
    rateLimiter({ windowMs: 60000, max: 30 }),
    transactionHandler(),
    validateFormZod(createOrderDeliveryFormSchema),
    asyncHandler(createOrderDelivery)
);

async function createOrderDelivery(
    params: TransactionRequiredParams & AuthenticatedMWType & CreateOrderDeliveryFormType
): Promise<OrderDeliveryData> {
    const typedParams = params;
    const { logger, languageCode, session, company, actionUserCtx } = typedParams;
    const { orderId, message, attachmentIds } = typedParams;

    logger.start(`Creating delivery for order: ${orderId}...`);

    const order = await orderService.findOneOrThrow(
        { _id: new ObjectId(orderId), company: company._id },
        { session, logger, languageCode }
    );

    const providerId = (order as any).provider?._id || (order as any).provider;
    if (providerId?.toString?.() !== actionUserCtx.userId?.toString?.()) {
        throw apiValidationException("only_provider_can_deliver", null, null, languageCode);
    }

    if ((order as any).status !== "in_progress" && (order as any).status !== "accepted") {
        throw apiValidationException("order_not_in_progress", null, null, languageCode);
    }

    const existingDelivery = await orderDeliveryService.findOne(
        {order: new ObjectId(orderId), status: "submitted", company: company._id},
        {session, logger, languageCode},
    );
    if (existingDelivery) {
        throw apiValidationException("delivery_already_submitted", null, null, languageCode);
    }

    SchemaGuard.checkModelPermission(OrderDelivery, "create", actionUserCtx, languageCode);

    const deliveryData: any = {
        order: new ObjectId(orderId),
        company: (order as any).company,
        message: message?.trim() || "",
        attachments: (attachmentIds || []).map((id: string) => new ObjectId(id)),
        status: "submitted",
    };

    const delivery = await orderDeliveryService.create(deliveryData, {
        session,
        logger,
        languageCode,
        auditUserId: actionUserCtx.userId,
    });

    const populated = await orderDeliveryService.findById(
        delivery._id,
        { session, logger, languageCode },
        "order attachments",
        "_id order message attachments status"
    );

    logger.finish(`Successfully created delivery for order: ${orderId}`);

    return orderDeliveryToDTO(populated);
}

/**
 * PATCH /api/eCommerce/orderDelivery/accept
 * Accept delivery (customer only).
 */
router.patch(
    "/accept",
    authMW("private"),
    rateLimiter({ windowMs: 60000, max: 30 }),
    transactionHandler(),
    validateFormZod(acceptOrderDeliveryFormSchema),
    asyncHandler(acceptOrderDelivery)
);

async function acceptOrderDelivery(
    params: TransactionRequiredParams & AuthenticatedMWType & AcceptOrderDeliveryFormType
): Promise<OrderDeliveryData> {
    const typedParams = params;
    const { logger, languageCode, session, company, actionUserCtx } = typedParams;
    const { deliveryId } = typedParams;

    logger.start(`Accepting delivery: ${deliveryId}...`);

    const delivery = await orderDeliveryService.findById(
        new ObjectId(deliveryId),
        { session, logger, languageCode },
        "order",
        "_id order status"
    );

    if (!delivery) {
        throw apiValidationException("delivery_not_found", null, null, languageCode);
    }

    const orderId = (delivery.order as any)?._id || delivery.order;
    const order = await orderService.findOneOrThrow(
        { _id: orderId, company: company._id },
        { session, logger, languageCode },
        "currency",
        "_id amount currency company"
    );

    const customerId = (order as any).customer?._id || (order as any).customer;
    if (customerId?.toString?.() !== actionUserCtx.userId?.toString?.()) {
        throw apiValidationException("only_customer_can_accept", null, null, languageCode);
    }

    if ((delivery as any).status !== "submitted") {
        throw apiValidationException("delivery_already_processed", null, null, languageCode);
    }

    await orderDeliveryService.updateById(
        new ObjectId(deliveryId),
        { $set: { status: "accepted" } },
        { session, logger, languageCode, auditUserId: actionUserCtx.userId, returnNew: true }
    );

    await orderService.updateById(
        orderId,
        { $set: { status: "completed" } },
        { session, logger, languageCode, auditUserId: actionUserCtx.userId, returnNew: true }
    );

    const orderAmount = typeof (order as any).amount === "number" ? (order as any).amount : parseFloat(String((order as any).amount || 0));
    const currencyId = (order as any).currency?._id || (order as any).currency;
    const companyId = (order as any).company?._id || (order as any).company;
    if (orderAmount > 0 && currencyId && companyId) {
        await createEscrowReleaseAndFee(
            orderId,
            orderAmount,
            currencyId,
            companyId,
            { session, logger, languageCode, auditUserId: actionUserCtx.userId }
        );
    }

    const updated = await orderDeliveryService.findById(
        new ObjectId(deliveryId),
        { session, logger, languageCode },
        "order attachments",
        "_id order message attachments status"
    );

    logger.finish(`Successfully accepted delivery: ${deliveryId}`);

    return orderDeliveryToDTO(updated);
}

export { router };
