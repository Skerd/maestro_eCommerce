import {afterAll, beforeAll, beforeEach, describe, expect, it} from "vitest";
import {MongoMemoryServer} from "mongodb-memory-server";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import GiftCard from "@financeModule/database/schemas/giftCard/giftCard";
import {generateGiftCardCode, giftCardService} from "@financeModule/database/schemas/giftCard/giftCard.service";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import DigitalDelivery from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery";
import {explodeBundleLines} from "@eCommerceModule/utilities/services/inventoryReservationService";
import {fulfillOrderPaidExtras} from "@eCommerceModule/utilities/services/orderPaidFulfillmentService";

let mongod: MongoMemoryServer;

const companyId = new ObjectId();
const currencyId = new ObjectId();
const customerId = new ObjectId();

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
}, 120000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

beforeEach(async () => {
    await Promise.all([
        GiftCard.deleteMany({}),
        Product.deleteMany({}),
        ProductOrder.deleteMany({}),
        DigitalDelivery.deleteMany({}),
    ]);
});

describe("gift card service", () => {
    it("generates codes in the GC-XXXX-XXXX-XXXX format without ambiguous characters", () => {
        for (let i = 0; i < 20; i++) {
            const code = generateGiftCardCode();
            expect(code).toMatch(/^GC-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/);
        }
    });

    it("findRedeemable rejects disabled, expired, and zero-balance cards", async () => {
        await GiftCard.create([
            {code: "GC-GOOD-GOOD-GOOD", initialBalance: 50, balance: 50, status: "active", company: companyId},
            {code: "GC-DISA-BLED-CARD", initialBalance: 50, balance: 50, status: "disabled", company: companyId},
            {code: "GC-EMPT-YYYY-CARD", initialBalance: 50, balance: 0, status: "active", company: companyId},
            {code: "GC-EXPI-RED2-CARD", initialBalance: 50, balance: 50, status: "active", company: companyId, expiresAt: new Date(Date.now() - 1000)},
        ]);

        expect(await giftCardService.findRedeemable("gc-good-good-good", companyId, {})).not.toBeNull();
        expect(await giftCardService.findRedeemable("GC-DISA-BLED-CARD", companyId, {})).toBeNull();
        expect(await giftCardService.findRedeemable("GC-EMPT-YYYY-CARD", companyId, {})).toBeNull();
        expect(await giftCardService.findRedeemable("GC-EXPI-RED2-CARD", companyId, {})).toBeNull();
    });

    it("redeemAmount decrements atomically, refuses over-redemption, and depletes at zero", async () => {
        const card = await GiftCard.create({code: "GC-REDE-EMME-TEST", initialBalance: 100, balance: 100, status: "active", company: companyId});

        const first = await giftCardService.redeemAmount(card._id as ObjectId, 60, {});
        expect(first!.balance).toBe(40);
        expect(first!.status).toBe("active");

        const over = await giftCardService.redeemAmount(card._id as ObjectId, 50, {});
        expect(over).toBeNull();

        const rest = await giftCardService.redeemAmount(card._id as ObjectId, 40, {});
        expect(rest!.balance).toBe(0);

        const reloaded = await GiftCard.findById(card._id);
        expect(reloaded!.status).toBe("depleted");
    });

    it("recreditAmount reactivates depleted cards but never disabled ones", async () => {
        const depleted = await GiftCard.create({code: "GC-DEPL-ETED-CARD", initialBalance: 50, balance: 0, status: "depleted", company: companyId});
        const disabled = await GiftCard.create({code: "GC-DISA-BLED-BACK", initialBalance: 50, balance: 10, status: "disabled", company: companyId});

        const recredited = await giftCardService.recreditAmount(depleted._id as ObjectId, 30, {});
        expect(recredited!.balance).toBe(30);
        expect(recredited!.status).toBe("active");

        const blocked = await giftCardService.recreditAmount(disabled._id as ObjectId, 30, {});
        expect(blocked).toBeNull();
        const disabledReloaded = await GiftCard.findById(disabled._id);
        expect(disabledReloaded!.balance).toBe(10);
    });
});

describe("bundle explosion", () => {
    it("explodes bundle lines into merged component quantities", async () => {
        const componentA = new ObjectId();
        const componentB = new ObjectId();
        const bundle = await Product.create({
            title: "Starter kit", slug: "starter-kit", type: "bundle", status: "active", company: companyId,
            bundleComponents: [
                {product: componentA, quantity: 2},
                {product: componentB, quantity: 1},
            ],
        });

        const lines = await explodeBundleLines(
            [
                {product: bundle._id as ObjectId, quantity: 3},
                {product: componentA, quantity: 1},
            ],
            companyId,
            {},
        );

        const byProduct = Object.fromEntries(lines.map(line => [line.product.toString(), line.quantity]));
        expect(byProduct[componentA.toString()]).toBe(7); // 2×3 from bundle + 1 direct
        expect(byProduct[componentB.toString()]).toBe(3);
        expect(byProduct[bundle._id.toString()]).toBeUndefined();
    });
});

describe("fulfillOrderPaidExtras", () => {
    async function makeOrder(items: any[]) {
        return ProductOrder.create({
            orderNumber: `ORD-${new ObjectId().toString().slice(-6)}`,
            customer: customerId,
            company: companyId,
            currency: currencyId,
            shippingAddress: {firstName: "A", lastName: "B", street: "S", city: "C"},
            items,
            paymentStatus: "paid",
            status: "confirmed",
            idempotencyKey: new ObjectId().toString(),
        });
    }

    it("issues one gift card per unit of a gift_card line, idempotently", async () => {
        const giftProduct = await Product.create({title: "Gift card 50", slug: "gift-card-50", type: "gift_card", status: "active", company: companyId, price: 50});
        const order = await makeOrder([{product: giftProduct._id, quantity: 2, unitPrice: 50, totalPrice: 100}]);

        await fulfillOrderPaidExtras(order as any, {});
        await fulfillOrderPaidExtras(order as any, {}); // second call must not duplicate

        const cards = await GiftCard.find({order: order._id});
        expect(cards).toHaveLength(2);
        expect(cards.every(card => card.balance === 50 && card.status === "active")).toBe(true);
    });

    it("issues a digital delivery with quantity-scaled download limit, idempotently", async () => {
        const mediaId = new ObjectId();
        const digitalProduct = await Product.create({
            title: "E-book", slug: "e-book", type: "digital", status: "active", company: companyId,
            price: 10, documents: [mediaId], downloadLimit: 3, downloadExpiryDays: 10,
        });
        const order = await makeOrder([{product: digitalProduct._id, quantity: 2, unitPrice: 10, totalPrice: 20}]);

        await fulfillOrderPaidExtras(order as any, {});
        await fulfillOrderPaidExtras(order as any, {});

        const deliveries = await DigitalDelivery.find({order: order._id});
        expect(deliveries).toHaveLength(1);
        expect(deliveries[0].downloadLimit).toBe(6); // 3 × qty 2
        expect(deliveries[0].media.map(String)).toEqual([mediaId.toString()]);
        expect(deliveries[0].token).toHaveLength(48);
    });

    it("goes by the product type frozen on the line, even if the product changed or was deleted since", async () => {
        const formerGiftCard = await Product.create({title: "Gift card 20", slug: "gift-card-20", type: "physical", status: "active", company: companyId, price: 20});
        await Product.updateOne({_id: formerGiftCard._id}, {$set: {deletedAt: new Date()}});
        const order = await makeOrder([{
            product: formerGiftCard._id, quantity: 1, unitPrice: 20, totalPrice: 20,
            snapshot: {title: "Gift card 20", productType: "gift_card"},
        }]);

        await fulfillOrderPaidExtras(order as any, {});

        const cards = await GiftCard.find({order: order._id});
        expect(cards.map(card => card.balance)).toEqual([20]);
    });

    it("does not issue anything for a line frozen as physical, even if the product is a gift card now", async () => {
        const nowGiftCard = await Product.create({title: "Voucher", slug: "voucher", type: "gift_card", status: "active", company: companyId, price: 30});
        const order = await makeOrder([{
            product: nowGiftCard._id, quantity: 1, unitPrice: 30, totalPrice: 30,
            snapshot: {title: "Voucher", productType: "physical"},
        }]);

        await fulfillOrderPaidExtras(order as any, {});

        expect(await GiftCard.countDocuments({order: order._id})).toBe(0);
    });

    it("ignores orders without gift_card/digital lines", async () => {
        const physical = await Product.create({title: "Mug", slug: "mug", type: "physical", status: "active", company: companyId, price: 8});
        const order = await makeOrder([{product: physical._id, quantity: 1, unitPrice: 8, totalPrice: 8}]);

        await fulfillOrderPaidExtras(order as any, {});

        expect(await GiftCard.countDocuments({})).toBe(0);
        expect(await DigitalDelivery.countDocuments({})).toBe(0);
    });
});
