import {ObjectId} from "mongodb";
import {createCrudRouter} from "@coreModule/api/crudRouterFactory";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import {escapeRegex} from "@coreModule/utilities/helpers";
import {OrderActions} from "@eCommerceModule/database/schemas/order/order.actions";
import Order from "@eCommerceModule/database/schemas/order/order";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import {reviewService} from "@eCommerceModule/database/schemas/review/review.service";
import {orderDeliveryService} from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery.service";
import {orderToDTO, ordersToDTO} from "@eCommerceModule/utilities/mappers/order/orderMapper.dto";
import {ordersToSelect} from "@eCommerceModule/utilities/mappers/order/orderMapper.select";
import {disputeService} from "@eCommerceModule/database/schemas/dispute/dispute.service";
import {editOrderFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/order/editOrder.form.validator";
import {orderSelectFormSchema} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/order/order.select.form.validator";
import type {SelectResponse} from "armonia/src/modules/core/types/shared.types";

async function loadSubmittedDeliveryOrderIds(
    orderIds: Array<{toString(): string}>,
    companyId: unknown,
    options: {logger: any; languageCode: string},
): Promise<Set<string>> {
    if (!orderIds.length) return new Set();

    const rows = await orderDeliveryService.aggregate(
        [
            {
                $match: {
                    order: {$in: orderIds},
                    status: "submitted",
                    company: companyId,
                },
            },
            {$group: {_id: "$order"}},
        ],
        options,
    );

    return new Set(rows.map((row: {_id: {toString(): string}}) => row._id.toString()));
}

async function hasSubmittedDelivery(
    orderId: unknown,
    companyId: unknown,
    options: {logger: any; languageCode: string},
): Promise<boolean> {
    const count = await orderDeliveryService.count(
        {order: orderId, status: "submitted", company: companyId},
        options,
    );
    return count > 0;
}

async function loadActiveDisputeOrderIds(
    orderIds: Array<{toString(): string}>,
    companyId: unknown,
    options: {logger: any; languageCode: string},
): Promise<Set<string>> {
    if (!orderIds.length) {
        return new Set();
    }
    const disputes = await disputeService.find(
        {
            order: {$in: orderIds},
            company: companyId,
            status: {$in: ["open", "under_review"]},
        },
        options,
        null,
        "order",
        undefined,
        2000,
        0,
    );
    const out = new Set<string>();
    for (const row of disputes as any[]) {
        const oid = row.order?._id ?? row.order;
        if (oid) {
            out.add(oid.toString());
        }
    }
    return out;
}

export const basePath = "/api/eCommerceMarketplace/order";

export const {router} = createCrudRouter({
    collectionName: "orders",
    model: Order,
    service: orderService,
    entityName: "Order",
    defaultSort: {createdAt: -1},
    // Orders are created via BidActions.accept(), not through a direct API endpoint.
    createSchema: null as any,
    editSchema: editOrderFormSchema,
    toDTO: orderToDTO,
    toDTOArray: ordersToDTO,
    toSelect: ordersToSelect,
    selectSchema: orderSelectFormSchema,
    overrideSelectHandler: async (params): Promise<SelectResponse> => {
        const {
            logger,
            languageCode,
            company,
            name,
            limit = 20,
            page = 1,
            status,
            forReview,
            actionUserCtx,
        } = params;

        logger.start("Fetching orders for select...");

        const sanitizedFields = SchemaGuard.sanitizeFields(Order, {name: {}, taskRequest: {keys: {title: {}}}, listing: {keys: {title: {}}}}, "read", actionUserCtx, languageCode);
        const populate = SchemaGuard.generatePopulate(sanitizedFields, Order.schema);

        const filter: Record<string, unknown> = {company: company._id};

        if (name?.trim()) {
            const term = escapeRegex(name.trim());
            filter.$or = [
                {name: {$regex: term, $options: "i"}},
            ];
        }

        if (forReview) {
            filter.status = "completed";
            filter.customer = new ObjectId(actionUserCtx.userId);

            const existingReviews = await reviewService.find(
                {company: company._id},
                {logger, languageCode},
                null,
                "order",
                "_id order",
                undefined,
                5000
            );
            const reviewedOrderIds = (existingReviews as any[])
                .map((r) => r.order?._id ?? r.order)
                .filter(Boolean);
            if (reviewedOrderIds.length > 0) {
                filter._id = {$nin: reviewedOrderIds};
            }
        } else if (status) {
            filter.status = status;
        }

        const offset = (page - 1) * limit;
        const [orders, total] = await Promise.all([
            orderService.find(filter, {logger, languageCode}, populate.populate, populate.select, {createdAt: -1}, limit, offset),
            orderService.count(filter, {logger, languageCode}),
        ]);

        logger.finish("Finished fetching orders for select!");

        return {data: ordersToSelect(orders), total};
    },
    buildCreateData: async () => {
        throw new Error("Orders cannot be created directly");
    },
    buildUpdateData: async () => ({}),
    enrichList: async (docs, params) => {
        const {logger, languageCode, company} = params;
        const orderIds = docs.map((d) => d._id);
        const [submittedIds, activeDisputeIds] = await Promise.all([
            loadSubmittedDeliveryOrderIds(orderIds, company._id, {logger, languageCode}),
            loadActiveDisputeOrderIds(orderIds, company._id, {logger, languageCode}),
        ]);
        return ordersToDTO(docs, submittedIds, activeDisputeIds);
    },
    enrichSingle: async (doc, params) => {
        const {logger, languageCode, company} = params;
        const deliverySubmitted = await hasSubmittedDelivery(doc._id, company._id, {logger, languageCode});
        const openDispute = await disputeService.findOne(
            {
                order: doc._id,
                company: company._id,
                status: {$in: ["open", "under_review"]},
            },
            {logger, languageCode},
            null,
            "_id",
        );
        return orderToDTO(doc, deliverySubmitted, Boolean(openDispute));
    },
    actions: OrderActions,
    rateLimits: {read: 60, write: 30, delete: 20},
});
