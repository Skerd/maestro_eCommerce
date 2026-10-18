import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW, {AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {orderMilestoneService} from "@eCommerceModule/database/schemas/orderMilestone/orderMilestone.service";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import {getModelCollectedData} from "@coreModule/database/collections";
import type {TableResponse} from "armonia/src/modules/core/types/shared.types";
import type {OrderMilestone as OrderMilestoneDto} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/orderMilestone/orderMilestone.dto";
import {OrderMilestoneFormType} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/orderMilestone/orderMilestone.form.type";
import {orderMilestoneFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/orderMilestone/orderMilestone.form.validator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import OrderMilestone from "@eCommerceModule/database/schemas/orderMilestone/orderMilestone";
import {orderMilestonesToDTO} from "@eCommerceModule/utilities/mappers/orderMilestone/orderMilestoneMapper.dto";

/**
 * List-only. Mutations live on OrderActions:
 * - createMilestone → POST /api/eCommerceMarketplace/order/createMilestone
 * - releaseMilestone → POST /api/eCommerceMarketplace/order/releaseMilestone
 */
export const basePath = "/api/eCommerceMarketplace/orderMilestone";
export const router = Router();

router.post(
    "",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(orderMilestoneFormSchema),
    asyncHandler(getOrderMilestones),
);

async function getOrderMilestones(
    params: AuthenticatedMWType & OrderMilestoneFormType,
): Promise<TableResponse<OrderMilestoneDto>> {
    const {logger, languageCode, actionUserCtx, company, limit, offset, orderId} = params;

    logger.start("Fetching order milestones...");

    if (!orderId) {
        return {data: [], total: 0};
    }

    await orderService.findOneOrThrow(
        {_id: new ObjectId(orderId), company: company._id},
        {logger, languageCode},
    );

    const sanitizedFields = SchemaGuard.sanitizeFields(
        OrderMilestone,
        getModelCollectedData("ordermilestones").readFields ?? {},
        "read",
        actionUserCtx,
        languageCode,
    );
    const populate = SchemaGuard.generatePopulate(sanitizedFields, OrderMilestone.schema);

    const filter = {order: new ObjectId(orderId), company: company._id};

    const [items, total] = await Promise.all([
        orderMilestoneService.find(
            filter,
            {logger, languageCode},
            populate.populate,
            populate.select || "",
            {orderIndex: 1},
            limit,
            offset,
        ),
        orderMilestoneService.count(filter, {logger, languageCode}),
    ]);

    logger.finish("Finished fetching order milestones!");

    return {
        data: orderMilestonesToDTO(items),
        total,
    };
}
