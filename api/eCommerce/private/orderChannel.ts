// import { Router } from "express";
// import { ObjectId } from "mongodb";
// import { asyncHandler } from "@coreModule/utilities/middlewares/asyncHandler";
// import { transactionHandler } from "@coreModule/utilities/middlewares/transactionHandler";
// import authMW, { AuthenticatedMWType } from "@coreModule/utilities/middlewares/authMW";
// import { rateLimiter } from "@coreModule/utilities/middlewares/rateLimiter";
// import { validateFormZod } from "@coreModule/utilities/middlewares/validateFormZod";
// import { channelService } from "@coreModule/database/services";
// import { orderService } from "@eCommerceMarketplaceModule/database/schemas/order/order.service";
// import { channelToDTO } from "@coreModule/utilities/mappers/dbToDTO/channelMapper.dto";
// import SchemaGuard from "@coreModule/database/security/schemaGuard";
// import Channel from "@coreModule/database/schemas/channel/channel";
// import { GetOrderChannelFormResponseType } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderChannel/getOrderChannel.form.response.type";
// import { GetOrderChannelFormType } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderChannel/getOrderChannel.form.type";
// import { getOrderChannelFormSchema } from "armonia/src/modules/eCommerce/api/eCommerce/private/orderChannel/getOrderChannel.form.validator";
// import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
//
// const router = Router();
//
// /**
//  * POST /api/eCommerce/orderChannel
//  * Get or create chat channel for an order. Returns the channel for customer/provider to message each other.
//  */
// router.post(
//     "",
//     authMW("private"),
//     rateLimiter({ windowMs: 60000, max: 30 }),
//     transactionHandler(),
//     validateFormZod(getOrderChannelFormSchema),
//     asyncHandler(getOrCreateOrderChannel)
// );
//
// async function getOrCreateOrderChannel(
//     params: (GetOrderChannelFormType & AuthenticatedMWType) & { session: any }
// ): Promise<GetOrderChannelFormResponseType> {
//     const { logger, languageCode, session, company, actionUserCtx, userInfo } = params;
//     const { orderId } = params;
//
//     logger.start(`Getting or creating order channel for order: ${orderId}...`);
//
//     const order = await orderService.findById(
//         new ObjectId(orderId),
//         { session, logger, languageCode },
//         "customer provider",
//         "_id customer provider company"
//     );
//
//     if (!order) {
//         throw apiValidationException("order_not_found", null, null, languageCode);
//     }
//
//     if ((order as any).company?.toString?.() !== company._id.toString()) {
//         throw apiValidationException("order_not_found", null, null, languageCode);
//     }
//
//     const customerId = (order as any).customer?._id || (order as any).customer;
//     const providerId = (order as any).provider?._id || (order as any).provider;
//     const currentUserId = actionUserCtx.userId?.toString?.();
//
//     if (
//         customerId?.toString?.() !== currentUserId &&
//         providerId?.toString?.() !== currentUserId
//     ) {
//         throw apiValidationException("only_order_parties_can_access_chat", null, null, languageCode);
//     }
//
//     SchemaGuard.checkModelPermission(Channel, "create", actionUserCtx, languageCode);
//
//     const sanitized = SchemaGuard.sanitizeFields(Channel, ChannelFields, "read", actionUserCtx, languageCode);
//     const populate = SchemaGuard.generatePopulate(sanitized, Channel.schema);
//
//     const existingChannel = await channelService.findOne(
//         {
//             company: company._id,
//             "metadata.orderId": new ObjectId(orderId),
//             deleted: false,
//         },
//         { session, logger, languageCode },
//         populate.populate,
//         (populate.select || "") + " users"
//     );
//
//     if (existingChannel) {
//         const userIds = (existingChannel.users || []).map((u: any) => u._id?.toString?.() || u.toString());
//         if (userIds.includes(currentUserId)) {
//             logger.finish(`Found existing order channel: ${existingChannel._id}`);
//             const dto = await channelToDTO(existingChannel, currentUserId!, actionUserCtx);
//             return { channel: dto! };
//         }
//     }
//
//     const channelUsers = [customerId, providerId].filter(Boolean);
//     const uniqueUsers = [...new Set(channelUsers.map((id: any) => id.toString()))];
//
//     const newChannel = await channelService.create(
//         {
//             users: uniqueUsers.map((id) => new ObjectId(id)),
//             owner: actionUserCtx.userId,
//             company: company._id,
//             name: `Order ${orderId.slice(-6)}`,
//             isGroup: false,
//             adminUsers: [actionUserCtx.userId],
//             metadata: { orderId: new ObjectId(orderId) },
//         } as any,
//         { session, logger, languageCode, auditUserId: actionUserCtx.userId }
//     );
//
//     const createdChannel = await channelService.findById(
//         newChannel._id,
//         { session, logger, languageCode },
//         populate.populate,
//         populate.select || ""
//     );
//
//     logger.finish(`Created order channel: ${newChannel._id}`);
//
//     const dto = await channelToDTO(createdChannel!, currentUserId!, actionUserCtx);
//     return { channel: dto! };
// }
//
// export { router };
