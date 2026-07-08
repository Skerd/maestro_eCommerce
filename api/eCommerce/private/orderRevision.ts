import { Router } from "express";
import { ObjectId } from "mongodb";
import { asyncHandler } from "@coreModule/utilities/middlewares/asyncHandler";
import { transactionHandler } from "@coreModule/utilities/middlewares/transactionHandler";
import { TransactionRequiredParams } from "@coreModule/utilities/middlewares/transactionUtils";
import authMW, { AuthenticatedMWType } from "@coreModule/utilities/middlewares/authMW";
import { rateLimiter } from "@coreModule/utilities/middlewares/rateLimiter";
import { validateFormZod } from "@coreModule/utilities/middlewares/validateFormZod";
import { orderDeliveryService } from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery.service";
import { orderRevisionService } from "@eCommerceModule/database/schemas/orderRevision/orderRevision.service";
import { orderService } from "@eCommerceMarketplaceModule/database/schemas/order/order.service";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import OrderRevision from "@eCommerceModule/database/schemas/orderRevision/orderRevision";
import { CreateOrderRevisionFormType } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderRevision/createOrderRevision.form.type";
import { createOrderRevisionFormSchema } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderRevision/createOrderRevision.form.validator";
import { OrderRevisionFormType } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderRevision/orderRevision.form.type";
import { orderRevisionFormSchema } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderRevision/orderRevision.form.validator";
import { OrderRevisionFormResponseType } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderRevision/orderRevision.form.response.type";
import { apiValidationException } from "armonia/src/modules/core/helpers/exceptions";

const router = Router();

const MAX_REVISIONS = 3;

/**
 * POST /api/eCommerce/orderRevision
 * List revisions for an order. Customer or provider of the order only.
 */
router.post(
    "",
    authMW("private"),
    rateLimiter({ windowMs: 60000, max: 60 }),
    validateFormZod(orderRevisionFormSchema),
    asyncHandler(getOrderRevisions)
);

async function getOrderRevisions(
    params: AuthenticatedMWType & OrderRevisionFormType
): Promise<OrderRevisionFormResponseType> {
    const { logger, languageCode, actionUserCtx, company, orderId, page, limit } = params;

    logger.start("Fetching order revisions...");

    if (!orderId) {
        return { data: [], total: 0 };
    }

    const order = await orderService.findOneOrThrow(
        { _id: new ObjectId(orderId), company: company._id },
        { logger, languageCode }
    );

    const customerId = (order as any).customer?._id?.toString?.() || (order as any).customer?.toString?.();
    const providerId = (order as any).provider?._id?.toString?.() || (order as any).provider?.toString?.();
    const currentUserId = actionUserCtx.userId?.toString?.();

    if (!actionUserCtx.isAdmin && customerId !== currentUserId && providerId !== currentUserId) {
        throw apiValidationException("only_order_parties_can_view_revisions", null, null, languageCode);
    }

    const filter = { order: new ObjectId(orderId), company: (order as any).company };
    const pageNum = page || 1;
    const limitNum = limit || 50;
    const skip = (pageNum - 1) * limitNum;

    const [revisions, total] = await Promise.all([
        orderRevisionService.find(filter, { logger, languageCode }, null, "_id order delivery requestedBy reason status createdAt", { createdAt: -1 }, limitNum, skip),
        orderRevisionService.count(filter, { logger, languageCode }),
    ]);

    logger.finish(`Fetched ${revisions.length} revisions`);

    return {
        data: revisions.map((r: any) => ({
            _id: r._id.toString(),
            orderId: (r.order?._id ?? r.order)?.toString?.() ?? "",
            deliveryId: (r.delivery?._id ?? r.delivery)?.toString?.() ?? "",
            requestedById: (r.requestedBy?._id ?? r.requestedBy)?.toString?.() ?? "",
            reason: r.reason,
            status: r.status,
            createdAt: r.createdAt?.toISOString?.(),
        })),
        total,
    };
}

/**
 * PUT /api/eCommerce/orderRevision
 * Request revision on a delivery (customer only).
 */
router.put(
    "",
    authMW("private"),
    rateLimiter({ windowMs: 60000, max: 20 }),
    transactionHandler(),
    validateFormZod(createOrderRevisionFormSchema),
    asyncHandler(createOrderRevision)
);

async function createOrderRevision(
    params: TransactionRequiredParams & AuthenticatedMWType & CreateOrderRevisionFormType
) {
    const typedParams = params;
    const { logger, languageCode, session, company, actionUserCtx } = typedParams;
    const { deliveryId, reason } = typedParams;

    logger.start(`Creating revision request for delivery: ${deliveryId}...`);

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
        { session, logger, languageCode }
    );

    const customerId = (order as any).customer?._id || (order as any).customer;
    if (customerId?.toString?.() !== actionUserCtx.userId?.toString?.()) {
        throw apiValidationException("only_customer_can_request_revision", null, null, languageCode);
    }

    if ((delivery as any).status !== "submitted") {
        throw apiValidationException("delivery_already_processed", null, null, languageCode);
    }

    const existingRevisionCount = await orderRevisionService.count(
        { order: orderId, company: (order as any).company },
        { session, logger, languageCode }
    );
    if (existingRevisionCount >= MAX_REVISIONS) {
        throw apiValidationException("max_revisions_reached", null, null, languageCode);
    }

    SchemaGuard.checkModelPermission(OrderRevision, "create", actionUserCtx, languageCode);

    await orderDeliveryService.updateById(
        new ObjectId(deliveryId),
        { $set: { status: "revision_requested" } },
        { session, logger, languageCode, auditUserId: actionUserCtx.userId, returnNew: true }
    );

    const revisionData = {
        order: orderId,
        delivery: new ObjectId(deliveryId),
        requestedBy: actionUserCtx.userId,
        reason: reason.trim(),
        status: "pending",
        company: (order as any).company,
    };

    await orderRevisionService.create(revisionData as any, {
        session,
        logger,
        languageCode,
        auditUserId: actionUserCtx.userId,
    });

    await orderService.updateById(
        orderId,
        { $set: { status: "in_progress" } },
        { session, logger, languageCode, auditUserId: actionUserCtx.userId, returnNew: false }
    );

    logger.finish(`Successfully created revision request for delivery: ${deliveryId}`);

    return { success: true };
}

export { router };
