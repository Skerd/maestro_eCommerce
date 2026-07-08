import { Router } from "express";
import { ObjectId } from "mongodb";
import { asyncHandler } from "@coreModule/utilities/middlewares/asyncHandler";
import { transactionHandler } from "@coreModule/utilities/middlewares/transactionHandler";
import { TransactionRequiredParams } from "@coreModule/utilities/middlewares/transactionUtils";
import authMW, { AuthenticatedMWType } from "@coreModule/utilities/middlewares/authMW";
import { rateLimiter } from "@coreModule/utilities/middlewares/rateLimiter";
import { validateFormZod } from "@coreModule/utilities/middlewares/validateFormZod";
import { orderMilestoneService } from "@eCommerceModule/database/schemas/orderMilestone/orderMilestone.service";
import { orderService } from "@eCommerceMarketplaceModule/database/schemas/order/order.service";
import { createEscrowReleaseAndFee } from "@eCommerceModule/utilities/escrowHelper";
import {COLLECTED_DATA} from "@coreModule/database/collections";
import {
    OrderMilestoneFormResponseType,
    OrderMilestone as OrderMilestoneData,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/orderMilestone/orderMilestone.form.response.type";
import { OrderMilestoneFormType } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderMilestone/orderMilestone.form.type";
import { orderMilestoneFormSchema } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderMilestone/orderMilestone.form.validator";
import { CreateOrderMilestoneFormType } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderMilestone/createOrderMilestone.form.type";
import { createOrderMilestoneFormSchema } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderMilestone/createOrderMilestone.form.validator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import OrderMilestone from "@eCommerceModule/database/schemas/orderMilestone/orderMilestone";
import { orderMilestoneToDTO, orderMilestonesToDTO } from "@eCommerceModule/utilities/mappers/orderMilestoneMapper.dto";
import { apiValidationException } from "armonia/src/modules/core/helpers/exceptions";
import { ReleaseOrderMilestoneFormType } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderMilestone/releaseOrderMilestone.form.type";
import { releaseOrderMilestoneFormSchema } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderMilestone/releaseOrderMilestone.form.validator";

const router = Router();

/**
 * POST /api/eCommerce/orderMilestone
 * List milestones for an order.
 */
router.post(
    "",
    authMW("private"),
    rateLimiter({ windowMs: 60000, max: 60 }),
    validateFormZod(orderMilestoneFormSchema),
    asyncHandler(getOrderMilestones)
);

async function getOrderMilestones(
    params: AuthenticatedMWType & OrderMilestoneFormType
): Promise<OrderMilestoneFormResponseType> {
    const { logger, languageCode, actionUserCtx, company, limit, page, orderId } = params;

    logger.start("Fetching order milestones...");

    if (!orderId) {
        return { data: [], total: 0 };
    }

    await orderService.findOneOrThrow(
        { _id: new ObjectId(orderId), company: company._id },
        { logger, languageCode }
    );

    const sanitizedFields = SchemaGuard.sanitizeFields(
        OrderMilestone,
        COLLECTED_DATA.ordermilestones?.readFields ?? [],
        "read",
        actionUserCtx,
        languageCode
    );
    const populate = SchemaGuard.generatePopulate(sanitizedFields, OrderMilestone.schema);

    const filter = { order: new ObjectId(orderId), company: company._id };
    const pageNum = page ?? 1;
    const limitNum = limit ?? 50;
    const skip = (pageNum - 1) * limitNum;

    const [items, total] = await Promise.all([
        orderMilestoneService.find(
            filter,
            { logger, languageCode },
            populate.populate,
            populate.select || "",
            { orderIndex: 1 },
            limitNum,
            skip
        ),
        orderMilestoneService.count(filter, { logger, languageCode }),
    ]);

    logger.finish("Finished fetching order milestones!");

    return {
        data: orderMilestonesToDTO(items),
        total,
    };
}

/**
 * PUT /api/eCommerce/orderMilestone
 * Create a milestone for an order (customer only, when creating order).
 */
router.put(
    "",
    authMW("private"),
    rateLimiter({ windowMs: 60000, max: 30 }),
    transactionHandler(),
    validateFormZod(createOrderMilestoneFormSchema),
    asyncHandler(createOrderMilestone)
);

async function createOrderMilestone(
    params: TransactionRequiredParams & AuthenticatedMWType & CreateOrderMilestoneFormType
): Promise<OrderMilestoneData> {
    const { logger, languageCode, session, company, actionUserCtx } = params;
    const { orderId, name, amount, currencyId, orderIndex } = params;

    logger.start(`Creating milestone for order: ${orderId}...`);

    const order = await orderService.findOneOrThrow(
        { _id: new ObjectId(orderId), company: company._id },
        { session, logger, languageCode }
    );

    // Validate total milestone amounts do not exceed the order amount
    const existingMilestones = await orderMilestoneService.find(
        { order: new ObjectId(orderId), company: (order as any).company },
        { session, logger, languageCode },
        null,
        "amount",
        {},
        100,
        0
    );
    const existingTotal = existingMilestones.reduce((s: number, m: any) => s + (typeof m.amount === "number" ? m.amount : parseFloat(String(m.amount || 0))), 0);
    const orderAmount = typeof (order as any).amount === "number" ? (order as any).amount : 0;
    if (existingTotal + amount > orderAmount) {
        throw apiValidationException("milestone_total_exceeds_order_amount", null, null, languageCode);
    }

    SchemaGuard.checkModelPermission(OrderMilestone, "create", actionUserCtx, languageCode);

    const milestoneData = {
        order: new ObjectId(orderId),
        company: (order as any).company,
        name: name.trim(),
        amount,
        currency: new ObjectId(currencyId),
        status: "pending",
        orderIndex: orderIndex ?? 0,
    };

    const milestone = await orderMilestoneService.create(milestoneData as any, {
        session,
        logger,
        languageCode,
        auditUserId: actionUserCtx.userId,
    });

    const populated = await orderMilestoneService.findById(
        milestone._id,
        { session, logger, languageCode },
        "order currency",
        "_id order name amount currency status orderIndex"
    );

    logger.finish(`Successfully created milestone: ${name}`);

    return orderMilestoneToDTO(populated);
}

/**
 * PATCH /api/eCommerce/orderMilestone/release
 * Release a milestone payment to the provider (customer only).
 */
router.patch(
    "/release",
    authMW("private"),
    rateLimiter({ windowMs: 60000, max: 20 }),
    transactionHandler(),
    validateFormZod(releaseOrderMilestoneFormSchema),
    asyncHandler(releaseOrderMilestone)
);

async function releaseOrderMilestone(
    params: TransactionRequiredParams & AuthenticatedMWType & ReleaseOrderMilestoneFormType
): Promise<OrderMilestoneData> {
    const { logger, languageCode, session, company, actionUserCtx, milestoneId } = params;

    logger.start(`Releasing milestone: ${milestoneId}...`);

    const milestone = await orderMilestoneService.findById(
        new ObjectId(milestoneId),
        { session, logger, languageCode },
        "order currency",
        "_id order name amount currency status orderIndex company"
    );

    if (!milestone) {
        throw apiValidationException("milestone_not_found", null, null, languageCode);
    }

    const milestoneCompanyId = (milestone as any).company?._id?.toString?.() ?? (milestone as any).company?.toString?.();
    if (milestoneCompanyId !== company._id.toString()) {
        throw apiValidationException("milestone_not_found", null, null, languageCode);
    }

    if ((milestone as any).status !== "pending") {
        throw apiValidationException("milestone_already_released", null, null, languageCode);
    }

    const orderId = (milestone.order as any)?._id || milestone.order;
    const order = await orderService.findOneOrThrow(
        { _id: orderId, company: company._id },
        { session, logger, languageCode }
    );

    const customerId = (order as any).customer?._id?.toString?.() || (order as any).customer?.toString?.();
    if (customerId !== actionUserCtx.userId?.toString?.()) {
        throw apiValidationException("only_customer_can_release_milestone", null, null, languageCode);
    }

    if ((order as any).status !== "in_progress") {
        throw apiValidationException("order_must_be_in_progress_to_release", null, null, languageCode);
    }

    const milestoneAmount = typeof (milestone as any).amount === "number"
        ? (milestone as any).amount
        : parseFloat(String((milestone as any).amount || 0));
    const currencyId = (milestone.currency as any)?._id || milestone.currency;

    await orderMilestoneService.updateById(
        new ObjectId(milestoneId),
        { $set: { status: "released" } },
        { session, logger, languageCode, auditUserId: actionUserCtx.userId, returnNew: true }
    );

    await createEscrowReleaseAndFee(orderId, milestoneAmount, currencyId, company._id, {
        session,
        logger,
        languageCode,
        auditUserId: actionUserCtx.userId,
    });

    // If all milestones are released, auto-complete the order
    const pendingMilestones = await orderMilestoneService.count(
        { order: orderId, company: company._id, status: "pending" },
        { session, logger, languageCode }
    );

    if (pendingMilestones === 0) {
        await orderService.updateById(
            orderId,
            { $set: { status: "completed" } },
            { session, logger, languageCode, auditUserId: actionUserCtx.userId, returnNew: true }
        );
    }

    const populated = await orderMilestoneService.findById(
        new ObjectId(milestoneId),
        { session, logger, languageCode },
        "order currency",
        "_id order name amount currency status orderIndex"
    );

    logger.finish(`Successfully released milestone: ${milestoneId}`);

    return orderMilestoneToDTO(populated);
}

export { router };
