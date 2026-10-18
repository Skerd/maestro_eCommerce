import {ObjectId} from "mongodb";
import {action} from "@coreModule/api/actionDecorator";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {extendOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/order/extendOrder.form.validator";
import {submitOrderDeliveryFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/order/submitOrderDelivery.form.validator";
import {createOrderFromListingFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/order/createOrderFromListing.form.validator";
import {requestRevisionFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/order/requestRevision.form.validator";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import OrderDelivery from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery";
import OrderRevision from "@eCommerceModule/database/schemas/orderRevision/orderRevision";
import {orderDeliveryService} from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery.service";
import {orderRevisionService} from "@eCommerceModule/database/schemas/orderRevision/orderRevision.service";
import {disputeService} from "@eCommerceModule/database/schemas/dispute/dispute.service";
import {listingService} from "@eCommerceModule/database/schemas/listing/listing.service";
import {listingPackageService} from "@eCommerceModule/database/schemas/listingPackage/listingPackage.service";
import {listingAddOnService} from "@eCommerceModule/database/schemas/listingAddOn/listingAddOn.service";
import {providerProfileService} from "@eCommerceModule/database/schemas/providerProfile/providerProfile.service";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import {createEscrowHold, createEscrowRefund, createEscrowReleaseAndFee} from "@financeModule/utilities/escrowHelper";
import {emitNotificationEvent} from "@coreModule/domain/notifications/notificationEventBus";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import {completeSubmittedDeliveryAndRelease} from "@eCommerceModule/database/schemas/order/orderDeliveryCompletion";
import {orderMilestoneService} from "@eCommerceModule/database/schemas/orderMilestone/orderMilestone.service";
import OrderMilestone from "@eCommerceModule/database/schemas/orderMilestone/orderMilestone";
import {createOrderMilestoneFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/orderMilestone/createOrderMilestone.form.validator";
import {releaseOrderMilestoneFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/orderMilestone/releaseOrderMilestone.form.validator";
import type {ActionMessage} from "armonia/src/modules/core/types/shared.types";
import {getECommerceMarketplaceConfig} from "@eCommerceModule/utilities/config";

export class OrderActions {
    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 20},
        transaction: true,
        schema: createOrderFromListingFormSchema,
    })
    async createFromListing(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, listing: listingRef, package: packageRef, addOns: addOnRefs, note} = params;

        logger.start(`Creating order from listing: ${listingRef}...`);

        const listing = await listingService.findOneOrThrow(
            {_id: new ObjectId(listingRef), status: "active", company: company._id},
            {session, logger, languageCode},
        );

        const providerId = (listing as any).provider?._id || (listing as any).provider;
        if (providerId?.toString?.() === actionUserCtx.userId?.toString?.()) {
            throw apiValidationException("provider_cannot_order_own_listing", null, null, languageCode);
        }

        let amount = (listing as any).price ?? 0;
        let currencyId = (listing as any).priceCurrency?._id || (listing as any).priceCurrency;
        let deliveryDays = (listing as any).deliveryDays ?? 1;

        if (packageRef) {
            const pkg = await listingPackageService.findOneOrThrow(
                {_id: new ObjectId(packageRef), listing: listing._id, company: company._id},
                {session, logger, languageCode},
            );
            amount = (pkg as any).price?.amount ?? amount;
            currencyId = (pkg as any).price?.currency?._id || (pkg as any).price?.currency || currencyId;
            deliveryDays = (pkg as any).deliveryDays ?? deliveryDays;
        }

        if (addOnRefs?.length) {
            const addOns = await listingAddOnService.find(
                {_id: {$in: addOnRefs.map((id: string) => new ObjectId(id))}, listing: listing._id, company: company._id},
                {session, logger, languageCode},
                null,
                "_id price deliveryDays",
            );
            for (const addOn of addOns) {
                amount += (addOn as any).price?.amount ?? 0;
                deliveryDays += (addOn as any).deliveryDays ?? 0;
            }
        }

        if (!currencyId) {
            throw apiValidationException("listing_has_no_currency", null, null, languageCode);
        }

        const deliveryDueDate = new Date(Date.now() + deliveryDays * 24 * 60 * 60 * 1000);

        const order = await orderService.create(
            {
                listing: listing._id,
                customer: new ObjectId(actionUserCtx.userId),
                provider: providerId,
                amount,
                currency: currencyId,
                status: "pending",
                company: company._id,
                deliveryDueDate,
            } as any,
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const listingTitle = (listing as any).title ?? "";
        const providerIdStr = providerId?.toString?.() ?? "";

        if (providerIdStr) {
            emitNotificationEvent(NotificationEventCodes.ORDER_CREATED_FROM_LISTING, {
                receiverIds: [providerIdStr],
                payload: {
                    companyId: company._id.toString(),
                    languageCode,
                    orderId: order._id.toString(),
                    listingId: listing._id.toString(),
                    listingTitle,
                },
            });
        }

        logger.finish(`Successfully created order from listing: ${listingRef}`);

        return {message: "Order created successfully"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validateSingleForm,
    })
    async accept(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;

        logger.start(`Accepting order: ${_id}...`);

        const order = await orderService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        const providerId = (order as any).provider?._id || (order as any).provider;
        if (providerId?.toString?.() !== actionUserCtx.userId?.toString?.()) {
            throw apiValidationException("only_provider_can_accept", null, null, languageCode);
        }

        if ((order as any).status !== "pending") {
            throw apiValidationException("order_not_pending", null, null, languageCode);
        }

        await orderService.updateByIdOrThrow(
            order._id,
            {$set: {status: "accepted"}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const orderAmount = typeof (order as any).amount === "number"
            ? (order as any).amount
            : parseFloat(String((order as any).amount || 0));
        const currencyId = (order as any).currency?._id || (order as any).currency;
        const companyId = (order as any).company?._id || (order as any).company;

        if (orderAmount > 0 && currencyId && companyId) {
            await createEscrowHold(order._id, orderAmount, currencyId, companyId, {session, logger, languageCode, auditUserId: actionUserCtx.userId});
        }

        const customerId = (order as any).customer?._id || (order as any).customer;
        const customerIdStr = customerId?.toString?.() ?? "";
        if (customerIdStr) {
            emitNotificationEvent(NotificationEventCodes.ORDER_ACCEPTED, {
                receiverIds: [customerIdStr],
                payload: {
                    companyId: companyId?.toString?.() ?? company._id.toString(),
                    languageCode,
                    orderId: order._id.toString(),
                    orderName: (order as any).name ?? "",
                },
            });
        }

        logger.finish(`Successfully accepted order: ${_id}`);

        return {message: "Order accepted successfully"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validateSingleForm,
    })
    async start(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;

        logger.start(`Starting order: ${_id}...`);

        const order = await orderService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        const providerId = (order as any).provider?._id || (order as any).provider;
        if (providerId?.toString?.() !== actionUserCtx.userId?.toString?.()) {
            throw apiValidationException("only_provider_can_start", null, null, languageCode);
        }

        if ((order as any).status !== "accepted") {
            throw apiValidationException("order_must_be_accepted_first", null, null, languageCode);
        }

        await orderService.updateByIdOrThrow(
            order._id,
            {$set: {status: "in_progress"}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const customerId = (order as any).customer?._id || (order as any).customer;
        const customerIdStr = customerId?.toString?.() ?? "";
        const companyId = (order as any).company?._id || (order as any).company;
        if (customerIdStr) {
            emitNotificationEvent(NotificationEventCodes.ORDER_STARTED, {
                receiverIds: [customerIdStr],
                payload: {
                    companyId: companyId?.toString?.() ?? company._id.toString(),
                    languageCode,
                    orderId: order._id.toString(),
                    orderName: (order as any).name ?? "",
                },
            });
        }

        logger.finish(`Successfully started order: ${_id}`);

        return {message: "Order started successfully"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: validateSingleForm,
    })
    async cancel(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;

        logger.start(`Cancelling order: ${_id}...`);

        const order = await orderService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        const providerId = (order as any).provider?._id || (order as any).provider;
        const customerId = (order as any).customer?._id || (order as any).customer;
        const isProvider = providerId?.toString?.() === actionUserCtx.userId?.toString?.();
        const isCustomer = customerId?.toString?.() === actionUserCtx.userId?.toString?.();

        if (!isProvider && !isCustomer) {
            throw apiValidationException("only_parties_can_cancel", null, null, languageCode);
        }

        const currentStatus = (order as any).status;
        if (currentStatus === "completed" || currentStatus === "cancelled") {
            throw apiValidationException("order_already_final", null, null, languageCode);
        }

        await orderService.updateByIdOrThrow(
            order._id,
            {$set: {status: "cancelled"}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const orderAmount = typeof (order as any).amount === "number"
            ? (order as any).amount
            : parseFloat(String((order as any).amount || 0));
        const currencyId = (order as any).currency?._id || (order as any).currency;
        const companyId = (order as any).company?._id || (order as any).company;

        if (["accepted", "in_progress"].includes(currentStatus) && orderAmount > 0 && currencyId && companyId) {
            await createEscrowRefund(order._id, orderAmount, currencyId, companyId, {session, logger, languageCode, auditUserId: actionUserCtx.userId});
        }

        const cancelledBy = isProvider ? "provider" : "customer";
        const otherPartyId = isProvider
            ? (customerId?.toString?.() ?? "")
            : (providerId?.toString?.() ?? "");

        if (otherPartyId) {
            emitNotificationEvent(NotificationEventCodes.ORDER_CANCELLED, {
                receiverIds: [otherPartyId],
                payload: {
                    companyId: companyId?.toString?.() ?? company._id.toString(),
                    languageCode,
                    orderId: order._id.toString(),
                    orderName: (order as any).name ?? "",
                    cancelledBy,
                },
            });
        }

        logger.finish(`Successfully cancelled order: ${_id}`);

        return {message: "Order cancelled successfully"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 10},
        transaction: true,
        schema: extendOrderFormSchema,
    })
    async extend(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, additionalDays} = params;

        logger.start(`Extending order: ${_id}...`);

        const order = await orderService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        const providerId = (order as any).provider?._id || (order as any).provider;
        if (providerId?.toString?.() !== actionUserCtx.userId?.toString?.()) {
            throw apiValidationException("only_provider_can_extend", null, null, languageCode);
        }

        const status = (order as any).status;
        if (status === "completed" || status === "cancelled") {
            throw apiValidationException("cannot_extend_final_order", null, null, languageCode);
        }

        const baseDate = (order as any).deliveryDueDate || (order as any).createdAt || new Date();
        const currentDue = baseDate instanceof Date ? baseDate : new Date(baseDate);
        const newDue = new Date(currentDue);
        newDue.setDate(newDue.getDate() + additionalDays);

        await orderService.updateByIdOrThrow(
            order._id,
            {$set: {deliveryDueDate: newDue}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const customerId = (order as any).customer?._id || (order as any).customer;
        const customerIdStr = customerId?.toString?.() ?? "";
        const companyId = (order as any).company?._id || (order as any).company;
        if (customerIdStr) {
            emitNotificationEvent(NotificationEventCodes.ORDER_EXTENDED, {
                receiverIds: [customerIdStr],
                payload: {
                    companyId: companyId?.toString?.() ?? company._id.toString(),
                    languageCode,
                    orderId: order._id.toString(),
                    orderName: (order as any).name ?? "",
                    additionalDays,
                },
            });
        }

        logger.finish(`Successfully extended order: ${_id}`);

        return {message: "Order extended successfully"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 20},
        transaction: true,
        schema: submitOrderDeliveryFormSchema,
    })
    async submitDelivery(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, message, attachments} = params;

        logger.start(`Submitting delivery for order: ${_id}...`);

        const order = await orderService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        const providerId = (order as any).provider?._id || (order as any).provider;
        if (providerId?.toString?.() !== actionUserCtx.userId?.toString?.()) {
            throw apiValidationException("only_provider_can_deliver", null, null, languageCode);
        }

        if ((order as any).status !== "in_progress") {
            throw apiValidationException("order_not_in_progress", null, null, languageCode);
        }

        const existingDelivery = await orderDeliveryService.findOne(
            {order: order._id, status: "submitted", company: company._id},
            {session, logger, languageCode},
        );
        if (existingDelivery) {
            throw apiValidationException("delivery_already_submitted", null, null, languageCode);
        }

        SchemaGuard.checkModelPermission(OrderDelivery, "create", actionUserCtx, languageCode);

        await orderDeliveryService.create(
            {
                order: order._id,
                company: company._id,
                message: message?.trim?.() || "",
                attachments: (attachments || []).map((id: string) => new ObjectId(id)),
                status: "submitted",
            },
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const customerId = (order as any).customer?._id || (order as any).customer;
        const customerIdStr = customerId?.toString?.() ?? "";
        const companyId = (order as any).company?._id || (order as any).company;
        if (customerIdStr) {
            emitNotificationEvent(NotificationEventCodes.ORDER_DELIVERY_SUBMITTED, {
                receiverIds: [customerIdStr],
                payload: {
                    companyId: companyId?.toString?.() ?? company._id.toString(),
                    languageCode,
                    orderId: order._id.toString(),
                    orderName: (order as any).name ?? "",
                },
            });
        }

        logger.finish(`Successfully submitted delivery for order: ${_id}`);

        return {message: "Delivery submitted successfully"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 20},
        transaction: true,
        schema: validateSingleForm,
    })
    async acceptDelivery(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id} = params;

        logger.start(`Accepting delivery for order: ${_id}...`);

        const order = await orderService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
            "currency",
            "_id amount currency company status customer provider name",
        );

        const customerId = (order as any).customer?._id || (order as any).customer;
        if (customerId?.toString?.() !== actionUserCtx.userId?.toString?.()) {
            throw apiValidationException("only_customer_can_accept_delivery", null, null, languageCode);
        }

        if ((order as any).status !== "in_progress") {
            throw apiValidationException("order_not_in_progress", null, null, languageCode);
        }

        // Block acceptance if an open dispute exists
        const openDispute = await disputeService.findOne(
            {order: order._id, status: {$in: ["open", "under_review"]}, company: company._id},
            {session, logger, languageCode},
            null,
            "_id status",
        );
        if (openDispute) {
            throw apiValidationException("cannot_accept_delivery_with_open_dispute", null, null, languageCode);
        }

        const delivery = await orderDeliveryService.findOne(
            {order: order._id, status: "submitted", company: company._id},
            {session, logger, languageCode},
            null,
            "_id status",
        );
        if (!delivery) {
            throw apiValidationException("no_pending_delivery", null, null, languageCode);
        }

        await completeSubmittedDeliveryAndRelease(order, delivery, {
            session,
            logger,
            languageCode,
            auditUserId: actionUserCtx.userId,
            notifyProvider: true,
        });

        logger.finish(`Successfully accepted delivery for order: ${_id}`);

        return {message: "Order completed successfully"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 10},
        transaction: true,
        schema: requestRevisionFormSchema,
    })
    async requestRevision(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, _id, reason} = params;

        logger.start(`Requesting revision for order: ${_id}...`);

        const order = await orderService.findOneOrThrow(
            {_id: new ObjectId(_id), company: company._id},
            {session, logger, languageCode},
        );

        const customerId = (order as any).customer?._id || (order as any).customer;
        if (customerId?.toString?.() !== actionUserCtx.userId?.toString?.()) {
            throw apiValidationException("only_customer_can_request_revision", null, null, languageCode);
        }

        if ((order as any).status !== "in_progress") {
            throw apiValidationException("order_not_in_progress", null, null, languageCode);
        }

        const delivery = await orderDeliveryService.findOne(
            {order: order._id, status: "submitted", company: company._id},
            {session, logger, languageCode},
            null,
            "_id status",
        );
        if (!delivery) {
            throw apiValidationException("no_pending_delivery", null, null, languageCode);
        }

        const revisionCount = await orderRevisionService.count(
            {order: order._id, company: company._id},
            {session, logger, languageCode},
        );
        const {maxRevisions} = getECommerceMarketplaceConfig();
        if (revisionCount >= maxRevisions) {
            throw apiValidationException("max_revisions_reached", null, null, languageCode);
        }

        SchemaGuard.checkModelPermission(OrderRevision, "create", actionUserCtx, languageCode);

        await orderDeliveryService.updateByIdOrThrow(
            delivery._id,
            {$set: {status: "revision_requested"}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        await orderRevisionService.create(
            {
                order: order._id,
                delivery: delivery._id,
                company: company._id,
                requestedBy: new ObjectId(actionUserCtx.userId),
                reason: reason.trim(),
                status: "pending",
            } as any,
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        const providerId = (order as any).provider?._id || (order as any).provider;
        const providerIdStr = providerId?.toString?.() ?? "";
        const companyId = (order as any).company?._id || (order as any).company;
        if (providerIdStr) {
            emitNotificationEvent(NotificationEventCodes.ORDER_REVISION_REQUESTED, {
                receiverIds: [providerIdStr],
                payload: {
                    companyId: companyId?.toString?.() ?? company._id.toString(),
                    languageCode,
                    orderId: order._id.toString(),
                    orderName: (order as any).name ?? "",
                    reason,
                },
            });
        }

        logger.finish(`Successfully requested revision for order: ${_id}`);

        return {message: "Revision requested successfully"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 30},
        transaction: true,
        schema: createOrderMilestoneFormSchema,
    })
    async createMilestone(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, order: orderRef, name, amount, currency, orderIndex} = params;

        logger.start(`Creating milestone for order: ${orderRef}...`);

        const order = await orderService.findOneOrThrow(
            {_id: new ObjectId(orderRef), company: company._id},
            {session, logger, languageCode},
        );

        const customerId = (order as any).customer?._id || (order as any).customer;
        if (customerId?.toString?.() !== actionUserCtx.userId?.toString?.() && !actionUserCtx.isAdmin) {
            throw apiValidationException("only_customer_can_create_milestone", null, null, languageCode);
        }

        const existingMilestones = await orderMilestoneService.find(
            {order: new ObjectId(orderRef), company: company._id},
            {session, logger, languageCode},
            null,
            "amount",
            {},
            100,
            0,
        );
        const existingTotal = existingMilestones.reduce(
            (sum: number, m: any) => sum + (typeof m.amount === "number" ? m.amount : parseFloat(String(m.amount || 0))),
            0,
        );
        const orderAmount = typeof (order as any).amount === "number" ? (order as any).amount : 0;
        if (existingTotal + amount > orderAmount) {
            throw apiValidationException("milestone_total_exceeds_order_amount", null, null, languageCode);
        }

        SchemaGuard.checkModelPermission(OrderMilestone, "create", actionUserCtx, languageCode);

        await orderMilestoneService.create(
            {
                order: new ObjectId(orderRef),
                company: company._id,
                name: name.trim(),
                amount,
                currency: new ObjectId(currency),
                status: "pending",
                orderIndex: orderIndex ?? 0,
            } as any,
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        logger.finish(`Successfully created milestone for order: ${orderRef}`);

        return {message: "Milestone created successfully"};
    }

    @action({
        auth: "private",
        rateLimit: {windowMs: 60000, max: 20},
        transaction: true,
        schema: releaseOrderMilestoneFormSchema,
    })
    async releaseMilestone(params: Record<string, any>): Promise<ActionMessage> {
        const {logger, languageCode, session, company, actionUserCtx, milestone: milestoneRef} = params;

        logger.start(`Releasing milestone: ${milestoneRef}...`);

        const milestone = await orderMilestoneService.findById(
            new ObjectId(milestoneRef),
            {session, logger, languageCode},
            "order currency",
            "_id order name amount currency status orderIndex company",
        );

        if (!milestone) {
            throw apiValidationException("milestone_not_found", null, null, languageCode);
        }

        const milestoneCompanyId =
            (milestone as any).company?._id?.toString?.() ?? (milestone as any).company?.toString?.();
        if (milestoneCompanyId !== company._id.toString()) {
            throw apiValidationException("milestone_not_found", null, null, languageCode);
        }

        if ((milestone as any).status !== "pending") {
            throw apiValidationException("milestone_already_released", null, null, languageCode);
        }

        const orderId = (milestone as any).order?._id || (milestone as any).order;
        const order = await orderService.findOneOrThrow(
            {_id: orderId, company: company._id},
            {session, logger, languageCode},
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
        const currencyId = (milestone as any).currency?._id || (milestone as any).currency;
        const releaseProviderId = (order as any).provider?._id || (order as any).provider;

        await orderMilestoneService.updateByIdOrThrow(
            new ObjectId(milestoneRef),
            {$set: {status: "released"}},
            {session, logger, languageCode, auditUserId: actionUserCtx.userId},
        );

        if (milestoneAmount > 0 && currencyId) {
            const providerStripeAccountId = releaseProviderId
                ? await providerProfileService.getPayoutAccountId(releaseProviderId, company._id, {
                    session,
                    logger,
                    languageCode,
                })
                : undefined;
            await createEscrowReleaseAndFee(
                orderId,
                milestoneAmount,
                currencyId,
                company._id,
                {session, logger, languageCode, auditUserId: actionUserCtx.userId},
                {providerStripeAccountId},
            );
        }

        const pendingMilestones = await orderMilestoneService.count(
            {order: orderId, company: company._id, status: "pending"},
            {session, logger, languageCode},
        );

        if (pendingMilestones === 0) {
            await orderService.updateByIdOrThrow(
                orderId,
                {$set: {status: "completed"}},
                {session, logger, languageCode, auditUserId: actionUserCtx.userId},
            );
        }

        logger.finish(`Successfully released milestone: ${milestoneRef}`);

        return {message: "Milestone released successfully"};
    }
}
