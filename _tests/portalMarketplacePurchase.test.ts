import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import request from "supertest";
import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";

vi.mock("@coreModule/utilities/middlewares/authMW", async () =>
    (await import("@coreModule/_tests/httpHarness")).authMWStub);
vi.mock("@eCommerceModule/utilities/services/productOrderNotify", () => ({
    notifyProductOrderCustomer: vi.fn(async () => undefined),
    notifyMerchantsNewOrder: vi.fn(async () => undefined),
    notifyMerchantsLowStock: vi.fn(async () => undefined),
    notifyAbandonedCartEmail: vi.fn(async () => undefined),
}));

import Company from "@coreModule/database/schemas/company/company";
import Currency from "@coreModule/database/schemas/currency/currency";
import Product from "@eCommerceModule/database/schemas/product/product";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import Checkout from "@eCommerceModule/database/schemas/checkout/checkout";
import Country from "@coreModule/database/schemas/country/country";
import TaxZone from "@eCommerceModule/database/schemas/taxZone/taxZone";
import ShippingZone from "@eCommerceModule/database/schemas/shippingZone/shippingZone";
import {getPaymentSourceHandler} from "@financeModule/utilities/services/payment/paymentSourceHandlers";
import {getLogger} from "@coreModule/loggers/serverLog";
import * as productOrderRoute from "@eCommerceModule/api/eCommerce/private/productOrder";
import "@eCommerceModule/api/eCommerce/public/paymentsWebhook";
import * as serviceOrderRoute from "@eCommerceModule/api/eCommerceMarketplace/private/order";
import Listing from "@eCommerceModule/database/schemas/listing/listing";
import ListingPackage from "@eCommerceModule/database/schemas/listingPackage/listingPackage";
import Order from "@eCommerceModule/database/schemas/order/order";
import Review from "@eCommerceModule/database/schemas/review/review";
import Dispute from "@eCommerceModule/database/schemas/dispute/dispute";
import DigitalDelivery from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery";
import State from "@coreModule/database/schemas/state/state";
import * as reviewRoute from "@eCommerceModule/api/eCommerceMarketplace/private/review";
import * as disputeRoute from "@eCommerceModule/api/eCommerceMarketplace/private/dispute";
import * as digitalDeliveryRoute from "@eCommerceModule/api/eCommerce/private/digitalDelivery";
import {appFor, callerHeader} from "@coreModule/_tests/httpHarness";
import {asCrossTenant, withTenant} from "@coreModule/utilities/endpoints/tenantScope";
import {PORTAL_ROOT_DOMAIN} from "@coreModule/environment";
import * as cartRoute from "@eCommerceModule/api/eCommerce/private/cart";
import * as checkoutRoute from "@eCommerceModule/api/eCommerce/private/checkout";
import {runCheckoutExpiry} from "@eCommerceModule/utilities/cronJobs/checkoutExpiryJob";

// The portal apex sells every listed seller's products from one cart (D16: the marketplace is an explicit opt-out).
const app = appFor([
    {...cartRoute, module: "eCommerce"},
    {...checkoutRoute, module: "eCommerce"},
    {...productOrderRoute, module: "eCommerce"},
    {...serviceOrderRoute, module: "eCommerce"},
    {...reviewRoute, module: "eCommerce"},
    {...disputeRoute, module: "eCommerce"},
    {...digitalDeliveryRoute, module: "eCommerce"},
]);

const platform = new ObjectId();
const sellerA = new ObjectId();
const sellerB = new ObjectId();
const buyer = new ObjectId();
const apex = `http://${PORTAL_ROOT_DOMAIN}:5212`;
const shopper = callerHeader({userId: buyer.toString(), companyId: platform.toString()});
const address = {firstName: "Ana", lastName: "Buyer", street: "Rruga 1", city: "Tirane"};
/** Countries are rows per company: the platform's own Albania, which a portal address names. */
let platformAlbania: ObjectId;

beforeAll(async () => {
    await connectTestDatabase();
}, 120000);

afterAll(async () => {
    await disconnectTestDatabase();
});

beforeEach(() => asCrossTenant("test setup", async () => {
    for (const collection of await mongoose.connection.db!.collections()) {
        await collection.deleteMany({});
    }
}));

/**
 * A listed seller with one product in its own currency row (EUR) and `stock` units in its default warehouse; with
 * `vatRate`, a tax zone on its own Albania row.
 */
async function seedSeller(company: ObjectId, name: string, price: number, stock: number, vatRate?: number) {
    await Company.collection.insertOne({_id: company, name, vat: `VAT-${name}`, isActive: true, modules: ["eCommerce"], shopListedOnPortal: true, deletedAt: null});
    return withTenant(company, async () => {
        const currency = await new Currency({name: "Euro", symbol: "€", decimalPlaces: 2, abbreviation: "EUR", company}).save();
        const warehouse = await new Warehouse({name: "Main", code: `WH-${name}`, company, isActive: true, isDefault: true}).save();
        const product = await new Product({
            title: `${name} product`, slug: `${name.toLowerCase()}-product`, type: "physical", status: "active",
            price, currency: currency._id, company,
        }).save();
        await Inventory.create({product: product._id, warehouse: warehouse._id, quantityOnHand: stock, quantityReserved: 0, company});
        if (vatRate) {
            const albania = await new Country({name: "Albania", code: "AL", phoneCode: "355", company}).save();
            await new TaxZone({
                name: "VAT", country: albania._id, isActive: true, priority: 1, company,
                rates: [{name: "VAT", rate: vatRate, isCompound: false, appliesTo: "all"}],
            }).save();
            await new ShippingZone({
                name: "Albania", countries: [albania._id], isActive: true, company,
                rates: [{name: "Courier", type: "flat", price: 5}],
            }).save();
        }
        return Object.assign(product, {currencyRow: currency._id});
    });
}

const call = (method: "put" | "post" | "get", path: string, body?: Record<string, unknown>, origin = apex) =>
    request(app)[method](path).set({...shopper, Origin: origin}).send(body);

describe("portal marketplace purchase (D16)", () => {
    beforeEach(async () => {
        await Company.collection.insertOne({_id: platform, name: "Platform", vat: "VAT-Platform", isActive: true, modules: ["eCommerce"], isPlatformOwner: true, deletedAt: null});
        platformAlbania = (await withTenant(platform, () => new Country({name: "Albania", code: "AL", phoneCode: "355", company: platform}).save()))._id;
    });

    /** Rings up both sellers' products on the apex and confirms cash on delivery; the confirm response. */
    async function buyFromBothSellers(mug: {_id: ObjectId}, book: {_id: ObjectId}, idempotencyKey: string) {
        for (const product of [mug, book]) {
            const added = await call("put", "/api/eCommerce/cart/item", {productId: product._id.toString(), quantity: 2});
            expect([added.status, added.body.error_code]).toEqual([200, undefined]);
        }
        const init = await call("post", "/api/eCommerce/checkout/init", {idempotencyKey});
        expect([init.status, init.body.error_code]).toEqual([200, undefined]);
        const checkoutId: string = init.body.data._id;
        for (const [path, body] of [
            ["/api/eCommerce/checkout/address", {checkoutId, shippingAddress: {...address, country: platformAlbania.toString()}}],
            ["/api/eCommerce/checkout/shipping", {checkoutId, rateIndex: 0}],
            ["/api/eCommerce/checkout/payment", {checkoutId, paymentMethod: "cod"}],
        ] as const) {
            const step = await call("post", path, body);
            expect([path, step.status, step.body.error_code]).toEqual([path, 200, undefined]);
        }
        const confirmed = await call("post", "/api/eCommerce/checkout/confirm", {checkoutId, email: "buyer@example.com"});
        expect([confirmed.status, confirmed.body.error_code]).toEqual([200, undefined]);
        return {checkoutId, confirmed};
    }

    // TD-B86, TD-B88: each seller's order is in its own currency row, and taxed by its own zones.
    it("puts each seller's order in its own currency row and taxes it by the seller's zones", async () => {
        const mug = await seedSeller(sellerA, "Alpha", 10, 5);
        const book = await seedSeller(sellerB, "Beta", 20, 5, 20);

        await buyFromBothSellers(mug, book, "apex-checkout-3");

        const orders = await asCrossTenant("test assertions", () => ProductOrder.find({}).sort({grandTotal: 1}));
        expect(orders.map(order => [String(order.company), String(order.currency), order.currencyCode, order.taxTotal])).toEqual([
            [sellerA.toString(), mug.currencyRow.toString(), "EUR", 0],
            [sellerB.toString(), book.currencyRow.toString(), "EUR", 8],
        ]);
    });

    // TD-B90: a single foreign seller's cart is shipped and taxed by that seller's zones, on its own Albania row.
    it("offers a single seller's shipping and charges its VAT for an apex address", async () => {
        const book = await seedSeller(sellerB, "Beta", 20, 5, 20);
        await call("put", "/api/eCommerce/cart/item", {productId: book._id.toString(), quantity: 2});
        const checkoutId: string = (await call("post", "/api/eCommerce/checkout/init", {idempotencyKey: "apex-checkout-6"})).body.data._id;

        const rated = await call("post", "/api/eCommerce/checkout/address", {checkoutId, shippingAddress: {...address, country: platformAlbania.toString()}});
        const shipped = await call("post", "/api/eCommerce/checkout/shipping", {checkoutId, rateIndex: 0});

        expect(rated.body.data.availableShippingRates.map((rate: {name: string; price: number}) => [rate.name, rate.price])).toEqual([["Courier", 5]]);
        expect([shipped.status, shipped.body.data.shippingTotal, shipped.body.data.taxTotal, shipped.body.data.grandTotal]).toEqual([200, 5, 8, 53]);
    });

    // TD-B87: the buyer's account pages on the apex list their orders from every seller, and only theirs.
    it("lists and opens the buyer's orders from every seller on the apex", async () => {
        const mug = await seedSeller(sellerA, "Alpha", 10, 5);
        const book = await seedSeller(sellerB, "Beta", 20, 5);
        await buyFromBothSellers(mug, book, "apex-checkout-4");
        const someoneElses = await asCrossTenant("test setup", async () => {
            const order = (await ProductOrder.findOne({company: sellerB}))!.toObject();
            return ProductOrder.collection.insertOne({...order, _id: new ObjectId(), customer: new ObjectId(), orderNumber: "OTHER", idempotencyKey: "other"});
        });

        const mine = await call("post", "/api/eCommerce/productOrder/my", {page: 1, limit: 10});
        const sellerBOrder = mine.body.data.find((order: {subtotal: number}) => order.subtotal === 40);
        const single = await call("post", "/api/eCommerce/productOrder/mySingle", {_id: sellerBOrder._id});
        const notMine = await call("post", "/api/eCommerce/productOrder/mySingle", {_id: someoneElses.insertedId.toString()});

        expect([mine.status, mine.body.total]).toEqual([200, 2]);
        expect([single.status, single.body.data.subtotal]).toEqual([200, 40]);
        expect(notMine.body.error_code).toBe("order_not_found");
    });

    // TD-B87: a payment confirmed by the gateway marks every seller's order of the checkout paid.
    it("marks every seller's order paid when the checkout's payment succeeds", async () => {
        const mug = await seedSeller(sellerA, "Alpha", 10, 5);
        const book = await seedSeller(sellerB, "Beta", 20, 5);
        const {checkoutId} = await buyFromBothSellers(mug, book, "apex-checkout-5");
        await asCrossTenant("test setup", () => Checkout.updateOne({_id: new ObjectId(checkoutId)}, {$set: {stripePaymentIntentId: "pi_apex"}}));

        // As the Stripe webhook runs it: in the tenant of the charge's ledger row, the platform
        await withTenant(platform, () => getPaymentSourceHandler("checkout")!.succeeded({id: "pi_apex", amountMinor: undefined, currencyCode: "eur"}, {logger: getLogger("test"), languageCode: "en-US"}));

        const orders = await asCrossTenant("test assertions", () => ProductOrder.find({}));
        expect(orders.map(order => order.paymentStatus)).toEqual(["paid", "paid"]);
    });

    it("buys two sellers' products from the apex: one order per seller, stock held in each seller's warehouse", async () => {
        const mug = await seedSeller(sellerA, "Alpha", 10, 5);
        const book = await seedSeller(sellerB, "Beta", 20, 5);

        for (const product of [mug, book]) {
            const added = await call("put", "/api/eCommerce/cart/item", {productId: product._id.toString(), quantity: 2});
            expect([added.status, added.body.error_code]).toEqual([200, undefined]);
        }
        const cart = await call("get", "/api/eCommerce/cart");
        expect(cart.body.data.subtotal).toBe(60);

        const init = await call("post", "/api/eCommerce/checkout/init", {idempotencyKey: "apex-checkout-1"});
        expect([init.status, init.body.error_code]).toEqual([200, undefined]);
        const checkoutId = init.body.data._id;
        for (const [path, body] of [
            ["/api/eCommerce/checkout/address", {checkoutId, shippingAddress: address}],
            ["/api/eCommerce/checkout/shipping", {checkoutId, rateIndex: 0}],
            ["/api/eCommerce/checkout/payment", {checkoutId, paymentMethod: "cod"}],
        ] as const) {
            const step = await call("post", path, body);
            expect([path, step.status, step.body.error_code]).toEqual([path, 200, undefined]);
        }

        const confirmed = await call("post", "/api/eCommerce/checkout/confirm", {checkoutId, email: "buyer@example.com"});

        expect([confirmed.status, confirmed.body.error_code]).toEqual([200, undefined]);
        expect(confirmed.body.siblingOrderIds).toHaveLength(1);
        await asCrossTenant("test assertions", async () => {
            const orders = await ProductOrder.find({}).sort({grandTotal: 1});
            expect(orders.map(order => [String(order.company), order.subtotal, order.items.length])).toEqual([
                [sellerA.toString(), 20, 1],
                [sellerB.toString(), 40, 1],
            ]);
            const held = await Inventory.find({}).sort({company: 1});
            expect(Object.fromEntries(held.map(row => [String(row.company), row.quantityReserved]))).toEqual({
                [sellerA.toString()]: 2,
                [sellerB.toString()]: 2,
            });
        });
    });

    it("settles an expired marketplace checkout from the platform's expiry job, releasing each seller's stock", async () => {
        const mug = await seedSeller(sellerA, "Alpha", 10, 5);
        const book = await seedSeller(sellerB, "Beta", 20, 5);
        for (const product of [mug, book]) await call("put", "/api/eCommerce/cart/item", {productId: product._id.toString(), quantity: 1});
        const checkoutId = (await call("post", "/api/eCommerce/checkout/init", {idempotencyKey: "apex-checkout-2"})).body.data._id;
        await call("post", "/api/eCommerce/checkout/address", {checkoutId, shippingAddress: address});
        await call("post", "/api/eCommerce/checkout/shipping", {checkoutId, rateIndex: 0});
        expect((await call("post", "/api/eCommerce/checkout/payment", {checkoutId, paymentMethod: "cod"})).status).toBe(200);
        await asCrossTenant("test setup", () => Checkout.updateOne({_id: new ObjectId(checkoutId)}, {$set: {expiresAt: new Date(Date.now() - 60000)}}));

        await withTenant(platform, () => runCheckoutExpiry(platform));

        await asCrossTenant("test assertions", async () => {
            expect((await Checkout.findById(checkoutId))!.status).toBe("expired");
            expect((await Inventory.find({})).map(row => row.quantityReserved)).toEqual([0, 0]);
        });
    });

    it("still keeps a company's own shop inside its company: another company's product is not found", async () => {
        const mug = await seedSeller(sellerA, "Alpha", 10, 5);

        const added = await call("put", "/api/eCommerce/cart/item", {productId: mug._id.toString(), quantity: 1}, "http://shop.example.com");

        expect([added.status, added.body.error_code]).toEqual([400, "product_not_found"]);
    });

    // TD-B91: the services marketplace orders a listing from its seller and shows the buyer their orders from every seller.
    it("orders another seller's service listing from the apex and lists it on the buyer's pages", async () => {
        const mug = await seedSeller(sellerA, "Alpha", 10, 5);
        const provider = new ObjectId();
        const listing = await asCrossTenant("test setup", async () => {
            const {insertedId} = await Listing.collection.insertOne({
                name: "LIST-1", title: "Wall painting", category: new ObjectId(), provider, price: 100, priceCurrency: mug.currencyRow,
                pricingType: "fixed", deliveryDays: 3, status: "active", mainImage: new ObjectId(), listingPackages: [], company: sellerA, createdAt: new Date(),
            });
            const pkg = await ListingPackage.collection.insertOne({
                listing: insertedId, provider, name: "Pack", price: {amount: 150, currency: mug.currencyRow}, deliveryDays: 5, order: 0, company: sellerA,
            });
            return {listing: insertedId, pkg: pkg.insertedId};
        });

        const created = await call("post", "/api/eCommerceMarketplace/order/createFromListing", {listing: listing.listing.toString(), package: listing.pkg.toString()});
        const mine = await call("post", "/api/eCommerceMarketplace/order/my", {});
        const single = await call("post", "/api/eCommerceMarketplace/order/mySingle", {_id: created.body._id});

        expect([created.status, created.body.error_code]).toEqual([200, undefined]);
        const order = (await asCrossTenant("test assertions", () => Order.findById(created.body._id)))!;
        expect([String(order.company), order.amount]).toEqual([sellerA.toString(), 150]);
        expect([mine.status, mine.body.total, single.status]).toEqual([200, 1, 200]);
    });

    /** A services order of seller A that the shopper bought on the portal, in `status`. */
    async function seedServiceOrder(status: string) {
        const provider = new ObjectId();
        return asCrossTenant("test setup", async () => (await Order.collection.insertOne({
            name: `ORD-${new ObjectId().toString()}`, listing: new ObjectId(), customer: buyer, provider, amount: 100,
            currency: new ObjectId(), status, company: sellerA, createdAt: new Date(),
        })).insertedId);
    }
    const storedOrder = (_id: ObjectId) => asCrossTenant("test assertions", () => Order.findById(_id));

    // TD-B93: the buyer's own actions on a services order of another seller, from the apex.
    it("lets the buyer cancel, review and dispute their own services order of another seller from the apex", async () => {
        await seedSeller(sellerA, "Alpha", 10, 5);
        const pending = await seedServiceOrder("pending");
        const completed = await seedServiceOrder("completed");
        const active = await seedServiceOrder("in_progress");

        const cancelled = await call("post", "/api/eCommerceMarketplace/order/cancel", {_id: pending.toString()});
        const reviewed = await call("put", "/api/eCommerceMarketplace/review/createMine", {order: completed.toString(), rating: 5, comment: "Great"});
        const disputed = await call("put", "/api/eCommerceMarketplace/dispute/createMine", {order: active.toString(), reason: "Late"});

        expect([cancelled.status, cancelled.body.error_code]).toEqual([200, undefined]);
        expect([reviewed.status, reviewed.body.error_code]).toEqual([200, undefined]);
        expect([disputed.status, disputed.body.error_code]).toEqual([200, undefined]);
        expect((await storedOrder(pending))!.status).toBe("cancelled");
        await asCrossTenant("test assertions", async () => {
            expect(String((await Review.findOne({order: completed}))!.company)).toBe(sellerA.toString());
            expect(String((await Dispute.findOne({order: active}))!.company)).toBe(sellerA.toString());
        });
    });

    it("keeps seller-side actions and other buyers' orders inside the request's company", async () => {
        await seedSeller(sellerA, "Alpha", 10, 5);
        const pending = await seedServiceOrder("pending");
        await asCrossTenant("test setup", () => Order.collection.updateOne({_id: pending}, {$set: {customer: new ObjectId()}}));

        const accepted = await call("post", "/api/eCommerceMarketplace/order/accept", {_id: pending.toString()});
        const cancelled = await call("post", "/api/eCommerceMarketplace/order/cancel", {_id: pending.toString()});

        expect(accepted.status).not.toBe(200);
        expect(cancelled.body.error_code).toBe("order_not_found");
        expect((await storedOrder(pending))!.status).toBe("pending");
    });

    // TD-B93: the buyer's downloads on the apex come from every seller.
    it("lists the buyer's downloads from every seller on the apex", async () => {
        const mug = await seedSeller(sellerA, "Alpha", 10, 5);
        await asCrossTenant("test setup", () => DigitalDelivery.collection.insertOne({
            order: new ObjectId(), product: mug._id, customer: buyer, token: "tok", media: [], downloadLimit: 3, downloadCount: 0, company: sellerA,
        }));

        const downloads = await call("post", "/api/eCommerce/digitalDelivery/my", {});

        expect([downloads.status, downloads.body.data?.length]).toEqual([200, 1]);
    });

    // TD-B92: an address whose state is the platform's state row still matches the seller's state-restricted zones.
    it("matches a seller's state-restricted zones from an apex address that names a state row", async () => {
        const book = await seedSeller(sellerB, "Beta", 20, 5, 20);
        const platformTirana = await asCrossTenant("test setup", async () => {
            const sellerAlbania = (await Country.findOne({company: sellerB}))!._id;
            const sellerTirana = (await State.collection.insertOne({name: "Tirana District", code: "TR", country: sellerAlbania, company: sellerB})).insertedId;
            await TaxZone.updateOne({company: sellerB}, {$set: {states: [sellerTirana]}});
            await ShippingZone.updateOne({company: sellerB}, {$set: {states: [sellerTirana]}});
            return (await State.collection.insertOne({name: "Tirana District", code: "TR", country: platformAlbania, company: platform})).insertedId;
        });
        await call("put", "/api/eCommerce/cart/item", {productId: book._id.toString(), quantity: 2});
        const checkoutId: string = (await call("post", "/api/eCommerce/checkout/init", {idempotencyKey: "apex-checkout-7"})).body.data._id;

        const shippingAddress = {...address, country: platformAlbania.toString(), state: platformTirana.toString()};
        const rated = await call("post", "/api/eCommerce/checkout/address", {checkoutId, shippingAddress});
        const shipped = await call("post", "/api/eCommerce/checkout/shipping", {checkoutId, rateIndex: 0});

        expect(rated.body.data.availableShippingRates.map((rate: {name: string}) => rate.name)).toEqual(["Courier"]);
        expect([shipped.status, shipped.body.data.taxTotal]).toEqual([200, 8]);
    });
});
