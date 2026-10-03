import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {MongoMemoryServer} from "mongodb-memory-server";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import {getLogger} from "@coreModule/loggers/serverLog";

vi.mock("@eCommerceModule/utilities/services/productOrderNotify", () => ({
    notifyProductOrderCustomer: vi.fn(async () => undefined),
    notifyMerchantsNewOrder: vi.fn(async () => undefined),
    notifyMerchantsLowStock: vi.fn(async () => undefined),
    notifyAbandonedCartEmail: vi.fn(async () => undefined),
}));

import Product from "@eCommerceModule/database/schemas/product/product";
import ProductVariant from "@eCommerceModule/database/schemas/productVariant/productVariant";
import PricingRule from "@eCommerceModule/database/schemas/pricingRule/pricingRule";
import Discount from "@eCommerceModule/database/schemas/discount/discount";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import InventoryMovement from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import Checkout from "@eCommerceModule/database/schemas/checkout/checkout";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import GiftCard from "@financeModule/database/schemas/giftCard/giftCard";
import {repriceCart} from "@eCommerceModule/utilities/services/cartPricingService";
import {validateDiscount, validateDiscountForCustomer} from "@eCommerceModule/utilities/services/discountValidationService";
import {generateOrderNumber} from "@eCommerceModule/utilities/services/orderNumberService";
import {
    placeOrderFromCheckout,
    reserveStockForPayment,
    resetCheckoutPayment,
} from "@eCommerceModule/utilities/services/checkoutPlacementService";
import {
    consumeCheckoutReservations,
    restockConsumedReservations,
} from "@eCommerceModule/utilities/services/inventoryReservationService";
import {fulfillOrderPaidExtras} from "@eCommerceModule/utilities/services/orderPaidFulfillmentService";
import {resolvePosLineUnitPrice} from "@eCommerceModule/utilities/services/posLinePrice";
import {ProductOrderActions} from "@eCommerceModule/database/schemas/productOrder/productOrder.actions";

let mongod: MongoMemoryServer;
const companyId = new ObjectId();
const userId = new ObjectId();
const currencyId = new ObjectId();
const lang = "en-US";
const logger = getLogger("commerce_flows_test");

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
}, 120000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

beforeEach(async () => {
    const db = mongoose.connection.db!;
    for (const collection of await db.collections()) {
        await collection.deleteMany({});
    }
});

let slugSeq = 0;
async function seedProduct(overrides: Record<string, unknown> = {}) {
    slugSeq += 1;
    return Product.create({
        title: `Product ${slugSeq}`,
        slug: `product-${slugSeq}-${new ObjectId().toString().slice(-6)}`,
        type: "physical",
        status: "active",
        price: 100,
        currency: currencyId,
        company: companyId,
        ...overrides,
    } as any);
}

function cartOf(lines: {product: any; variant?: any; quantity: number}[], extra: Record<string, unknown> = {}) {
    return {
        items: lines.map(line => ({
            product: line.product._id ?? line.product,
            variant: line.variant,
            quantity: line.quantity,
            unitPrice: 0,
            totalPrice: 0,
            snapshot: {title: ""},
        })),
        subtotal: 0,
        discountTotal: 0,
        appliedDiscounts: [] as any[],
        ...extra,
    } as any;
}

async function seedDiscount(overrides: Record<string, unknown> = {}) {
    return Discount.create({
        title: "Test discount",
        code: `CODE${new ObjectId().toString().slice(-6).toUpperCase()}`,
        type: "percentage",
        value: 10,
        appliesTo: "order",
        isActive: true,
        startsAt: new Date(Date.now() - 86400000),
        usageCount: 0,
        company: companyId,
        ...overrides,
    } as any);
}

const ctx = {companyId, userId, languageCode: lang};
const address = {firstName: "A", lastName: "B", street: "S", city: "C"};

describe("repriceCart", () => {
    it("applies pricing rules once to the base price, however often the cart is re-priced", async () => {
        const product = await seedProduct({price: 100});
        await PricingRule.create({
            name: "10% off", type: "percentage_discount", value: 10, appliesTo: "all",
            isActive: true, priority: 1, company: companyId,
        } as any);

        const cart = cartOf([{product, quantity: 1}]);
        for (let i = 0; i < 4; i++) {
            await repriceCart(cart, ctx);
        }
        expect(cart.items[0].unitPrice).toBe(90);
        expect(cart.subtotal).toBe(90);
    });

    it("picks up catalog price changes and drops products that are no longer sold", async () => {
        const kept = await seedProduct({price: 40});
        const retired = await seedProduct({price: 25, title: "Retired"});
        const cart = cartOf([{product: kept, quantity: 2}, {product: retired, quantity: 1}]);
        await repriceCart(cart, ctx);
        expect(cart.subtotal).toBe(105);

        await Product.updateOne({_id: kept._id}, {$set: {price: 45}});
        await Product.updateOne({_id: retired._id}, {$set: {status: "inactive"}});
        const {notices} = await repriceCart(cart, ctx);

        expect(cart.items).toHaveLength(1);
        expect(cart.subtotal).toBe(90);
        expect(notices.removedItems).toEqual(["Retired"]);
    });

    it("drops a variant product line that has no variant chosen", async () => {
        const product = await seedProduct({hasVariants: true});
        const cart = cartOf([{product, quantity: 1}]);
        await repriceCart(cart, ctx);
        expect(cart.items).toHaveLength(0);
    });

    it("re-validates the applied discount and removes it when the cart no longer qualifies", async () => {
        const product = await seedProduct({price: 100});
        const discount = await seedDiscount({value: 10, minimumOrderAmount: 150});
        const cart = cartOf([{product, quantity: 2}], {
            appliedDiscounts: [{discount: discount._id, code: discount.code, amount: 0}],
        });

        await repriceCart(cart, ctx);
        expect(cart.discountTotal).toBe(20);

        cart.items[0].quantity = 1;
        const {notices} = await repriceCart(cart, ctx);
        expect(cart.discountTotal).toBe(0);
        expect(cart.appliedDiscounts).toEqual([]);
        expect(notices.discountRemoved).toBe("minimum_order_amount_not_met");
    });
});

describe("validateDiscount", () => {
    const line = (productId: ObjectId, unitPrice: number, extra: Record<string, unknown> = {}) =>
        ({productId, quantity: 1, unitPrice, ...extra});

    it("limits a product-targeted discount to the targeted lines", async () => {
        const a = new ObjectId();
        const b = new ObjectId();
        const discount = await seedDiscount({value: 10, appliesTo: "product", targetIds: [a]});
        const result = validateDiscount({subtotal: 150, items: [line(a, 100), line(b, 50)]}, discount);
        expect(result).toMatchObject({valid: true, discountAmount: 10});
    });

    it("never discounts gift-card lines", async () => {
        const discount = await seedDiscount({value: 20});
        const result = validateDiscount({subtotal: 100, items: [line(new ObjectId(), 100, {isGiftCard: true})]}, discount);
        expect(result.valid).toBe(false);
    });

    it("caps percentages at 100", async () => {
        const discount = await seedDiscount({value: 150});
        const result = validateDiscount({subtotal: 80, items: [line(new ObjectId(), 80)]}, discount);
        expect(result).toMatchObject({valid: true, discountAmount: 80});
    });

    it("enforces the per-customer usage limit", async () => {
        const discount = await seedDiscount({usageLimitPerCustomer: 1});
        await ProductOrder.collection.insertOne({
            company: companyId, customer: userId, status: "confirmed", deletedAt: null,
            appliedDiscounts: [{discount: discount._id, code: discount.code, amount: 5}],
        });
        const result = await validateDiscountForCustomer(
            {subtotal: 100, customerId: userId, items: [line(new ObjectId(), 100)]},
            discount,
            companyId,
        );
        expect(result).toEqual({valid: false, reason: "discount_customer_limit_reached"});
    });
});

describe("generateOrderNumber", () => {
    it("hands out unique numbers under concurrency and continues after existing orders", async () => {
        const year = new Date().getFullYear();
        await ProductOrder.collection.insertOne({company: companyId, orderNumber: `ORD-${year}-000041`});

        const numbers = await Promise.all(Array.from({length: 25}, () => generateOrderNumber(companyId)));

        expect(new Set(numbers).size).toBe(25);
        expect(numbers.sort()[0]).toBe(`ORD-${year}-000042`);
    });
});

describe("checkout placement", () => {
    async function seedStock(product: any, onHand: number) {
        const warehouse = await Warehouse.create({
            name: "Main", code: `WH${new ObjectId().toString().slice(-5)}`, company: companyId, isActive: true, isDefault: true,
        } as any);
        return Inventory.create({product: product._id, warehouse: warehouse._id, quantityOnHand: onHand, quantityReserved: 0, company: companyId});
    }

    async function seedCheckout(product: any, extra: Record<string, unknown> = {}) {
        return Checkout.create({
            cart: new ObjectId(),
            company: companyId,
            user: userId,
            idempotencyKey: `test-${new ObjectId().toString()}`,
            status: "pending",
            currency: currencyId,
            items: [{product: product._id, quantity: 2, unitPrice: 50, totalPrice: 100, snapshot: {title: product.title}}],
            subtotal: 100,
            discountTotal: 0,
            shippingTotal: 5,
            taxTotal: 0,
            grandTotal: 105,
            shippingAddress: {firstName: "A", lastName: "B", street: "S", city: "C"},
            selectedShippingRate: {name: "Std", price: 5},
            paymentMethod: "cod",
            expiresAt: new Date(Date.now() + 60000),
            ...extra,
        } as any);
    }

    const placement = {logger, languageCode: lang};

    it("holds stock at the payment step and keeps it held on an unpaid (COD) order", async () => {
        const product = await seedProduct();
        const inventory = await seedStock(product, 5);
        const checkout = await seedCheckout(product);

        await reserveStockForPayment(checkout, placement);
        await checkout.save();
        expect((await Inventory.findById(inventory._id))!.quantityReserved).toBe(2);

        const {order, created} = await placeOrderFromCheckout(checkout, {email: "buyer@example.com"}, placement);
        expect(created).toBe(true);
        expect(order.paymentStatus).toBe("unpaid");
        expect(order.status).toBe("pending");
        expect((await Inventory.findById(inventory._id))!.quantityReserved).toBe(2);
        expect((await Checkout.findById(checkout._id))!.status).toBe("confirmed");
    });

    it("is idempotent — a second caller gets the existing order back", async () => {
        const product = await seedProduct();
        await seedStock(product, 5);
        const checkout = await seedCheckout(product);

        const first = await placeOrderFromCheckout(checkout, {}, placement);
        const again = await placeOrderFromCheckout(checkout, {}, placement);

        expect(again.created).toBe(false);
        expect(again.order._id.toString()).toBe(first.order._id.toString());
        expect(await ProductOrder.countDocuments({})).toBe(1);
    });

    it("refuses an out-of-stock unpaid order without leaving partial holds", async () => {
        const inStock = await seedProduct();
        const soldOut = await seedProduct();
        const inStockInventory = await seedStock(inStock, 5);
        await seedStock(soldOut, 0);
        const checkout = await seedCheckout(inStock, {
            items: [
                {product: inStock._id, quantity: 1, unitPrice: 50, totalPrice: 50, snapshot: {title: "a"}},
                {product: soldOut._id, quantity: 1, unitPrice: 50, totalPrice: 50, snapshot: {title: "b"}},
            ],
        });

        await expect(reserveStockForPayment(checkout, placement)).rejects.toThrow();
        expect((await Inventory.findById(inStockInventory._id))!.quantityReserved).toBe(0);
    });

    it("counts the discount use and refuses it once the limit is reached", async () => {
        const product = await seedProduct();
        await seedStock(product, 10);
        const discount = await seedDiscount({usageLimit: 1});
        const applied = {appliedDiscounts: [{discount: discount._id, code: discount.code, amount: 10}]};

        await placeOrderFromCheckout(await seedCheckout(product, applied), {}, placement);
        expect((await Discount.findById(discount._id))!.usageCount).toBe(1);

        await expect(placeOrderFromCheckout(await seedCheckout(product, applied), {}, placement)).rejects.toThrow();
    });

    it("resetCheckoutPayment releases held stock and clears the payment choice", async () => {
        const product = await seedProduct();
        const inventory = await seedStock(product, 5);
        const checkout = await seedCheckout(product);
        await reserveStockForPayment(checkout, placement);
        await checkout.save();

        await resetCheckoutPayment(checkout, placement);

        expect((await Inventory.findById(inventory._id))!.quantityReserved).toBe(0);
        expect(checkout.paymentMethod).toBeUndefined();
        expect(checkout.reservations).toHaveLength(0);
    });

    it("restocks consumed units exactly once", async () => {
        const product = await seedProduct();
        const inventory = await seedStock(product, 5);
        const checkout = await seedCheckout(product);
        await reserveStockForPayment(checkout, placement);
        await consumeCheckoutReservations(checkout, placement);
        expect((await Inventory.findById(inventory._id))!.quantityOnHand).toBe(3);

        expect(await restockConsumedReservations(checkout, placement)).toBe(1);
        expect(await restockConsumedReservations(checkout, placement)).toBe(0);

        const after = await Inventory.findById(inventory._id);
        expect(after!.quantityOnHand).toBe(5);
        expect(await InventoryMovement.countDocuments({reason: "return"})).toBe(1);
    });
});

describe("fulfillOrderPaidExtras", () => {
    it("issues cards for every gift-card line, idempotently", async () => {
        const card25 = await seedProduct({type: "gift_card", price: 25});
        const card50 = await seedProduct({type: "gift_card", price: 50});
        const order = await ProductOrder.create({
            company: companyId,
            orderNumber: "ORD-T-1",
            customer: userId,
            currency: currencyId,
            idempotencyKey: `k-${new ObjectId().toString()}`,
            items: [
                {product: card25._id, quantity: 1, unitPrice: 25, totalPrice: 25, snapshot: {title: "25"}},
                {product: card50._id, quantity: 2, unitPrice: 50, totalPrice: 100, snapshot: {title: "50"}},
            ],
            subtotal: 125, discountTotal: 0, shippingTotal: 0, taxTotal: 0, grandTotal: 125,
            shippingAddress: address,
        } as any);

        await fulfillOrderPaidExtras(order, {logger, languageCode: lang});
        await fulfillOrderPaidExtras(order, {logger, languageCode: lang});

        const balances = (await GiftCard.find({order: order._id})).map(card => card.balance).sort();
        expect(balances).toEqual([25, 50, 50]);
    });
});

describe("resolvePosLineUnitPrice", () => {
    const posCtx = {company: {_id: companyId}, languageCode: lang};

    it("uses the variant price, ignoring anything the client sent", async () => {
        const product = await seedProduct({price: 30, hasVariants: true});
        const variant = await ProductVariant.create({product: product._id, sku: "V1", price: 35, status: "active", company: companyId} as any);
        expect(await resolvePosLineUnitPrice(product as any, variant._id.toString(), posCtx)).toBe(35);
        expect(await resolvePosLineUnitPrice(product as any, undefined, posCtx)).toBe(30);
    });

    it("rejects a variant that belongs to another product", async () => {
        const product = await seedProduct();
        const other = await seedProduct();
        const variant = await ProductVariant.create({product: other._id, sku: "V2", price: 1, status: "active", company: companyId} as any);
        await expect(resolvePosLineUnitPrice(product as any, variant._id.toString(), posCtx)).rejects.toThrow();
    });
});

describe("order action permissions", () => {
    async function seedOrder(status: string) {
        return ProductOrder.create({
            company: companyId, orderNumber: `ORD-P-${new ObjectId().toString().slice(-6)}`, customer: userId, currency: currencyId,
            idempotencyKey: `k-${new ObjectId().toString()}`, status, paymentStatus: "paid",
            items: [], subtotal: 0, discountTotal: 0, shippingTotal: 0, taxTotal: 0, grandTotal: 0,
            shippingAddress: address,
        } as any);
    }

    const params = (orderId: ObjectId, permissions: string[]) => ({
        logger, languageCode: lang, company: {_id: companyId}, _id: orderId.toString(),
        actionUserCtx: {userId: userId.toString(), isAdmin: false, permissions, isSelf: true},
    });

    it("rejects a user without the status write permission", async () => {
        const order = await seedOrder("confirmed");
        await expect(new ProductOrderActions().markProcessing(params(order._id, []))).rejects.toThrow();
        expect((await ProductOrder.findById(order._id))!.status).toBe("confirmed");
    });

    it("allows a user holding productorders[write:status]", async () => {
        const order = await seedOrder("confirmed");
        await new ProductOrderActions().markProcessing(params(order._id, ["productorders[write:status]"]));
        expect((await ProductOrder.findById(order._id))!.status).toBe("processing");
    });

    it("requires the paymentStatus permission for refunds even with status rights", async () => {
        const order = await seedOrder("confirmed");
        await expect(
            new ProductOrderActions().refund(params(order._id, ["productorders[write:status]"])),
        ).rejects.toThrow();
    });
});

describe("calculateShipping", () => {
    it("only offers a free rate inside its order-amount window", async () => {
        const {calculateShipping} = await import("@eCommerceModule/utilities/services/shippingCalculationService");
        const ShippingZone = (await import("@eCommerceModule/database/schemas/shippingZone/shippingZone")).default;
        const country = new ObjectId();
        await ShippingZone.create({
            name: "Domestic", countries: [country], isActive: true, company: companyId,
            rates: [
                {name: "Standard", type: "flat", price: 4.5},
                {name: "Free over 60", type: "free", price: 0, conditions: {minOrderAmount: 60}},
            ],
        } as any);

        const small = await calculateShipping({subtotal: 20, itemCount: 1, destinationCountry: country.toString()}, companyId);
        const large = await calculateShipping({subtotal: 80, itemCount: 1, destinationCountry: country.toString()}, companyId);

        expect(small.map(rate => rate.rateName)).toEqual(["Standard"]);
        expect(large.map(rate => rate.rateName)).toEqual(["Standard", "Free over 60"]);
    });
});
