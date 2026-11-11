/**
 * eCommerce sheets as hubs (UX-03): a product's orders; a listing's orders, bookings, reviews and reports; a
 * provider's listings, orders, bids and reviews; a task request's bids and the order it led to. Newest first. Each
 * list is read the way its own list route reads it: only when the caller's role can read that model, with the
 * caller's field grants (SEC-09), and with that route's record filter (a non-admin sees only the orders they are a
 * party to and what hangs off them, their own reports, and the bids `bidVisibilityFilter` allows).
 */

import {ObjectId} from "mongodb";
import type {Model} from "mongoose";
import {getModelCollectedData} from "@coreModule/database/collections";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import type {UserContext} from "@coreModule/utilities/types/types";
import type {Product} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.dto";
import type {Listing as ListingDTO} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listing/listing.dto";
import type {ProviderProfile} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/providerProfile/providerProfile.dto";
import type {TaskRequest} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/taskRequest/taskRequest.dto";
import Bid from "@eCommerceModule/database/schemas/bid/bid";
import {bidService} from "@eCommerceModule/database/schemas/bid/bid.service";
import Booking from "@eCommerceModule/database/schemas/booking/booking";
import {bookingService} from "@eCommerceModule/database/schemas/booking/booking.service";
import Listing from "@eCommerceModule/database/schemas/listing/listing";
import {listingService} from "@eCommerceModule/database/schemas/listing/listing.service";
import ListingFlag from "@eCommerceModule/database/schemas/listingFlag/listingFlag";
import {listingFlagService} from "@eCommerceModule/database/schemas/listingFlag/listingFlag.service";
import Order from "@eCommerceModule/database/schemas/order/order";
import {orderService} from "@eCommerceModule/database/schemas/order/order.service";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import Review from "@eCommerceModule/database/schemas/review/review";
import {reviewService} from "@eCommerceModule/database/schemas/review/review.service";
import {bidsToDTOArray} from "@eCommerceModule/utilities/mappers/bid/bidMapper.dto";
import {bookingsToDTOArray} from "@eCommerceModule/utilities/mappers/booking/bookingMapper.dto";
import {listingsToDTO} from "@eCommerceModule/utilities/mappers/listing/listingMapper.dto";
import {listingFlagsToDTO} from "@eCommerceModule/utilities/mappers/listingFlag/listingFlagMapper.dto";
import {ordersToDTO} from "@eCommerceModule/utilities/mappers/order/orderMapper.dto";
import {productOrdersToDTO} from "@eCommerceModule/utilities/mappers/productOrder/productOrderMapper.dto";
import {reviewsToDTO} from "@eCommerceModule/utilities/mappers/review/reviewMapper.dto";
import {bidVisibilityFilter, orderPartyFilter} from "@eCommerceModule/utilities/services/marketplaceAccess";

/** The newest records of each kind; the full history stays on each list page. */
const HUB_LIMIT = 20;

type HubCtx = {companyId: ObjectId; actionUserCtx: UserContext; languageCode: string};
export type ProductHub = Pick<Product, "orders">;
export type ListingHub = Pick<ListingDTO, "orders" | "bookings" | "reviews" | "flags">;
export type ProviderProfileHub = Pick<ProviderProfile, "listings" | "orders" | "bids" | "reviews">;
export type TaskRequestHub = Pick<TaskRequest, "bids" | "orders">;

/** The populate and projection the caller's role allows on a model, or null when it allows nothing (no access to that list). */
function readableFetch(model: Model<any>, collectionName: string, ctx: HubCtx): ReturnType<typeof SchemaGuard.generatePopulate> | null {
    const collected = getModelCollectedData(collectionName).readFields;
    if (!collected) return null;
    try {
        const readFields = SchemaGuard.sanitizeFields(model, collected, "read", ctx.actionUserCtx, ctx.languageCode);
        return Object.keys(readFields).length ? SchemaGuard.generatePopulate(readFields, model.schema) : null;
    } catch {
        // sanitizeFields refuses a role with no readable field: that list is simply not shown.
        return null;
    }
}

/** Ids of the orders matching `filter`, for the lists that hang off orders (bookings, reviews). */
async function orderIdsOf(filter: Record<string, unknown>): Promise<ObjectId[]> {
    return (await orderService.find(filter, {}, null, "_id")).map((order) => order._id);
}

/** The shop orders that have this product on a line. */
export async function productHub(productId: ObjectId, ctx: HubCtx): Promise<ProductHub> {
    const ordersFetch = readableFetch(ProductOrder, "productorders", ctx);
    if (!ordersFetch) return {};
    const filter = {company: ctx.companyId, deletedAt: null, "items.product": productId};
    const orders = await productOrderService.find(filter, {}, ordersFetch.populate, ordersFetch.select, {createdAt: -1}, HUB_LIMIT);
    return {orders: productOrdersToDTO(orders)};
}

export async function listingHub(listingId: ObjectId, ctx: HubCtx): Promise<ListingHub> {
    const base = {company: ctx.companyId, deletedAt: null};
    const ordersFetch = readableFetch(Order, "orders", ctx);
    const bookingsFetch = readableFetch(Booking, "bookings", ctx);
    const reviewsFetch = readableFetch(Review, "reviews", ctx);
    const flagsFetch = readableFetch(ListingFlag, "listingflags", ctx);
    // The orders route shows a non-admin only the orders they are a party to, and the bookings route only those orders' bookings.
    const visibleOrders = {...base, listing: listingId, ...orderPartyFilter(ctx.actionUserCtx)};
    // Reports are private: a non-admin sees only their own, as on the reports list.
    const ownFlags = ctx.actionUserCtx.isAdmin ? {} : {user: new ObjectId(ctx.actionUserCtx.userId)};

    const [orders, bookings, reviews, flags] = await Promise.all([
        ordersFetch ? orderService.find(visibleOrders, {}, ordersFetch.populate, ordersFetch.select, {createdAt: -1}, HUB_LIMIT) : null,
        bookingsFetch
            ? orderIdsOf(visibleOrders).then((orderIds) =>
                bookingService.find({...base, order: {$in: orderIds}}, {}, bookingsFetch.populate, bookingsFetch.select, {startAt: -1}, HUB_LIMIT))
            : null,
        reviewsFetch ? reviewService.find({...base, listing: listingId}, {}, reviewsFetch.populate, reviewsFetch.select, {createdAt: -1}, HUB_LIMIT) : null,
        flagsFetch ? listingFlagService.find({...base, listing: listingId, ...ownFlags}, {}, flagsFetch.populate, flagsFetch.select, {createdAt: -1}, HUB_LIMIT) : null,
    ]);

    const hub: ListingHub = {};
    if (orders) hub.orders = ordersToDTO(orders);
    if (bookings) hub.bookings = bookingsToDTOArray(bookings);
    if (reviews) hub.reviews = reviewsToDTO(reviews);
    if (flags) hub.flags = listingFlagsToDTO(flags);
    return hub;
}

/** `providerId` is the profile's user: the provider of its listings and orders, the bidder of its bids. */
export async function providerProfileHub(providerId: ObjectId, ctx: HubCtx): Promise<ProviderProfileHub> {
    const base = {company: ctx.companyId, deletedAt: null};
    const listingsFetch = readableFetch(Listing, "listings", ctx);
    const ordersFetch = readableFetch(Order, "orders", ctx);
    const bidsFetch = readableFetch(Bid, "marketplacebids", ctx);
    const reviewsFetch = readableFetch(Review, "reviews", ctx);

    const [listings, orders, bids, reviews] = await Promise.all([
        listingsFetch ? listingService.find({...base, provider: providerId}, {}, listingsFetch.populate, listingsFetch.select, {createdAt: -1}, HUB_LIMIT) : null,
        ordersFetch
            ? orderService.find({...base, provider: providerId, ...orderPartyFilter(ctx.actionUserCtx)}, {}, ordersFetch.populate, ordersFetch.select, {createdAt: -1}, HUB_LIMIT)
            : null,
        bidsFetch
            ? bidVisibilityFilter(ctx.companyId, ctx.actionUserCtx, {}).then((visible) =>
                bidService.find({...base, $and: [{bidder: providerId}, visible]}, {}, bidsFetch.populate, bidsFetch.select, {createdAt: -1}, HUB_LIMIT))
            : null,
        // A review names its order, not its provider; the reviews route shows every review to a role that may read them.
        reviewsFetch
            ? orderIdsOf({...base, provider: providerId}).then((orderIds) =>
                reviewService.find({...base, order: {$in: orderIds}}, {}, reviewsFetch.populate, reviewsFetch.select, {createdAt: -1}, HUB_LIMIT))
            : null,
    ]);

    const hub: ProviderProfileHub = {};
    if (listings) hub.listings = listingsToDTO(listings);
    if (orders) hub.orders = ordersToDTO(orders);
    if (bids) hub.bids = bidsToDTOArray(bids);
    if (reviews) hub.reviews = reviewsToDTO(reviews);
    return hub;
}

export async function taskRequestHub(taskRequestId: ObjectId, ctx: HubCtx): Promise<TaskRequestHub> {
    const base = {company: ctx.companyId, deletedAt: null};
    const bidsFetch = readableFetch(Bid, "marketplacebids", ctx);
    const ordersFetch = readableFetch(Order, "orders", ctx);

    const [bids, orders] = await Promise.all([
        bidsFetch
            ? bidVisibilityFilter(ctx.companyId, ctx.actionUserCtx, {}).then((visible) =>
                bidService.find({...base, $and: [{taskRequest: taskRequestId}, visible]}, {}, bidsFetch.populate, bidsFetch.select, {createdAt: -1}, HUB_LIMIT))
            : null,
        ordersFetch
            ? orderService.find({...base, taskRequest: taskRequestId, ...orderPartyFilter(ctx.actionUserCtx)}, {}, ordersFetch.populate, ordersFetch.select, {createdAt: -1}, HUB_LIMIT)
            : null,
    ]);

    const hub: TaskRequestHub = {};
    if (bids) hub.bids = bidsToDTOArray(bids);
    if (orders) hub.orders = ordersToDTO(orders);
    return hub;
}
