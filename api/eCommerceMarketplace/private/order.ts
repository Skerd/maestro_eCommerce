import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import {assertCanDelete} from "@coreModule/database/relationsRegistry";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {escapeRegex} from "@coreModule/utilities/helpers";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {validateSingleForm} from "armonia/src/modules/core/utilities/zod/shared.validator";
import {OrderActions} from "@eCommerceModule/database/schemas/order/order.actions";
import Order, {type IOrder} from "@eCommerceModule/database/schemas/order/order";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import {reviewService} from "@eCommerceModule/database/schemas/review/review.service";
import {orderDeliveryService} from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery.service";
import {orderToBuyerDTO, orderToDTO, ordersToDTO} from "@eCommerceModule/utilities/mappers/order/orderMapper.dto";
import {ordersToSelect} from "@eCommerceModule/utilities/mappers/order/orderMapper.select";
import {disputeService} from "@eCommerceModule/database/schemas/dispute/dispute.service";
import {orderPartyFilter} from "@eCommerceModule/utilities/services/marketplaceAccess";
import {orderSelectFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/order/order.select.form.validator";
import type {SelectResponse} from "armonia/src/modules/core/types/shared.types";
import type {BaseCrudService, CrudOptions} from "@coreModule/database/services/baseCrudService";
import {getModelCollectedData} from "@coreModule/database/collections";
import authMW, {type AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {validateFormZod} from "@coreModule/utilities/middlewares/validateFormZod";
import {bookingService} from "@eCommerceModule/database/schemas/booking/booking.service";
import {bookingsToDTOArray} from "@eCommerceModule/utilities/mappers/booking/bookingMapper.dto";
import {
    myServiceOrdersFormSchema,
    type MyServiceOrdersFormType,
} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/order/myServiceOrders.form.validator";
import type {Document, Model} from "mongoose";
import OrderDelivery from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery";
import OrderMilestone from "@eCommerceModule/database/schemas/orderMilestone/orderMilestone";
import OrderRevision from "@eCommerceModule/database/schemas/orderRevision/orderRevision";
import {orderMilestoneService} from "@eCommerceModule/database/schemas/orderMilestone/orderMilestone.service";
import {orderRevisionService} from "@eCommerceModule/database/schemas/orderRevision/orderRevision.service";
import {orderDeliveriesToDTO} from "@eCommerceModule/utilities/mappers/orderDelivery/orderDeliveryMapper.dto";
import {orderMilestonesToDTO} from "@eCommerceModule/utilities/mappers/orderMilestone/orderMilestoneMapper.dto";
import {orderRevisionsToDTO} from "@eCommerceModule/utilities/mappers/orderRevision/orderRevisionMapper.dto";

const ACTIVE_DISPUTE_STATUSES = ["open", "under_review"];

async function ordersWithSubmittedDelivery(orderIds: ObjectId[], companyId: ObjectId, opts: CrudOptions): Promise<Set<string>> {
    const deliveries = await orderDeliveryService.find({order: {$in: orderIds}, status: "submitted", company: companyId}, opts, null, "order");
    return new Set(deliveries.map((delivery) => delivery.order._id.toString()));
}

async function ordersWithActiveDispute(orderIds: ObjectId[], companyId: ObjectId, opts: CrudOptions): Promise<Set<string>> {
    const disputes = await disputeService.find({order: {$in: orderIds}, status: {$in: ACTIVE_DISPUTE_STATUSES}, company: companyId}, opts, null, "order");
    return new Set(disputes.map((dispute) => dispute.order._id.toString()));
}

/**
 * One related list for the order sheet, read through SchemaGuard like the CRUD
 * routes; undefined when the caller has no read access to that model.
 */
async function readOrderChildren<T extends Document>(
    model: Model<T>,
    collectionName: string,
    service: BaseCrudService<T, any>,
    order: IOrder,
    params: AuthenticatedMWType,
    sort: Record<string, 1 | -1>,
): Promise<T[] | undefined> {
    const {logger, languageCode, company, actionUserCtx} = params;
    let readFields;
    try {
        readFields = SchemaGuard.sanitizeFields(model, getModelCollectedData(collectionName).readFields!, "read", actionUserCtx, languageCode);
    } catch {
        return undefined;
    }
    const populate = SchemaGuard.generatePopulate(readFields, model.schema);
    return service.find({order: order._id, company: company._id}, {logger, languageCode}, populate.populate, populate.select, sort);
}

export const basePath = "/api/eCommerceMarketplace/order";

export const {router} = createCrudRouter<IOrder>({
    collectionName: "orders",
    model: Order,
    service: orderService,
    entityName: "Order",
    defaultSort: {createdAt: -1},
    // Orders are created by OrderActions.createFromListing / BidActions.accept; model create is no-permission, so PUT is refused
    createSchema: validateSingleForm,
    buildCreateData: () => ({}),
    // Not edited via PATCH; lifecycle uses the OrderActions routes
    editSchema: validateSingleForm,
    buildUpdateData: () => ({}),
    toDTO: orderToDTO,
    toDTOArray: ordersToDTO,
    toSelect: ordersToSelect,
    selectSchema: orderSelectFormSchema,
    documentFilter: ({company, actionUserCtx}) => ({company: company._id, ...orderPartyFilter(actionUserCtx)}),
    overrideSelectHandler: async (params): Promise<SelectResponse> => {
        const {logger, languageCode, company, name, limit, page, status, forReview, actionUserCtx} = params;
        const opts = {logger, languageCode};

        logger.start("Fetching orders for select...");

        const sanitizedFields = SchemaGuard.sanitizeFields(Order, {name: {}, taskRequest: {keys: {title: {}}}, listing: {keys: {title: {}}}}, "read", actionUserCtx, languageCode);
        const populate = SchemaGuard.generatePopulate(sanitizedFields, Order.schema);

        const conditions: Record<string, unknown>[] = [{company: company._id}, orderPartyFilter(actionUserCtx)];
        if (name?.trim()) {
            conditions.push({name: {$regex: escapeRegex(name.trim()), $options: "i"}});
        }

        if (forReview) {
            // The caller's completed orders that have no live review yet
            const customerId = new ObjectId(actionUserCtx.userId);
            const myCompleted = await orderService.find({company: company._id, customer: customerId, status: "completed"}, opts, null, "_id");
            const reviews = await reviewService.find({company: company._id, order: {$in: myCompleted.map((order) => order._id)}}, opts, null, "order");
            conditions.push({customer: customerId, status: "completed", _id: {$nin: reviews.map((review) => review.order._id)}});
        } else if (status) {
            conditions.push({status});
        }

        const filter = {$and: conditions};
        const [orders, total] = await Promise.all([
            orderService.find(filter, opts, populate.populate, populate.select, {createdAt: -1}, limit, (page - 1) * limit),
            orderService.count(filter, opts),
        ]);

        logger.finish("Finished fetching orders for select!");

        return {data: ordersToSelect(orders), total};
    },
    enrichList: async (docs, params) => {
        const {logger, languageCode, company} = params;
        const orderIds = docs.map((d) => d._id);
        const [submittedIds, activeDisputeIds] = await Promise.all([
            ordersWithSubmittedDelivery(orderIds, company._id, {logger, languageCode}),
            ordersWithActiveDispute(orderIds, company._id, {logger, languageCode}),
        ]);
        return ordersToDTO(docs, submittedIds, activeDisputeIds);
    },
    enrichSingle: async (doc, params) => {
        const {logger, languageCode, company} = params;
        const [submittedIds, activeDisputeIds, deliveries, milestones, revisions] = await Promise.all([
            ordersWithSubmittedDelivery([doc._id], company._id, {logger, languageCode}),
            ordersWithActiveDispute([doc._id], company._id, {logger, languageCode}),
            readOrderChildren(OrderDelivery, "orderdeliveries", orderDeliveryService, doc, params, {createdAt: -1}),
            readOrderChildren(OrderMilestone, "ordermilestones", orderMilestoneService, doc, params, {orderIndex: 1}),
            readOrderChildren(OrderRevision, "orderrevisions", orderRevisionService, doc, params, {createdAt: -1}),
        ]);
        return {
            ...orderToDTO(doc, submittedIds.size > 0, activeDisputeIds.size > 0),
            ...(deliveries && {deliveries: orderDeliveriesToDTO(deliveries)}),
            ...(milestones && {milestones: orderMilestonesToDTO(milestones)}),
            ...(revisions && {revisions: orderRevisionsToDTO(revisions)}),
        };
    },
    /** Admin only, and only once the order is final: an active order still holds escrow. */
    beforeDelete: async (params, doc) => {
        if (!params.actionUserCtx.isAdmin) {
            throw apiValidationException("user_permissions_not_sufficient", null, null, params.languageCode);
        }
        if (doc.status !== "completed" && doc.status !== "cancelled") {
            throw apiValidationException("order_not_final", null, null, params.languageCode);
        }
        await assertCanDelete(Order.modelName, doc._id, params.languageCode, params.session);
    },
    actions: OrderActions,
    rateLimits: {read: 60, write: 30, delete: 20},
});

const BUYER_ORDER_POPULATE = [
    {path: "listing", select: "name title status mainImage"},
    {path: "taskRequest", select: "name title"},
    {path: "provider", select: "name surname photo"},
    {path: "currency", select: "name symbol abbreviation"},
];

/** Per-order flags the storefront account shows: delivery waiting, open dispute, reviewed. */
async function buyerOrderFlags(orderIds: ObjectId[], companyId: ObjectId, opts: CrudOptions) {
    const [submitted, disputed, reviews] = await Promise.all([
        ordersWithSubmittedDelivery(orderIds, companyId, opts),
        ordersWithActiveDispute(orderIds, companyId, opts),
        reviewService.find({order: {$in: orderIds}, company: companyId}, opts, null, "order"),
    ]);
    const reviewed = new Set(reviews.map((review) => review.order._id.toString()));
    return (order: IOrder) => {
        const id = order._id.toString();
        return orderToBuyerDTO(order, submitted.has(id), disputed.has(id), reviewed.has(id));
    };
}

/**
 * Buyer self-service routes (storefront account pages). Scoped hard to the
 * authenticated customer — no admin model permissions required.
 */
router.post(
    "/my",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(myServiceOrdersFormSchema),
    asyncHandler(async (params: AuthenticatedMWType & MyServiceOrdersFormType) => {
        const {company, actionUserCtx, logger, languageCode, status} = params;
        const page = params.page ?? 1;
        const limit = params.limit ?? 10;
        const opts = {logger, languageCode};

        const filter = {company: company._id, customer: new ObjectId(actionUserCtx.userId), ...(status && {status})};
        const [orders, total] = await Promise.all([
            orderService.find(filter, opts, BUYER_ORDER_POPULATE, undefined, {createdAt: -1}, limit, (page - 1) * limit),
            orderService.count(filter, opts),
        ]);
        const toBuyerDTO = await buyerOrderFlags(orders.map((order) => order._id), company._id, opts);

        return {data: orders.map(toBuyerDTO), total, page, limit};
    }),
);

router.post(
    "/mySingle",
    authMW("private"),
    rateLimiter({windowMs: 60000, max: 60}),
    validateFormZod(validateSingleForm),
    asyncHandler(async (params: AuthenticatedMWType & {_id: string}) => {
        const {company, actionUserCtx, logger, languageCode, _id} = params;
        const opts = {logger, languageCode};

        const order = await orderService.findOne(
            {_id: new ObjectId(_id), company: company._id, customer: new ObjectId(actionUserCtx.userId)},
            opts,
            BUYER_ORDER_POPULATE,
        );
        if (!order) throw apiValidationException("order_not_found", "", null, languageCode);

        const scope = {order: order._id, company: company._id};
        const [toBuyerDTO, deliveries, milestones, revisions, bookings] = await Promise.all([
            buyerOrderFlags([order._id], company._id, opts),
            orderDeliveryService.find(scope, opts, ["attachments"], undefined, {createdAt: -1}),
            orderMilestoneService.find(scope, opts, ["currency"], undefined, {orderIndex: 1}),
            orderRevisionService.find(scope, opts, undefined, undefined, {createdAt: -1}),
            bookingService.find(scope, opts, undefined, undefined, {startAt: 1}),
        ]);

        return {
            data: {
                ...toBuyerDTO(order),
                deliveries: orderDeliveriesToDTO(deliveries),
                milestones: orderMilestonesToDTO(milestones),
                revisions: orderRevisionsToDTO(revisions),
                bookings: bookingsToDTOArray(bookings),
            },
        };
    }),
);
