import {Router} from "express";
import {ObjectId} from "mongodb";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW, {AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {orderDeliveryService} from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery.service";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import {getModelCollectedData} from "@coreModule/database/collections";
import type {TableResponse} from "armonia/src/modules/core/types/shared.types";
import type {OrderDelivery as OrderDeliveryDto} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/orderDelivery/orderDelivery.dto";
import {OrderDeliveryFormType} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/orderDelivery/orderDelivery.form.type";
import {orderDeliveryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/orderDelivery/orderDelivery.form.validator";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import OrderDelivery from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery";
import {orderDeliveriesToDTO} from "@eCommerceModule/utilities/mappers/orderDelivery/orderDeliveryMapper.dto";

/**
 * List-only. Mutations live on OrderActions:
 * - submitDelivery → POST /api/eCommerceMarketplace/order/submitDelivery
 * - acceptDelivery → POST /api/eCommerceMarketplace/order/acceptDelivery
 */
export const basePath = "/api/eCommerceMarketplace/orderDelivery";
export const router = Router();

router.post(
    "",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(orderDeliveryFormSchema),
    asyncHandler(getOrderDeliveries),
);

async function getOrderDeliveries(
    params: AuthenticatedMWType & OrderDeliveryFormType,
): Promise<TableResponse<OrderDeliveryDto>> {
    const {logger, languageCode, actionUserCtx, company, limit, offset, orderId} = params;

    logger.start("Fetching order deliveries...");

    if (!orderId) {
        return {data: [], total: 0};
    }

    await orderService.findOneOrThrow(
        {_id: new ObjectId(orderId), company: company._id},
        {logger, languageCode},
    );

    const sanitizedFields = SchemaGuard.sanitizeFields(
        OrderDelivery,
        getModelCollectedData("orderdeliveries").readFields ?? {},
        "read",
        actionUserCtx,
        languageCode,
    );
    const populate = SchemaGuard.generatePopulate(sanitizedFields, OrderDelivery.schema);

    const filter = {order: new ObjectId(orderId), company: company._id};

    const [items, total] = await Promise.all([
        orderDeliveryService.find(
            filter,
            {logger, languageCode},
            populate.populate,
            populate.select || "",
            {createdAt: -1},
            limit,
            offset,
        ),
        orderDeliveryService.count(filter, {logger, languageCode}),
    ]);

    logger.finish("Finished fetching order deliveries!");

    return {
        data: orderDeliveriesToDTO(items),
        total,
    };
}
