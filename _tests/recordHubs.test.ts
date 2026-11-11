import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";

import {ObjectId} from "mongodb";
import request from "supertest";

vi.mock("@coreModule/utilities/middlewares/authMW", async () =>
    (await import("@coreModule/_tests/httpHarness")).authMWStub);
vi.mock("@coreModule/utilities/middlewares/rateLimiter", () => ({
    rateLimiter: () => (_req: unknown, _res: unknown, next: () => void) => next(),
}));

import {allPermissionTags, appFor, callerHeader, type TestCaller} from "@coreModule/_tests/httpHarness";
import {withTenant} from "@coreModule/utilities/endpoints/tenantScope";
import User from "@coreModule/database/schemas/user/user";
import * as productRoute from "@eCommerceModule/api/eCommerce/private/checked/product";
import * as listingRoute from "@eCommerceModule/api/eCommerceMarketplace/private/listing";
import * as providerProfileRoute from "@eCommerceModule/api/eCommerceMarketplace/private/providerProfile";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import Listing from "@eCommerceModule/database/schemas/listing/listing";
import ListingFlag from "@eCommerceModule/database/schemas/listingFlag/listingFlag";
import Order from "@eCommerceModule/database/schemas/order/order";
import Booking from "@eCommerceModule/database/schemas/booking/booking";
import Review from "@eCommerceModule/database/schemas/review/review";
import Bid from "@eCommerceModule/database/schemas/bid/bid";
import ProviderProfile from "@eCommerceModule/database/schemas/providerProfile/providerProfile";

const companyId = new ObjectId();
const asCompany = <T>(fn: () => PromiseLike<T>): Promise<T> => withTenant(companyId, fn);
const app = appFor([productRoute, listingRoute, providerProfileRoute].map((route) => ({...route, module: "eCommerce"})));
const single = (caller: TestCaller, path: string, _id: ObjectId) =>
    request(app).post(`${path}/single`).set(callerHeader(caller)).send({_id: _id.toString()});

const providerId = new ObjectId();
const customerId = new ObjectId();
const otherCustomerId = new ObjectId();
const currencyId = new ObjectId();
const marketplaceModels = [Listing, Order, Booking, Review, ListingFlag, Bid, ProviderProfile];

let shopStaff: TestCaller;
let productsOnly: TestCaller;
let marketplaceAdmin: TestCaller;
let marketplaceCustomer: TestCaller;
let listingsOnly: TestCaller;

beforeAll(async () => {
    await connectTestDatabase();
    await Promise.all([Product, ProductOrder, ...marketplaceModels].map((model) => model.init()));
    const caller = (userId: ObjectId, permissions: string[], isAdmin = false): TestCaller =>
        ({userId: userId.toString(), companyId: companyId.toString(), isAdmin, permissions, modules: ["core", "eCommerce"]});
    shopStaff = caller(new ObjectId(), allPermissionTags([Product, ProductOrder]));
    productsOnly = caller(new ObjectId(), allPermissionTags([Product]));
    marketplaceAdmin = caller(new ObjectId(), allPermissionTags(marketplaceModels), true);
    // Not an admin: the orders, bookings and reports routes show such a caller only their own (marketplaceAccess).
    marketplaceCustomer = caller(customerId, allPermissionTags(marketplaceModels));
    listingsOnly = caller(new ObjectId(), allPermissionTags([Listing, ProviderProfile]));
}, 120000);

afterAll(async () => {
    await disconnectTestDatabase();
});

beforeEach(() => asCompany(async () => {
    await Promise.all([User, Product, ProductOrder, ...marketplaceModels].map((model) => model.collection.deleteMany({})));
    await User.collection.insertMany([
        {_id: providerId, username: "pat", name: "Pat", surname: "Painter", email: "pat@provider.test", companies: [companyId]},
        {_id: customerId, username: "cam", name: "Cam", surname: "Customer", email: "cam@customer.test", companies: [companyId]},
        {_id: otherCustomerId, username: "oli", name: "Oli", surname: "Other", email: "oli@customer.test", companies: [companyId]},
    ]);
}));

async function productOrder(product: ObjectId, orderNumber: string, createdAt: string) {
    await ProductOrder.collection.insertOne({
        company: companyId, orderNumber, idempotencyKey: `key-${orderNumber}`, customer: customerId, currency: currencyId, status: "confirmed", paymentStatus: "paid",
        items: [{product, quantity: 1, unitPrice: 10, totalPrice: 10, snapshot: {title: "Mug"}}],
        subtotal: 10, discountTotal: 0, shippingTotal: 0, taxTotal: 0, grandTotal: 10,
        shippingAddress: {firstName: "Cam", lastName: "Customer", street: "Rruga 1", city: "Tirana"},
        createdAt: new Date(createdAt),
    });
}

async function listing(title: string): Promise<ObjectId> {
    const {insertedId} = await Listing.collection.insertOne({
        name: `LIST-${new ObjectId().toString()}`, title, category: new ObjectId(), provider: providerId, price: 100, priceCurrency: currencyId,
        pricingType: "fixed", deliveryDays: 3, status: "active", company: companyId, createdAt: new Date(),
    });
    return insertedId;
}

async function order(listingId: ObjectId | undefined, customer: ObjectId, name: string, createdAt: string): Promise<ObjectId> {
    const {insertedId} = await Order.collection.insertOne({
        name, ...(listingId && {listing: listingId}), customer, provider: providerId, amount: 100, currency: currencyId, status: "completed",
        company: companyId, createdAt: new Date(createdAt),
    });
    return insertedId;
}

describe("eCommerce sheets as hubs (P10.7)", () => {
    it("lists the shop orders a product is on for a role that may read orders, and leaves them out for one that may not", () => asCompany(async () => {
        const mug = await Product.create({title: "Mug", slug: "mug", type: "physical", status: "active", price: 10, company: companyId});
        const plate = await Product.create({title: "Plate", slug: "plate", type: "physical", status: "active", price: 12, company: companyId});
        await productOrder(mug._id, "ORD-1", "2026-11-01T09:00:00Z");
        await productOrder(mug._id, "ORD-2", "2026-11-05T09:00:00Z");
        await productOrder(plate._id, "ORD-3", "2026-11-06T09:00:00Z");

        const full = await single(shopStaff, "/api/eCommerce/product", mug._id);
        expect(full.status).toBe(200);
        // Newest first, this product's orders only.
        expect(full.body.orders.map((row: {orderNumber: string}) => row.orderNumber)).toEqual(["ORD-2", "ORD-1"]);

        const limited = await single(productsOnly, "/api/eCommerce/product", mug._id);
        expect(limited.status).toBe(200);
        expect(limited.body.title).toBe("Mug");
        expect(limited.body).not.toHaveProperty("orders");
    }));

    it("lists a listing's orders, bookings, reviews and reports with each list's own record filter", () => asCompany(async () => {
        const painting = await listing("Wall painting");
        const other = await listing("Garden work");
        const mine = await order(painting, customerId, "ORD-MINE", "2026-11-01T09:00:00Z");
        const theirs = await order(painting, otherCustomerId, "ORD-THEIRS", "2026-11-03T09:00:00Z");
        await order(other, customerId, "ORD-ELSEWHERE", "2026-11-04T09:00:00Z");
        await Booking.collection.insertMany([
            {order: mine, provider: providerId, startAt: new Date("2026-11-10T09:00:00Z"), endAt: new Date("2026-11-10T11:00:00Z"), timezone: "Europe/Tirane", company: companyId},
            {order: theirs, provider: providerId, startAt: new Date("2026-11-12T09:00:00Z"), endAt: new Date("2026-11-12T11:00:00Z"), timezone: "Europe/Tirane", company: companyId},
        ]);
        await Review.collection.insertOne({order: mine, listing: painting, rating: 5, comment: "Great", reviewer: customerId, company: companyId, createdAt: new Date()});
        await ListingFlag.collection.insertMany([
            {listing: painting, user: customerId, reason: "spam", status: "pending", company: companyId, createdAt: new Date("2026-11-02T09:00:00Z")},
            {listing: painting, user: otherCustomerId, reason: "misleading", status: "pending", company: companyId, createdAt: new Date("2026-11-03T09:00:00Z")},
        ]);

        const admin = await single(marketplaceAdmin, "/api/eCommerceMarketplace/listing", painting);
        expect(admin.status).toBe(200);
        expect(admin.body.orders.map((row: {name: string}) => row.name)).toEqual(["ORD-THEIRS", "ORD-MINE"]);
        expect(admin.body.bookings).toHaveLength(2);
        expect(admin.body.reviews.map((row: {comment: string}) => row.comment)).toEqual(["Great"]);
        expect(admin.body.flags.map((row: {reason: string}) => row.reason)).toEqual(["misleading", "spam"]);

        // A non-admin sees the orders they are a party to, those orders' bookings, and their own report.
        const party = await single(marketplaceCustomer, "/api/eCommerceMarketplace/listing", painting);
        expect(party.status).toBe(200);
        expect(party.body.orders.map((row: {name: string}) => row.name)).toEqual(["ORD-MINE"]);
        expect(party.body.bookings).toHaveLength(1);
        expect(party.body.reviews).toHaveLength(1);
        expect(party.body.flags.map((row: {reason: string}) => row.reason)).toEqual(["spam"]);

        const limited = await single(listingsOnly, "/api/eCommerceMarketplace/listing", painting);
        expect(limited.status).toBe(200);
        expect(limited.body.title).toBe("Wall painting");
        for (const key of ["orders", "bookings", "reviews"]) expect(limited.body).not.toHaveProperty(key);
        // Anyone may report a listing (the model's fields are public-read), so the list is there, holding only their own reports.
        expect(limited.body.flags).toEqual([]);
    }));

    it("lists a provider's listings, orders, bids and reviews, and leaves out what the role may not read", () => asCompany(async () => {
        const painting = await listing("Wall painting");
        const done = await order(painting, customerId, "ORD-DONE", "2026-11-01T09:00:00Z");
        await Review.collection.insertOne({order: done, listing: painting, rating: 4, comment: "Tidy", reviewer: customerId, company: companyId, createdAt: new Date()});
        await Bid.collection.insertOne({
            name: "BID-1", taskRequest: new ObjectId(), bidder: providerId, amount: 80, currency: currencyId, proposal: "Two coats",
            deliveryDays: 2, status: "pending", company: companyId, createdAt: new Date(),
        });
        const {insertedId: profile} = await ProviderProfile.collection.insertOne({user: providerId, skills: ["painting"], company: companyId, createdAt: new Date()});

        const admin = await single(marketplaceAdmin, "/api/eCommerceMarketplace/providerProfile", profile);
        expect(admin.status).toBe(200);
        expect(admin.body.listings.map((row: {title: string}) => row.title)).toEqual(["Wall painting"]);
        expect(admin.body.orders.map((row: {name: string}) => row.name)).toEqual(["ORD-DONE"]);
        expect(admin.body.bids.map((row: {name: string}) => row.name)).toEqual(["BID-1"]);
        expect(admin.body.reviews.map((row: {comment: string}) => row.comment)).toEqual(["Tidy"]);

        const limited = await single(listingsOnly, "/api/eCommerceMarketplace/providerProfile", profile);
        expect(limited.status).toBe(200);
        expect(limited.body.listings.map((row: {title: string}) => row.title)).toEqual(["Wall painting"]);
        for (const key of ["orders", "bids", "reviews"]) expect(limited.body).not.toHaveProperty(key);
    }));
});
