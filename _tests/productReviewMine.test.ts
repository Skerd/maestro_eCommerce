import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import request from "supertest";
import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";

vi.mock("@coreModule/utilities/middlewares/authMW", async () =>
    (await import("@coreModule/_tests/httpHarness")).authMWStub);

import Company from "@coreModule/database/schemas/company/company";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import ProductReview from "@eCommerceModule/database/schemas/productReview/productReview";
import * as productReviewRoute from "@eCommerceModule/api/eCommerce/private/checked/productReview";
import * as productOrderRoute from "@eCommerceModule/api/eCommerce/private/productOrder";
import {allPermissionTags, appFor, callerHeader} from "@coreModule/_tests/httpHarness";
import {asCrossTenant} from "@coreModule/utilities/endpoints/tenantScope";
import {PORTAL_ROOT_DOMAIN} from "@coreModule/environment";
import {portalBuyerTargetHasModule} from "@coreModule/utilities/security/portalBuyer";
import {productOrderSeller} from "@eCommerceModule/utilities/shop/shopBuyerTarget";

// D178: a portal buyer reviews a shop purchase. The buyer's session is the platform's; the order is its seller's.
const app = appFor([productReviewRoute, productOrderRoute].map((route) => ({...route, module: "eCommerce"})));

const platform = new ObjectId();
const seller = new ObjectId();
const buyer = new ObjectId();
const apex = `http://${PORTAL_ROOT_DOMAIN}:5212`;
const sellerSite = `http://alpha.${PORTAL_ROOT_DOMAIN}:5212`;
const portalBuyer = callerHeader({userId: buyer.toString(), companyId: platform.toString()});
const fixtures = <T>(fn: () => PromiseLike<T>): Promise<T> => asCrossTenant("test fixtures span companies", fn);

let mug: ObjectId;
let book: ObjectId;
let order: ObjectId;

/** A seller's order of the mug, bought by `customer`. */
async function seedOrder(customer: ObjectId, paymentStatus = "paid"): Promise<ObjectId> {
    return fixtures(async () => (await ProductOrder.collection.insertOne({
        company: seller, customer, paymentStatus, status: "processing",
        orderNumber: `ORD-${new ObjectId().toHexString()}`, idempotencyKey: new ObjectId().toHexString(),
        items: [{_id: new ObjectId(), product: mug, quantity: 1, unitPrice: 10}],
        deletedAt: null,
    })).insertedId);
}

beforeAll(async () => {
    await connectTestDatabase();
}, 120000);

afterAll(async () => {
    await disconnectTestDatabase();
});

beforeEach(() => fixtures(async () => {
    for (const collection of await mongoose.connection.db!.collections()) await collection.deleteMany({});
    await Company.collection.insertMany([
        {_id: platform, name: "Platform", vat: "P-1", isPlatformOwner: true, isActive: true, modules: ["core"], deletedAt: null},
        {_id: seller, name: "Alpha", vat: "A-1", isActive: true, modules: ["eCommerce"], deletedAt: null},
    ]);
    const products = await Product.collection.insertMany([
        {title: "Mug", slug: "mug", status: "active", company: seller, ratingAverage: 0, ratingCount: 0, reviewCount: 0, reviews: [], deletedAt: null},
        {title: "Book", slug: "book", status: "active", company: seller, ratingAverage: 0, ratingCount: 0, reviewCount: 0, reviews: [], deletedAt: null},
    ]);
    [mug, book] = [products.insertedIds[0], products.insertedIds[1]];
    order = await seedOrder(buyer);
}));

const review = (body: Record<string, unknown>, origin = apex, caller = portalBuyer) =>
    request(app).put("/api/eCommerce/productReview/createMine").set({...caller, Origin: origin}).send(body);

describe("a buyer's own product review (D178)", () => {
    it("names the order's seller for the module gate", async () => {
        const body = {order: order.toString()};
        expect(String(await productOrderSeller({body, params: {}}))).toBe(String(seller));
        expect(await portalBuyerTargetHasModule(productOrderSeller, {body, params: {}}, apex, "eCommerce")).toBe(true);
        expect(await productOrderSeller({body: {order: new ObjectId().toString()}, params: {}})).toBeUndefined();
    });

    it("writes an apex buyer's review in the seller's company and refreshes the product's rating", async () => {
        // Another buyer's earlier 3-star review of the mug
        const earlier = await seedOrder(new ObjectId());
        await fixtures(() => ProductReview.collection.insertOne({
            order: earlier, product: mug, rating: 3, reviewer: new ObjectId(), company: seller, deletedAt: null,
        }));

        const created = await review({order: order.toString(), product: mug.toString(), rating: 5, title: " Great ", comment: "Solid mug"});

        expect([created.status, created.body.error_code]).toEqual([200, undefined]);
        const [stored, product] = await fixtures(() => Promise.all([
            ProductReview.findById(created.body.data._id).lean(),
            Product.findById(mug).lean(),
        ]));
        expect([String(stored?.company), String(stored?.reviewer), stored?.rating, stored?.title]).toEqual([String(seller), String(buyer), 5, "Great"]);
        expect([product?.ratingAverage, product?.ratingCount, product?.reviewCount, product?.reviews.map(String)]).toEqual([4, 2, 2, [created.body.data._id]]);
    });

    it("works on the seller's own portal site and on a site outside the portal", async () => {
        const fromSite = await review({order: order.toString(), product: mug.toString(), rating: 4}, sellerSite);
        const shopBuyer = callerHeader({userId: buyer.toString(), companyId: seller.toString()});
        const ownShopOrder = await seedOrder(buyer);
        const fromOwnShop = await review({order: ownShopOrder.toString(), product: mug.toString(), rating: 2}, "http://shop.example.com", shopBuyer);

        expect([fromSite.status, fromSite.body.error_code, fromOwnShop.status, fromOwnShop.body.error_code]).toEqual([200, undefined, 200, undefined]);
        const stored = await fixtures(() => ProductReview.find({}).lean());
        expect(stored.map(row => String(row.company))).toEqual([String(seller), String(seller)]);
        expect((await fixtures(() => Product.findById(mug).lean()))?.ratingAverage).toBe(3);
    });

    it("refuses another person's order, an unpaid order, a product not in the order, and a second review", async () => {
        const someoneElses = await seedOrder(new ObjectId());
        const unpaid = await seedOrder(buyer, "pending");

        const notMine = await review({order: someoneElses.toString(), product: mug.toString(), rating: 5});
        const notPaid = await review({order: unpaid.toString(), product: mug.toString(), rating: 5});
        const notInOrder = await review({order: order.toString(), product: book.toString(), rating: 5});
        const first = await review({order: order.toString(), product: mug.toString(), rating: 5});
        const second = await review({order: order.toString(), product: mug.toString(), rating: 1});

        expect([notMine.status, notMine.body.error_code]).toEqual([400, "order_not_found"]);
        expect(notPaid.body.error_code).toBe("order_must_be_paid_to_review");
        expect(notInOrder.body.error_code).toBe("product_not_in_order");
        expect([first.status, second.body.error_code]).toEqual([200, "product_already_reviewed_for_order"]);
        expect(await fixtures(() => ProductReview.countDocuments({}))).toBe(1);
        expect((await fixtures(() => Product.findById(mug).lean()))?.ratingAverage).toBe(5);
    });

    // The panel create runs the same rules in the request's company.
    it("keeps the panel create in the request's company", async () => {
        const staffBuyer = callerHeader({userId: buyer.toString(), companyId: seller.toString(), permissions: allPermissionTags([ProductReview])});

        const created = await request(app).put("/api/eCommerce/productReview").set(staffBuyer)
            .send({order: order.toString(), product: mug.toString(), rating: 4});
        const fromPlatform = await request(app).put("/api/eCommerce/productReview")
            .set(callerHeader({userId: buyer.toString(), companyId: platform.toString(), permissions: allPermissionTags([ProductReview])}))
            .send({order: order.toString(), product: mug.toString(), rating: 4});

        expect([created.status, created.body.error_code]).toEqual([200, undefined]);
        expect(fromPlatform.body.error_code).toBe("order_not_found");
        const product = await fixtures(() => Product.findById(mug).lean());
        expect([product?.ratingAverage, product?.reviewCount]).toEqual([4, 1]);
    });
});

describe("the buyer's order list marks the lines they reviewed (TD-F147)", () => {
    const myOrders = (origin: string, caller = portalBuyer) =>
        request(app).post("/api/eCommerce/productOrder/my").set({...caller, Origin: origin}).send({limit: 50});
    type ListedOrder = {_id: string; items: {product: {_id: string}; reviewed?: boolean}[]};
    const reviewedLines = (body: {data: ListedOrder[]}, id: ObjectId) =>
        body.data.find((row) => row._id === id.toString())?.items.map((item) => [item.product._id, item.reviewed]);

    it("says, per order, which products the buyer already reviewed", async () => {
        const again = await seedOrder(buyer);
        const both = await fixtures(async () => (await ProductOrder.collection.insertOne({
            company: seller, customer: buyer, paymentStatus: "paid", status: "processing",
            orderNumber: `ORD-${new ObjectId().toHexString()}`, idempotencyKey: new ObjectId().toHexString(),
            items: [{_id: new ObjectId(), product: mug, quantity: 1, unitPrice: 10}, {_id: new ObjectId(), product: book, quantity: 1, unitPrice: 20}],
            deletedAt: null,
        })).insertedId);
        expect((await review({order: order.toString(), product: mug.toString(), rating: 5})).status).toBe(200);
        expect((await review({order: both.toString(), product: book.toString(), rating: 4})).status).toBe(200);

        const listed = await myOrders(apex);

        expect([listed.status, listed.body.error_code]).toEqual([200, undefined]);
        expect(reviewedLines(listed.body, order)).toEqual([[mug.toString(), true]]);
        expect(reviewedLines(listed.body, again)).toEqual([[mug.toString(), false]]);
        expect(reviewedLines(listed.body, both)).toEqual([[mug.toString(), false], [book.toString(), true]]);
    });

    it("does the same on the seller's own shop, where the buyer's session is the seller's", async () => {
        await review({order: order.toString(), product: mug.toString(), rating: 5});
        const shopBuyer = callerHeader({userId: buyer.toString(), companyId: seller.toString()});

        const listed = await myOrders("http://shop.example.com", shopBuyer);

        expect([listed.status, listed.body.error_code]).toEqual([200, undefined]);
        expect(reviewedLines(listed.body, order)).toEqual([[mug.toString(), true]]);
    });
});
