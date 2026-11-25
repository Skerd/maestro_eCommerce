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
import DigitalDelivery from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery";
import State from "@coreModule/database/schemas/state/state";
import * as digitalDeliveryRoute from "@eCommerceModule/api/eCommerce/private/digitalDelivery";
import {appFor, callerHeader} from "@coreModule/_tests/httpHarness";
import {asCrossTenant, withTenant} from "@coreModule/utilities/endpoints/tenantScope";
import {PORTAL_ROOT_DOMAIN} from "@coreModule/environment";
import * as cartRoute from "@eCommerceModule/api/eCommerce/private/cart";
import * as checkoutRoute from "@eCommerceModule/api/eCommerce/private/checkout";
import {runCheckoutExpiry} from "@eCommerceModule/utilities/cronJobs/checkoutExpiryJob";
import {stripeAdapter} from "@financeModule/utilities/services/payment/stripeAdapter";

// The portal apex sells every listed seller's products from one cart (D16: the marketplace is an explicit opt-out).
const app = appFor([
    {...cartRoute, module: "eCommerce"},
    {...checkoutRoute, module: "eCommerce"},
    {...productOrderRoute, module: "eCommerce"},
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

/** The platform's euro: currencies are a platform list (D160), one row every seller prices in. */
async function platformEuro(): Promise<ObjectId> {
    return asCrossTenant("test setup", async () => {
        const existing = await Currency.collection.findOne({abbreviation: "EUR"});
        return existing?._id ?? (await Currency.collection.insertOne({name: "Euro", symbol: "€", decimalPlaces: 2, abbreviation: "EUR", company: platform, deletedAt: null})).insertedId;
    });
}

/**
 * A listed seller with one product in the platform's euro and `stock` units in its default warehouse; with `vatRate`,
 * a tax and a shipping zone on the platform's Albania row (D160).
 */
async function seedSeller(company: ObjectId, name: string, price: number, stock: number, vatRate?: number) {
    await Company.collection.insertOne({_id: company, name, vat: `VAT-${name}`, isActive: true, modules: ["eCommerce"], shopListedOnPortal: true, deletedAt: null});
    const euro = await platformEuro();
    return withTenant(company, async () => {
        const warehouse = await new Warehouse({name: "Main", code: `WH-${name}`, company, isActive: true, isDefault: true}).save();
        const product = await new Product({
            title: `${name} product`, slug: `${name.toLowerCase()}-product`, type: "physical", status: "active",
            price, currency: euro, company,
        }).save();
        await Inventory.create({product: product._id, warehouse: warehouse._id, quantityOnHand: stock, quantityReserved: 0, company});
        if (vatRate) {
            await new TaxZone({
                name: "VAT", country: platformAlbania, isActive: true, priority: 1, company,
                rates: [{name: "VAT", rate: vatRate, isCompound: false, appliesTo: "all"}],
            }).save();
            await new ShippingZone({
                name: "Albania", countries: [platformAlbania], isActive: true, company,
                rates: [{name: "Courier", type: "flat", price: 5}],
            }).save();
        }
        return Object.assign(product, {currencyRow: euro});
    });
}

const call = (method: "put" | "post" | "get", path: string, body?: Record<string, unknown>, origin = apex) =>
    request(app)[method](path).set({...shopper, Origin: origin}).send(body);

describe("portal marketplace purchase (D16)", () => {
    beforeEach(async () => {
        await Company.collection.insertOne({_id: platform, name: "Platform", vat: "VAT-Platform", isActive: true, modules: ["eCommerce"], isPlatformOwner: true, deletedAt: null});
        platformAlbania = (await withTenant(platform, () => new Country({name: "Albania", code: "AL", phoneCode: "355", company: platform}).save()))._id;
    });

    /** Rings up both sellers' products on the apex and confirms with `paymentMethod` (cash on delivery); the confirm response. */
    async function buyFromBothSellers(
        mug: {_id: ObjectId},
        book: {_id: ObjectId},
        idempotencyKey: string,
        addresses: Record<string, unknown> = {shippingAddress: {...address, country: platformAlbania.toString()}},
        paymentMethod = "cod",
    ) {
        for (const product of [mug, book]) {
            const added = await call("put", "/api/eCommerce/cart/item", {productId: product._id.toString(), quantity: 2});
            expect([added.status, added.body.error_code]).toEqual([200, undefined]);
        }
        const init = await call("post", "/api/eCommerce/checkout/init", {idempotencyKey});
        expect([init.status, init.body.error_code]).toEqual([200, undefined]);
        const checkoutId: string = init.body.data._id;
        for (const [path, body] of [
            ["/api/eCommerce/checkout/address", {checkoutId, ...addresses}],
            ["/api/eCommerce/checkout/shipping", {checkoutId, rateIndex: 0}],
            ["/api/eCommerce/checkout/payment", {checkoutId, paymentMethod}],
        ] as const) {
            const step = await call("post", path, body);
            expect([path, step.status, step.body.error_code]).toEqual([path, 200, undefined]);
        }
        const confirmed = await call("post", "/api/eCommerce/checkout/confirm", {checkoutId, email: "buyer@example.com"});
        expect([confirmed.status, confirmed.body.error_code]).toEqual([200, undefined]);
        return {checkoutId, confirmed};
    }

    /** Where a seller's customers pay by bank transfer (D190). */
    const ibanOf = {[sellerA.toString()]: "AL47212110090000000235698741", [sellerB.toString()]: "AL35202111090000000001234567"};
    const giveBankAccount = (seller: ObjectId) => asCrossTenant("test setup", () => Company.collection.updateOne(
        {_id: seller},
        {$set: {bankAccount: {holder: `Seller ${seller.toString().slice(-4)} sh.p.k.`, iban: ibanOf[seller.toString()], bic: "BKTRALTR", bankName: "BKT"}}},
    ));

    /** Both sellers' products in the cart, the checkout at its payment step; the shipping step's response. */
    async function checkoutAtPayment(idempotencyKey: string) {
        const mug = await seedSeller(sellerA, "Alpha", 10, 5);
        const book = await seedSeller(sellerB, "Beta", 20, 5);
        for (const product of [mug, book]) await call("put", "/api/eCommerce/cart/item", {productId: product._id.toString(), quantity: 1});
        const checkoutId: string = (await call("post", "/api/eCommerce/checkout/init", {idempotencyKey})).body.data._id;
        await call("post", "/api/eCommerce/checkout/address", {checkoutId, shippingAddress: address});
        const shipped = await call("post", "/api/eCommerce/checkout/shipping", {checkoutId, rateIndex: 0});
        expect([shipped.status, shipped.body.error_code]).toEqual([200, undefined]);
        return {checkoutId, shipped};
    }

    // D160: every seller's order is in the checkout's currency, the one platform row, and taxed by the seller's own zones.
    it("puts each seller's order in the platform's currency row and taxes it by the seller's zones", async () => {
        const mug = await seedSeller(sellerA, "Alpha", 10, 5);
        const book = await seedSeller(sellerB, "Beta", 20, 5, 20);

        await buyFromBothSellers(mug, book, "apex-checkout-3");

        const orders = await asCrossTenant("test assertions", () => ProductOrder.find({}).sort({grandTotal: 1}));
        expect(orders.map(order => [String(order.company), String(order.currency), order.currencyCode, order.taxTotal])).toEqual([
            [sellerA.toString(), mug.currencyRow.toString(), "EUR", 0],
            [sellerB.toString(), book.currencyRow.toString(), "EUR", 8],
        ]);
    });

    // TD-B90, D160: a single foreign seller's cart is shipped and taxed by that seller's zones, which name the platform's Albania.
    it("offers a single seller's shipping and charges its VAT for an apex address", async () => {
        const book = await seedSeller(sellerB, "Beta", 20, 5, 20);
        await call("put", "/api/eCommerce/cart/item", {productId: book._id.toString(), quantity: 2});
        const checkoutId: string = (await call("post", "/api/eCommerce/checkout/init", {idempotencyKey: "apex-checkout-6"})).body.data._id;

        const rated = await call("post", "/api/eCommerce/checkout/address", {checkoutId, shippingAddress: {...address, country: platformAlbania.toString()}});
        const shipped = await call("post", "/api/eCommerce/checkout/shipping", {checkoutId, rateIndex: 0});

        expect(rated.body.data.availableShippingRates.map((rate: {name: string; price: number}) => [rate.name, rate.price])).toEqual([["Courier", 5]]);
        expect([shipped.status, shipped.body.data.shippingTotal, shipped.body.data.taxTotal, shipped.body.data.grandTotal]).toEqual([200, 5, 8, 53]);
    });

    /** The platform's Tirana state (code TR) of Albania: states are a platform list (D160). */
    async function seedTirana(): Promise<ObjectId> {
        return asCrossTenant("test setup", async () =>
            (await State.collection.insertOne({name: "Tirana", code: "TR", country: platformAlbania, company: platform})).insertedId);
    }

    // D160: every seller's order keeps the buyer's country row, and its state's name (an order's state is text).
    it("stores the buyer's country row and state name on each seller's order", async () => {
        const mug = await seedSeller(sellerA, "Alpha", 10, 5, 10);
        const book = await seedSeller(sellerB, "Beta", 20, 5, 20);
        const tirana = await seedTirana();
        const country = platformAlbania.toString();

        await buyFromBothSellers(mug, book, "apex-checkout-8", {
            shippingAddress: {...address, country, state: tirana.toString()},
            billingAddress: {...address, street: "Rruga 2", country, state: "Durrës"},
        });

        const orders = await asCrossTenant("test assertions", () => ProductOrder.find({}).sort({grandTotal: 1}));
        expect(orders.map(order => [
            String(order.shippingAddress.country), order.shippingAddress.state, String(order.billingAddress?.country), order.billingAddress?.state,
        ])).toEqual([
            [country, "Tirana", country, "Durrës"],
            [country, "Tirana", country, "Durrës"],
        ]);
    });

    // The buyer's order detail on the apex shows the address with its country.
    it("shows the buyer the address of a seller's order", async () => {
        const mug = await seedSeller(sellerA, "Alpha", 10, 5);
        const book = await seedSeller(sellerB, "Beta", 20, 5, 20);
        const tirana = await seedTirana();

        await buyFromBothSellers(mug, book, "apex-checkout-9", {
            shippingAddress: {...address, postalCode: "1001", country: platformAlbania.toString(), state: tirana.toString()},
        });

        const mine = await call("post", "/api/eCommerce/productOrder/my", {page: 1, limit: 10});
        const sellerBOrder = mine.body.data.find((order: {subtotal: number}) => order.subtotal === 40);
        const single = await call("post", "/api/eCommerce/productOrder/mySingle", {_id: sellerBOrder._id});
        const shown = single.body.data.shippingAddress;
        expect([single.status, shown.street, shown.postalCode, shown.city, shown.country?.name, shown.state]).toEqual(
            [200, "Rruga 1", "1001", "Tirane", "Albania", "Tirana"],
        );
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

    // TD-B93: the buyer's downloads on the apex come from every seller.
    it("lists the buyer's downloads from every seller on the apex", async () => {
        const mug = await seedSeller(sellerA, "Alpha", 10, 5);
        await asCrossTenant("test setup", () => DigitalDelivery.collection.insertOne({
            order: new ObjectId(), product: mug._id, customer: buyer, token: "tok", media: [], downloadLimit: 3, downloadCount: 0, company: sellerA,
        }));

        const downloads = await call("post", "/api/eCommerce/digitalDelivery/my", {});

        expect([downloads.status, downloads.body.data?.length]).toEqual([200, 1]);
    });

    // TD-B92, D160: an address naming a state row matches the seller's state-restricted zones, which name the same row.
    it("matches a seller's state-restricted zones from an apex address that names a state row", async () => {
        const book = await seedSeller(sellerB, "Beta", 20, 5, 20);
        const platformTirana = await seedTirana();
        await asCrossTenant("test setup", async () => {
            await TaxZone.updateOne({company: sellerB}, {$set: {states: [platformTirana]}});
            await ShippingZone.updateOne({company: sellerB}, {$set: {states: [platformTirana]}});
        });
        await call("put", "/api/eCommerce/cart/item", {productId: book._id.toString(), quantity: 2});
        const checkoutId: string = (await call("post", "/api/eCommerce/checkout/init", {idempotencyKey: "apex-checkout-7"})).body.data._id;

        const shippingAddress = {...address, country: platformAlbania.toString(), state: platformTirana.toString()};
        const rated = await call("post", "/api/eCommerce/checkout/address", {checkoutId, shippingAddress});
        const shipped = await call("post", "/api/eCommerce/checkout/shipping", {checkoutId, rateIndex: 0});

        expect(rated.body.data.availableShippingRates.map((rate: {name: string}) => rate.name)).toEqual(["Courier"]);
        expect([shipped.status, shipped.body.data.taxTotal]).toEqual([200, 8]);
    });

    // D190: the platform takes no cards yet; the buyer pays each seller offline.
    it("offers no card while card payments are coming soon, and refuses one sent anyway", async () => {
        const {checkoutId, shipped} = await checkoutAtPayment("apex-pay-1");

        const card = await call("post", "/api/eCommerce/checkout/payment", {checkoutId, paymentMethod: "stripe"});

        expect(shipped.body.data.paymentMethods).toEqual(["cod"]);
        expect([card.status, card.body.error_code]).toEqual([400, "payment_method_not_available"]);
    });

    it("offers a card again once the card processor is on", async () => {
        const cardsOn = vi.spyOn(stripeAdapter, "isEnabled").mockReturnValue(true);
        try {
            const {shipped} = await checkoutAtPayment("apex-pay-4");
            expect(shipped.body.data.paymentMethods).toEqual(["stripe", "cod"]);
        } finally {
            cardsOn.mockRestore();
        }
    });

    it("offers a bank transfer only once every seller on the checkout has a bank account", async () => {
        const {checkoutId, shipped} = await checkoutAtPayment("apex-pay-2");
        await giveBankAccount(sellerA);

        const refused = await call("post", "/api/eCommerce/checkout/payment", {checkoutId, paymentMethod: "bank_transfer"});
        await giveBankAccount(sellerB);
        const chosen = await call("post", "/api/eCommerce/checkout/payment", {checkoutId, paymentMethod: "bank_transfer"});

        expect(shipped.body.data.paymentMethods).toEqual(["cod"]);
        expect([refused.status, refused.body.error_code]).toEqual([400, "payment_method_not_available"]);
        expect([chosen.status, chosen.body.data.paymentMethods, chosen.body.data.paymentMethod]).toEqual([200, ["cod", "bank_transfer"], "bank_transfer"]);
    });

    it("shows each seller's bank-transfer order its own seller's bank account, never the other's", async () => {
        const mug = await seedSeller(sellerA, "Alpha", 10, 5);
        const book = await seedSeller(sellerB, "Beta", 20, 5);
        await giveBankAccount(sellerA);
        await giveBankAccount(sellerB);

        const {confirmed} = await buyFromBothSellers(mug, book, "apex-pay-3", undefined, "bank_transfer");

        const orders = await asCrossTenant("test assertions", () => ProductOrder.find({}));
        const sellerOf = new Map(orders.map(order => [order._id.toString(), order.company.toString()]));
        const placed: {_id: string; bankTransfer?: {iban?: string}}[] = [confirmed.body.data, ...confirmed.body.siblingOrders];
        expect(orders.map(order => order.paymentMethod)).toEqual(["bank_transfer", "bank_transfer"]);
        expect(placed.map(order => order.bankTransfer?.iban)).toEqual(placed.map(order => ibanOf[sellerOf.get(order._id)!]));
        for (const order of placed) {
            const single = await call("post", "/api/eCommerce/productOrder/mySingle", {_id: order._id});
            // The amount to transfer reads with its currency (UX-07)
            expect([single.status, single.body.data.bankTransfer?.iban, single.body.data.currency?.symbol]).toEqual([200, ibanOf[sellerOf.get(order._id)!], "€"]);
        }

        // Once the seller records the money, the order no longer asks for it
        await asCrossTenant("test setup", () => ProductOrder.updateMany({}, {$set: {paymentStatus: "paid"}}));
        const paid = await call("post", "/api/eCommerce/productOrder/mySingle", {_id: placed[0]._id});
        expect([paid.status, paid.body.data.bankTransfer]).toEqual([200, undefined]);
    });
});
