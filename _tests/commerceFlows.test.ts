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
import {fulfillOrderPaidExtras} from "@eCommerceModule/utilities/services/orderPaidFulfillmentService";
import {resolvePosLineUnitPrice} from "@eCommerceModule/utilities/services/posLinePrice";
import {ProductOrderActions} from "@eCommerceModule/database/schemas/productOrder/productOrder.actions";
import {assertPricedWhenActive} from "@eCommerceModule/database/schemas/product/product.actions";
import {assertPosOrderWrite} from "@eCommerceModule/database/schemas/posOrder/posOrder.actions";
import {CustomerGroupActions} from "@eCommerceModule/database/schemas/customerGroup/customerGroup.actions";
import CustomerGroup from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import CustomerGroupMember from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember";
import Fulfillment from "@eCommerceModule/database/schemas/fulfillment/fulfillment";
import {FulfillmentActions} from "@eCommerceModule/database/schemas/fulfillment/fulfillment.actions";
import {productOrderToDTO} from "@eCommerceModule/utilities/mappers/productOrder/productOrderMapper.dto";
import TaxZone from "@eCommerceModule/database/schemas/taxZone/taxZone";
import {calculateLinesTax} from "@eCommerceModule/utilities/services/taxCalculationService";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import {calculateInclusiveTax} from "@eCommerceModule/utilities/services/taxCalculationService";
import {collectionIdsByProduct} from "@eCommerceModule/utilities/services/collection/collectionMembership";
import Collection from "@eCommerceModule/database/schemas/collection/collection";
import {restoreUnlessKeyTaken} from "@eCommerceModule/utilities/services/restoreUnlessKeyTaken";
import {warehouseService} from "@eCommerceModule/database/schemas/warehouse/warehouse.service";
import {assertValidBundle} from "@eCommerceModule/database/schemas/product/product.actions";
import ReturnRequest from "@eCommerceModule/database/schemas/returnRequest/returnRequest";
import {ReturnRequestActions} from "@eCommerceModule/database/schemas/returnRequest/returnRequest.actions";
import {returnedItemsValue, returnRequestService} from "@eCommerceModule/database/schemas/returnRequest/returnRequest.service";
import PaymentTransaction from "@financeModule/database/schemas/paymentTransaction/paymentTransaction";
import {GiftCardActions} from "@financeModule/database/schemas/giftCard/giftCard.actions";

let mongod: MongoMemoryServer;
const companyId = new ObjectId();
const userId = new ObjectId();
const currencyId = new ObjectId();
const lang = "en-US";
const logger = getLogger("commerce_flows_test");

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
    // The API boot normalizes every model's permissions; this model doesn't do it on its own
    normalizeSchemaPermissions(CustomerGroupMember);
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

    it("freezes the product type and the chosen options onto the order lines", async () => {
        const product = await seedProduct({type: "variable", hasVariants: true});
        const variant = await ProductVariant.create({
            product: product._id, sku: "TEE-RED-XL", price: 50, status: "active", company: companyId,
            attributeCombination: [{attribute: new ObjectId(), value: "Red"}, {attribute: new ObjectId(), value: "XL"}],
        } as any);
        await Inventory.create({
            product: product._id, variant: variant._id, quantityOnHand: 5, quantityReserved: 0, company: companyId,
            warehouse: (await Warehouse.create({name: "Main", code: "WHV", company: companyId, isActive: true, isDefault: true} as any))._id,
        });
        const checkout = await seedCheckout(product, {
            items: [{product: product._id, variant: variant._id, quantity: 1, unitPrice: 50, totalPrice: 50, snapshot: {title: product.title}}],
        });

        const {order} = await placeOrderFromCheckout(checkout, {}, placement);

        expect(order.items[0].snapshot).toMatchObject({productType: "variable", variantLabel: "Red / XL"});
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

    it("moves the held stock onto the order; payment leaves it on the shelf", async () => {
        const product = await seedProduct();
        const inventory = await seedStock(product, 5);
        const checkout = await seedCheckout(product);
        await reserveStockForPayment(checkout, placement);
        await checkout.save();

        const {order} = await placeOrderFromCheckout(checkout, {}, placement);
        expect(order.reservations!.map(r => [r.state, r.quantity])).toEqual([["reserved", 2]]);
        expect((await Checkout.findById(checkout._id))!.reservations).toHaveLength(0);

        await new ProductOrderActions().markPaid({
            logger, languageCode: lang, company: {_id: companyId}, _id: order._id.toString(),
            actionUserCtx: {userId: userId.toString(), isAdmin: false, isSelf: true, permissions: ["productorders[write:paymentStatus]"]},
        } as any);

        const row = await Inventory.findById(inventory._id);
        expect([row!.quantityOnHand, row!.quantityReserved]).toEqual([5, 2]);
        expect(await InventoryMovement.countDocuments({})).toBe(0);
    });

    it("keeps the order as sold when the catalog and tax rates change afterwards (#1, #7)", async () => {
        const product = await seedProduct({sku: "MUG-1"});
        await seedStock(product, 5);
        const zone = await TaxZone.create({
            name: "VAT", country: new ObjectId(), isActive: true, priority: 1, company: companyId,
            rates: [{name: "Standard", rate: 20, isCompound: false, appliesTo: "all"}],
        } as any);
        const checkout = await seedCheckout(product, {
            items: [{product: product._id, quantity: 2, unitPrice: 50, totalPrice: 100, snapshot: {title: product.title, sku: "MUG-1"}}],
            taxTotal: 20, grandTotal: 125,
        });
        const {order} = await placeOrderFromCheckout(checkout, {}, placement);

        await Product.updateOne({_id: product._id}, {$set: {title: "Renamed", sku: "MUG-2", price: 999, type: "digital"}});
        await TaxZone.updateOne({_id: zone._id}, {$set: {"rates.0.rate": 5}});

        const line = productOrderToDTO((await ProductOrder.findById(order._id))!).items![0];
        expect(line.snapshot).toMatchObject({title: product.title, sku: "MUG-1", productType: "physical"});
        expect([line.unitPrice, line.totalPrice]).toEqual([50, 100]);
        const stored = await ProductOrder.findById(order._id);
        expect([stored!.taxTotal, stored!.grandTotal]).toEqual([20, 125]);
    });

    it("lets only one of two buyers hold the last units (#8)", async () => {
        const product = await seedProduct();
        const inventory = await seedStock(product, 2);
        const [first, second] = [await seedCheckout(product), await seedCheckout(product)];

        const results = await Promise.allSettled([reserveStockForPayment(first, placement), reserveStockForPayment(second, placement)]);

        expect(results.map(result => result.status).sort()).toEqual(["fulfilled", "rejected"]);
        expect((results.find(result => result.status === "rejected") as PromiseRejectedResult).reason).toMatchObject({error_code: "out_of_stock"});
        expect((await Inventory.findById(inventory._id))!.quantityReserved).toBe(2);
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
    }) as any;

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

describe("order ship action", () => {
    const shipParams = (orderId: ObjectId) => ({
        logger, languageCode: lang, company: {_id: companyId}, _id: orderId.toString(),
        actionUserCtx: {
            userId: userId.toString(), isAdmin: false, isSelf: true,
            permissions: ["productorders[write:status]", "fulfillments[create:fulfillments]"],
        },
    });

    it("ships only what earlier fulfillments haven't covered, then refuses a second full ship", async () => {
        const order = await ProductOrder.create({
            company: companyId, orderNumber: "ORD-S-1", customer: userId, currency: currencyId,
            idempotencyKey: `k-${new ObjectId().toString()}`, status: "confirmed", paymentStatus: "paid",
            items: [
                {product: (await seedProduct({trackInventory: false}))._id, quantity: 2, unitPrice: 10, totalPrice: 20, snapshot: {title: "a"}},
                {product: (await seedProduct({trackInventory: false}))._id, quantity: 1, unitPrice: 10, totalPrice: 10, snapshot: {title: "b"}},
            ],
            subtotal: 30, discountTotal: 0, shippingTotal: 0, taxTotal: 0, grandTotal: 30,
            shippingAddress: address,
        } as any);
        await Fulfillment.create({
            order: order._id, company: companyId, status: "shipped",
            items: [{orderItemId: order.items[0]._id, quantity: 2}],
        } as any);

        await new ProductOrderActions().ship(shipParams(order._id as ObjectId) as any);

        const shipped = await Fulfillment.find({order: order._id}).sort({createdAt: 1});
        expect(shipped).toHaveLength(2);
        expect(shipped[1].items.map(item => [item.orderItemId.toString(), item.quantity]))
            .toEqual([[order.items[1]._id.toString(), 1]]);

        await ProductOrder.updateOne({_id: order._id}, {$set: {status: "processing"}});
        await expect(new ProductOrderActions().ship(shipParams(order._id as ObjectId) as any))
            .rejects.toMatchObject({error_code: "order_already_fulfilled"});
    });
});

describe("stock leaves at shipment", () => {
    const staff = (permissions: string[]) => ({
        logger, languageCode: lang, company: {_id: companyId},
        actionUserCtx: {userId: userId.toString(), isAdmin: false, isSelf: true, permissions},
    });
    const shipper = staff(["productorders[write:status]", "fulfillments[create:fulfillments]", "fulfillments[write:status]"]);

    /** One line of `quantity` units with `held` of them reserved in one warehouse holding `onHand`. */
    async function seedOrder(quantity: number, held: number, onHand: number, extra: Record<string, unknown> = {}) {
        const product = await seedProduct();
        const warehouse = await Warehouse.create({name: "Main", code: `F${new ObjectId().toString().slice(-5)}`, company: companyId, isActive: true, isDefault: true} as any);
        const inventory = await Inventory.create({product: product._id, warehouse: warehouse._id, quantityOnHand: onHand, quantityReserved: held, company: companyId});
        const order = await ProductOrder.create({
            company: companyId, orderNumber: `ORD-F-${new ObjectId().toString().slice(-6)}`, customer: userId, currency: currencyId,
            idempotencyKey: `k-${new ObjectId().toString()}`, status: "confirmed", paymentStatus: "paid",
            items: [{product: product._id, quantity, unitPrice: 10, totalPrice: 10 * quantity, snapshot: {title: "Mug"}}],
            reservations: held ? [{product: product._id, warehouse: warehouse._id, quantity: held, state: "reserved"}] : [],
            subtotal: 10 * quantity, discountTotal: 0, shippingTotal: 0, taxTotal: 0, grandTotal: 10 * quantity, shippingAddress: address,
            ...extra,
        } as any);
        return {order, inventory};
    }

    async function pendingShipment(order: any, quantity: number) {
        return Fulfillment.create({order: order._id, company: companyId, status: "pending", items: [{orderItemId: order.items[0]._id, quantity}]} as any);
    }

    const stockOf = async (inventory: any) => {
        const row = await Inventory.findById(inventory._id);
        return [row!.quantityOnHand, row!.quantityReserved];
    };

    it("consumes held units per shipment, splitting a hold when part of it ships", async () => {
        const {order, inventory} = await seedOrder(3, 3, 10);

        const first = await pendingShipment(order, 1);
        await new FulfillmentActions().ship({...shipper, _id: first._id.toString()} as any);

        expect(await stockOf(inventory)).toEqual([9, 2]);
        let reloaded = await ProductOrder.findById(order._id);
        expect(reloaded!.reservations!.map(r => [r.state, r.quantity, r.fulfillment?.toString()]))
            .toEqual([["reserved", 2, undefined], ["consumed", 1, first._id.toString()]]);
        expect([reloaded!.status, reloaded!.fulfillmentStatus]).toEqual(["confirmed", "partially_fulfilled"]);

        await new ProductOrderActions().ship({...shipper, _id: order._id.toString()} as any);

        expect(await stockOf(inventory)).toEqual([7, 0]);
        reloaded = await ProductOrder.findById(order._id);
        expect([reloaded!.status, reloaded!.fulfillmentStatus]).toEqual(["shipped", "fulfilled"]);
        expect(reloaded!.timeline.map(entry => entry.event)).toEqual(["order_partially_shipped", "order_shipped"]);
        const sales = await InventoryMovement.find({reason: "sale", referenceType: "Fulfillment"});
        expect(sales.map(sale => sale.quantity).sort()).toEqual([-1, -2]);
    });

    it("takes units nobody held from free stock at shipment, or refuses when there are none", async () => {
        const {order, inventory} = await seedOrder(2, 0, 5);
        await new ProductOrderActions().ship({...shipper, _id: order._id.toString()} as any);
        expect(await stockOf(inventory)).toEqual([3, 0]);
        expect((await ProductOrder.findById(order._id))!.reservations!.map(r => [r.state, r.quantity])).toEqual([["consumed", 2]]);

        const short = await seedOrder(4, 0, 1);
        await expect(new ProductOrderActions().ship({...shipper, _id: short.order._id.toString()} as any))
            .rejects.toMatchObject({error_code: "out_of_stock"});
        expect(await stockOf(short.inventory)).toEqual([1, 0]);
    });

    it("is delivered once every shipment arrived; a failed one comes back to stock, held again", async () => {
        const {order, inventory} = await seedOrder(2, 2, 10);
        const first = await pendingShipment(order, 1);
        const second = await pendingShipment(order, 1);
        await new FulfillmentActions().ship({...shipper, _id: first._id.toString()} as any);
        await new FulfillmentActions().ship({...shipper, _id: second._id.toString()} as any);

        await new FulfillmentActions().markDelivered({...shipper, _id: first._id.toString()} as any);
        expect((await ProductOrder.findById(order._id))!.status).toBe("shipped");

        await new FulfillmentActions().markFailed({...shipper, _id: second._id.toString()} as any);
        expect(await stockOf(inventory)).toEqual([9, 1]);
        const reloaded = await ProductOrder.findById(order._id);
        expect([reloaded!.status, reloaded!.fulfillmentStatus]).toEqual(["processing", "partially_fulfilled"]);
        expect(reloaded!.reservations!.filter(r => r.state === "reserved").map(r => r.quantity)).toEqual([1]);

        await new ProductOrderActions().ship({...shipper, _id: order._id.toString()} as any);
        const shipments = await Fulfillment.find({order: order._id, status: "shipped"});
        await new FulfillmentActions().markDelivered({...shipper, _id: shipments[0]._id.toString()} as any);
        expect(await stockOf(inventory)).toEqual([8, 0]);
        expect((await ProductOrder.findById(order._id))!.status).toBe("delivered");
    });

    it("refuses to ship from a stock row that is gone (#4)", async () => {
        const {order, inventory} = await seedOrder(1, 1, 5);
        await Inventory.updateOne({_id: inventory._id}, {$set: {deletedAt: new Date()}});

        await expect(new ProductOrderActions().ship({...shipper, _id: order._id.toString()} as any))
            .rejects.toMatchObject({error_code: "inventory_not_found"});
    });

    it("gives back what is still held when the order is cancelled or fully refunded", async () => {
        const cod = await seedOrder(2, 2, 10, {status: "pending", paymentStatus: "unpaid"});
        await new ProductOrderActions().cancel({...staff(["productorders[write:status]"]), _id: cod.order._id.toString()} as any);
        expect(await stockOf(cod.inventory)).toEqual([10, 0]);

        const paid = await seedOrder(2, 2, 10);
        await PaymentTransaction.create({
            sourceType: "productOrder", sourceId: paid.order._id, gateway: "manual", type: "charge", status: "succeeded",
            amount: 20, refundedAmount: 0, currency: currencyId, company: companyId,
        } as any);
        await new ProductOrderActions().refund({...staff(["productorders[write:paymentStatus]"]), _id: paid.order._id.toString()} as any);
        expect(await stockOf(paid.inventory)).toEqual([10, 0]);
        expect((await ProductOrder.findById(paid.order._id))!.reservations!.map(r => r.state)).toEqual(["released"]);
    });
});

describe("refund guard for till sales", () => {
    it("sends POS-originated orders to the till refund", async () => {
        const order = await ProductOrder.create({
            company: companyId, orderNumber: "ORD-POS-1", customer: userId, currency: currencyId,
            idempotencyKey: `pos:${new ObjectId().toString()}`, status: "delivered", paymentStatus: "paid",
            items: [], subtotal: 0, discountTotal: 0, shippingTotal: 0, taxTotal: 0, grandTotal: 10,
            shippingAddress: address,
        } as any);

        await expect(new ProductOrderActions().refund({
            logger, languageCode: lang, company: {_id: companyId}, _id: order._id.toString(),
            actionUserCtx: {userId: userId.toString(), isAdmin: false, isSelf: true, permissions: ["productorders[write:paymentStatus]"]},
        } as any)).rejects.toMatchObject({error_code: "refund_via_pos"});
    });
});

describe("calculateLinesTax", () => {
    it("applies type-scoped rates per line group and keeps the per-rate breakdown", async () => {
        const country = new ObjectId();
        await TaxZone.create({
            name: "Home", country, isActive: true, priority: 1, company: companyId,
            rates: [
                {name: "VAT", rate: 10, isCompound: false, appliesTo: "all"},
                {name: "Goods levy", rate: 5, isCompound: false, appliesTo: "physical"},
            ],
        } as any);
        const physical = await seedProduct({type: "physical"});
        const digital = await seedProduct({type: "digital"});

        const tax = await calculateLinesTax(
            [{product: physical._id, totalPrice: 100}, {product: digital._id, totalPrice: 100}],
            0,
            {country: country.toString()},
            companyId,
        );

        expect(tax.amount).toBe(25); // 15% on goods, 10% on the download
        expect(tax.breakdown).toEqual(expect.arrayContaining([
            {name: "VAT", rate: 10, amount: 20},
            {name: "Goods levy", rate: 5, amount: 5},
        ]));
    });
});

describe("assertPricedWhenActive", () => {
    it("blocks an active product without a price unless its variants carry prices", () => {
        expect(() => assertPricedWhenActive({status: "active", price: null}, lang)).toThrow();
        expect(() => assertPricedWhenActive({status: "active", price: ""}, lang)).toThrow();
        expect(() => assertPricedWhenActive({status: "active", price: null, hasVariants: true}, lang)).not.toThrow();
        expect(() => assertPricedWhenActive({status: "draft", price: null}, lang)).not.toThrow();
        expect(() => assertPricedWhenActive({status: "active", price: 0}, lang)).not.toThrow();
    });
});

describe("POS and customer-group gates", () => {
    const ctxWith = (permissions: string[]) => ({
        languageCode: lang,
        actionUserCtx: {userId: userId.toString(), orgId: companyId.toString(), isAdmin: false, isSelf: true, permissions},
    });

    it("lets only users with posorders[write:state] use the till", () => {
        expect(() => assertPosOrderWrite(ctxWith([]) as any, "state")).toThrow();
        expect(() => assertPosOrderWrite(ctxWith(["posorders[write:state]"]) as any, "amountRefunded")).toThrow();
        expect(() => assertPosOrderWrite(ctxWith(["posorders[write:state]"]) as any, "state")).not.toThrow();
    });

    it("refuses customer-group self-enrolment without the member create permission", async () => {
        const group = await CustomerGroup.create({name: "Wholesale", company: companyId} as any);
        const params = (permissions: string[]) => ({
            ...ctxWith(permissions), logger, company: {_id: companyId},
            userId: userId.toString(), customerGroup: group._id.toString(),
        });

        await expect(new CustomerGroupActions().addMember(params([]))).rejects.toThrow();
        expect(await CustomerGroupMember.countDocuments({customerGroup: group._id})).toBe(0);

        await new CustomerGroupActions().addMember(params(["customergroupmembers[create:customergroupmembers]"]));
        expect(await CustomerGroupMember.countDocuments({customerGroup: group._id})).toBe(1);
    });
});

describe("POS VAT (tax-inclusive till prices)", () => {
    it("extracts the VAT contained in a gross amount at the warehouse's rates", async () => {
        const country = new ObjectId();
        await TaxZone.create({
            name: "Home", country, isActive: true, priority: 1, company: companyId,
            rates: [{name: "VAT", rate: 20, isCompound: false, appliesTo: "all"}],
        } as any);

        expect(await calculateInclusiveTax(120, "physical", {country: country.toString()}, companyId)).toBe(20);
        expect(await calculateInclusiveTax(120, "physical", {country: new ObjectId().toString()}, companyId)).toBe(0);
    });
});

describe("collection membership for pricing", () => {
    it("resolves manual and rule-based collections from the collections themselves", async () => {
        const listed = await seedProduct({brand: "Other"});
        const branded = await seedProduct({brand: "Acme"});
        const manual = await Collection.create({name: "Picks", type: "manual", products: [listed._id], company: companyId} as any);
        const dynamic = await Collection.create({
            name: "Acme", type: "dynamic", ruleCondition: "all",
            rules: [{field: "brand", operator: "equals", value: "Acme"}], company: companyId,
        } as any);

        const byProduct = await collectionIdsByProduct([listed._id as ObjectId, branded._id as ObjectId], companyId);

        expect(byProduct.get(listed._id.toString())).toEqual([manual._id.toString()]);
        expect(byProduct.get(branded._id.toString())).toEqual([dynamic._id.toString()]);
    });
});

describe("restore of live-unique keys", () => {
    it("refuses to restore a warehouse whose code a live warehouse took meanwhile", async () => {
        await Warehouse.init();
        const original = await Warehouse.create({name: "Main", code: "MAIN", company: companyId, isActive: true} as any);
        await Warehouse.updateOne({_id: original._id}, {$set: {deletedAt: new Date()}});
        await Warehouse.create({name: "New main", code: "MAIN", company: companyId, isActive: true} as any);

        const restore = restoreUnlessKeyTaken({
            model: Warehouse, service: warehouseService, entityName: "Warehouse", keys: ["code"], errorCode: "warehouse_already_exists",
        });
        await expect(restore({
            logger, languageCode: lang, company: {_id: companyId}, _id: original._id.toString(),
            actionUserCtx: {userId: userId.toString(), isAdmin: true, isSelf: true, permissions: ["warehouses[restore:warehouses]"]},
        } as any)).rejects.toMatchObject({error_code: "warehouse_already_exists"});
    });
});

describe("assertValidBundle", () => {
    const params = {company: {_id: companyId}, logger, languageCode: lang} as any;

    it("accepts live non-bundle components and rejects bundles, itself or foreign products", async () => {
        const component = await seedProduct();
        const otherBundle = await seedProduct({type: "bundle"});
        const self = new ObjectId();

        await expect(assertValidBundle({type: "bundle", bundleComponents: [{product: component._id}]}, params)).resolves.toBeUndefined();
        await expect(assertValidBundle({type: "bundle", bundleComponents: [{product: otherBundle._id}]}, params)).rejects.toThrow();
        await expect(assertValidBundle({_id: self, type: "bundle", bundleComponents: [{product: self}]}, params)).rejects.toThrow();
        await expect(assertValidBundle({type: "bundle", bundleComponents: [{product: new ObjectId()}]}, params)).rejects.toThrow();
    });
});

describe("returns", () => {
    const staff = (permissions: string[]) => ({
        logger, languageCode: lang, company: {_id: companyId},
        actionUserCtx: {userId: userId.toString(), isAdmin: false, isSelf: true, permissions},
    });

    /** A paid, shipped order of 3 units sold from one warehouse, with a manual charge of 150. */
    async function seedShippedOrder() {
        const product = await seedProduct();
        const warehouse = await Warehouse.create({name: "Main", code: `R${new ObjectId().toString().slice(-5)}`, company: companyId, isActive: true} as any);
        const inventory = await Inventory.create({product: product._id, warehouse: warehouse._id, quantityOnHand: 7, quantityReserved: 0, company: companyId});
        const order = await ProductOrder.create({
            company: companyId, orderNumber: `ORD-R-${new ObjectId().toString().slice(-6)}`, customer: userId, currency: currencyId,
            idempotencyKey: `k-${new ObjectId().toString()}`, status: "shipped", paymentStatus: "paid", fulfillmentStatus: "fulfilled",
            reservations: [{product: product._id, warehouse: warehouse._id, quantity: 3, state: "consumed"}],
            items: [{product: product._id, quantity: 3, unitPrice: 50, totalPrice: 150, snapshot: {title: "Mug"}}],
            subtotal: 150, discountTotal: 0, shippingTotal: 0, taxTotal: 0, grandTotal: 150, shippingAddress: address,
        } as any);
        await Fulfillment.create({order: order._id, company: companyId, status: "shipped", items: [{orderItemId: order.items[0]._id, quantity: 3}]} as any);
        await PaymentTransaction.create({
            sourceType: "productOrder", sourceId: order._id, gateway: "manual", type: "charge", status: "succeeded",
            amount: 150, refundedAmount: 0, currency: currencyId, company: companyId,
        } as any);
        return {order, inventory};
    }

    it("limits returns to shipped quantities and refunds to what the items cost", async () => {
        const {order} = await seedShippedOrder();
        await ReturnRequest.create({order: order._id, type: "return", status: "pending", company: companyId,
            items: [{orderItemId: order.items[0]._id, quantity: 2, reason: "broken"}]} as any);

        const returnable = await returnRequestService.returnableQuantities(order, {});
        expect(returnable.get(order.items[0]._id.toString())).toBe(1);
        expect(returnedItemsValue(order, [{orderItemId: order.items[0]._id, quantity: 2}])).toBe(100);
    });

    it("restocks into the selling warehouse on receive and refunds through the order on complete", async () => {
        const {order, inventory} = await seedShippedOrder();
        const request = await ReturnRequest.create({order: order._id, type: "return", status: "approved", refundAmount: 50, company: companyId,
            items: [{orderItemId: order.items[0]._id, quantity: 1, reason: "broken"}]} as any);

        await new ReturnRequestActions().receive({...staff(["returnrequests[write:status]"]), _id: request._id.toString()} as any);
        expect((await Inventory.findById(inventory._id))!.quantityOnHand).toBe(8);
        expect(await InventoryMovement.countDocuments({reason: "return", referenceId: request._id})).toBe(1);

        await expect(new ReturnRequestActions().complete({...staff(["returnrequests[write:status]"]), _id: request._id.toString()} as any))
            .rejects.toThrow();
        await new ReturnRequestActions().complete({
            ...staff(["returnrequests[write:status]", "productorders[write:paymentStatus]"]), _id: request._id.toString(),
        } as any);

        expect((await ProductOrder.findById(order._id))!.paymentStatus).toBe("partially_refunded");
        expect((await PaymentTransaction.findOne({sourceId: order._id, type: "charge"}))!.refundedAmount).toBe(50);
        expect((await ReturnRequest.findById(request._id))!.status).toBe("completed");
    });
});

describe("gift cards revoked by a refund", () => {
    it("can't be re-enabled", async () => {
        const card = await GiftCard.create({code: "GC-REVO-KEDX-CARD", initialBalance: 50, balance: 50, status: "disabled", revokedByRefund: true, company: companyId} as any);

        await expect(new GiftCardActions().enable({
            logger, languageCode: lang, company: {_id: companyId}, _id: card._id.toString(),
            actionUserCtx: {userId: userId.toString(), isAdmin: false, isSelf: true, permissions: ["giftcards[write:status]"]},
        })).rejects.toMatchObject({error_code: "gift_card_revoked_by_refund"});
    });
});
