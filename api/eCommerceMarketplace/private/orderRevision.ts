import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW, {AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {orderRevisionService} from "@eCommerceModule/database/schemas/orderRevision/orderRevision.service";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import type {TableResponse} from "armonia/src/modules/core/types/shared.types";
import type {OrderRevision} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/orderRevision/orderRevision.dto";
import {OrderRevisionFormType} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/orderRevision/orderRevision.form.type";
import {orderRevisionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/orderRevision/orderRevision.form.validator";
import {orderRevisionsToDTO} from "@eCommerceModule/utilities/mappers/orderRevision/orderRevisionMapper.dto";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";

/**
 * List-only. Mutations live on OrderActions:
 * - requestRevision → POST /api/eCommerceMarketplace/order/requestRevision
 */
export const basePath = "/api/eCommerceMarketplace/orderRevision";
export const router = Router();

router.post(
    "",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(orderRevisionFormSchema),
    asyncHandler(getOrderRevisions),
);

async function getOrderRevisions(
    params: AuthenticatedMWType & OrderRevisionFormType,
): Promise<TableResponse<OrderRevision>> {
    const {logger, languageCode, actionUserCtx, company, orderId, page, limit} = params;

    logger.start("Fetching order revisions...");

    if (!orderId) {
        return {data: [], total: 0};
    }

    const order = await orderService.findOneOrThrow(
        {_id: new ObjectId(orderId), company: company._id},
        {logger, languageCode},
    );

    const customerId = (order as any).customer?._id?.toString?.() || (order as any).customer?.toString?.();
    const providerId = (order as any).provider?._id?.toString?.() || (order as any).provider?.toString?.();
    const currentUserId = actionUserCtx.userId?.toString?.();

    if (!actionUserCtx.isAdmin && customerId !== currentUserId && providerId !== currentUserId) {
        throw apiValidationException("only_order_parties_can_view_revisions", null, null, languageCode);
    }

    const filter = {order: new ObjectId(orderId), company: (order as any).company};
    const pageNum = page || 1;
    const limitNum = limit || 50;
    const skip = (pageNum - 1) * limitNum;

    const [revisions, total] = await Promise.all([
        orderRevisionService.find(
            filter,
            {logger, languageCode},
            null,
            "_id order delivery requestedBy reason status createdAt",
            {createdAt: -1},
            limitNum,
            skip,
        ),
        orderRevisionService.count(filter, {logger, languageCode}),
    ]);

    logger.finish(`Fetched ${revisions.length} revisions`);

    return {
        data: orderRevisionsToDTO(revisions),
        total,
    };
}
