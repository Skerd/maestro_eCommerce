import {afterAll, beforeAll, beforeEach, describe, expect, it} from "vitest";
import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import {getLogger} from "@coreModule/loggers/serverLog";
import Currency from "@coreModule/database/schemas/currency/currency";
import Product from "@eCommerceModule/database/schemas/product/product";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import TaxZone from "@eCommerceModule/database/schemas/taxZone/taxZone";
import PosConfig from "@eCommerceModule/database/schemas/posConfig/posConfig";
import PosPaymentMethod from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod";
import PosOrder from "@eCommerceModule/database/schemas/posOrder/posOrder";
import PosSession from "@eCommerceModule/database/schemas/posSession/posSession";
import {cashMovePosSession, closePosSession, openPosSession, payPosOrder, refundPosOrder} from "@eCommerceModule/workflows/posService";
import {forceClosePosSession} from "@eCommerceModule/utilities/services/posKillSwitch";
import PaymentTransaction from "@financeModule/database/schemas/paymentTransaction/paymentTransaction";
import {withTenant} from "@coreModule/utilities/endpoints/tenantScope";
import type {PayPosOrderFormType} from "armonia/src/modules/eCommerce/api/eCommerce/private/posOrder/payPosOrder.form.validator";

// Till money is compared exactly, in minor units at the currency's decimals (GLB-08). Each test below is a case where
// the old float tolerance (0.011, 0.001) gave the wrong answer.
const companyId = new ObjectId();
/** The tests act on this company's data, as its requests and jobs do (D16). */
const asCompany = <T>(fn: () => PromiseLike<T>): Promise<T> => withTenant(companyId, fn);
const ctx = {logger: getLogger("ledger_pos_money_test"), languageCode: "en-US", company: {_id: companyId, name: "Shop"}, userId: new ObjectId()};

beforeAll(async () => {
    await connectTestDatabase();
}, 120000);

afterAll(async () => {
    await disconnectTestDatabase();
});

beforeEach(() => asCompany(async () => {
    for (const collection of await mongoose.connection.db!.collections()) {
        await collection.deleteMany({});
    }
}));

type TillOptions = {decimals?: number; paymentMethods?: number; openingBalance?: number; pinForDiscount?: boolean};

/**
 * An open till in a currency with `decimals` places, selling one product from one warehouse, paid by card.
 * `pinForDiscount` makes discounts need a manager's PIN (a manager with a PIN is assigned).
 */
async function openTill(options: TillOptions = {}) {
    const country = new ObjectId();
    const decimals = options.decimals ?? 2;
    const currency = await Currency.create({name: "Till money", symbol: "¤", decimalPlaces: decimals, abbreviation: decimals === 3 ? "KWD" : "EUR", company: companyId});
    const warehouse = await Warehouse.create({name: "Shop", code: "SHOP", company: companyId, isActive: true, address: {country}});
    await TaxZone.create({name: "Home", country, isActive: true, priority: 1, company: companyId, rates: [{name: "VAT", rate: 20, isCompound: false, appliesTo: "all"}]});
    const methods = await Promise.all(Array.from({length: options.paymentMethods ?? 1}, (_, index) =>
        PosPaymentMethod.create({name: `Card ${index + 1}`, type: "card", isActive: true, company: companyId})));
    const manager = new ObjectId();
    const pin = options.pinForDiscount ? {pinForDiscount: true, managers: [manager], managerPins: [{user: manager, pinHash: "hash"}]} : {};
    const config = await PosConfig.create({
        name: "Till 1", isActive: true, warehouses: [warehouse._id], currency: currency._id, paymentMethods: methods.map((method) => method._id), company: companyId, ...pin,
    });
    const {session} = await openPosSession({configId: config._id.toString(), openingBalance: options.openingBalance}, ctx);
    return {sessionId: session._id.toString(), methods, warehouse};
}

let productSeq = 0;
async function stockProduct(warehouseId: unknown, price: number) {
    productSeq += 1;
    const product = await Product.create({title: `Item ${productSeq}`, slug: `item-${productSeq}`, sku: `ITEM-${productSeq}`, type: "physical", status: "active", price, company: companyId});
    await Inventory.create({product: product._id, warehouse: warehouseId, quantityOnHand: 10, quantityReserved: 0, company: companyId});
    return product;
}

/** A till sale of `quantity` × `price`, paid by one card payment per amount in `payments`; `discountPercent` is the order's. */
async function seedSale(price: number, quantity: number, payments: number[], sale: {discountPercent?: number} = {}, till: TillOptions = {}) {
    const {sessionId, methods, warehouse} = await openTill({...till, paymentMethods: payments.length});
    const product = await stockProduct(warehouse._id, price);
    const body: PayPosOrderFormType = {
        sessionId,
        lines: [{productId: product._id.toString(), quantity}],
        payments: payments.map((amount, index) => ({paymentMethodId: methods[index]._id.toString(), amount})),
        ...sale,
    };
    const {order} = await payPosOrder(body, ctx);
    return {order, lineId: (await PosOrder.findById(order._id))!.lines[0]._id.toString()};
}

const refundOne = (orderId: unknown, lineId: string) => refundPosOrder({_id: String(orderId), lines: [{lineId, quantity: 1}]}, ctx);
/** Each ledger charge's amount, refunded amount (as numbers) and status. */
const chargeState = async () => (await PaymentTransaction.find({type: "charge"}).sort({_id: 1}))
    .map((row) => [Number(row.amount.toString()), Number(row.refundedAmount.toString()), row.status]);

describe("till refunds (D84, GLB-08)", () => {
    // Three 1.00 items paid 1.01 by card and 1.99 by voucher. Shared by what each paid (101 : 199), every 1.00 refund
    // gave the card 0.34, so the last one took 1.02 from a 1.01 charge.
    it("takes each partial refund from what is still refundable on each payment's charge", () => asCompany(async () => {
        const {order, lineId} = await seedSale(1, 3, [1.01, 1.99]);

        const shares: number[][] = [];
        for (let i = 0; i < 3; i++) {
            const {order: refund} = await refundOne(order._id, lineId);
            shares.push(refund.payments.map((payment) => payment.amount));
        }

        expect(shares).toEqual([[0.34, 0.66], [0.34, 0.66], [0.33, 0.67]]);
        expect(await chargeState()).toEqual([[1.01, 1.01, "refunded"], [1.99, 1.99, "refunded"]]);
    }));

    // The old tolerance (< 0.011) called a 0.03 sale refunded after 0.02.
    it("stays partially refunded until the last cent of a small sale is refunded", () => asCompany(async () => {
        const {order, lineId} = await seedSale(0.01, 3, [0.03]);

        const states: string[] = [];
        for (let i = 0; i < 3; i++) {
            await refundOne(order._id, lineId);
            states.push((await PosOrder.findById(order._id))!.state);
        }

        expect(states).toEqual(["paid", "paid", "refunded"]);
    }));

    // 3 × 1.00 less a 0.10 order discount is 2.90; each unit refunds 1.00 less 0.03 of it = 0.97, so three refunds
    // asked for 2.91.
    // The old tolerance (+ 0.011) let the last one take the extra cent.
    it("refunds exactly what is left on the last refund, where rounding each unit would take a cent too many", () => asCompany(async () => {
        const {order, lineId} = await seedSale(1, 3, [2.9], {discountPercent: 3.3333});
        expect(order.amountTotal).toBe(2.9);

        const refunded: number[] = [];
        for (let i = 0; i < 3; i++) refunded.push((await refundOne(order._id, lineId)).order.amountTotal);

        expect(refunded).toEqual([0.97, 0.97, 0.96]);
        expect(await chargeState()).toEqual([[2.9, 2.9, "refunded"]]);
    }));

    // The old tolerance (< 0.011) took 9.99 for "the whole remaining amount" and refunded all 10.00.
    it("refuses an amount-only refund that is a cent short of what is left", () => asCompany(async () => {
        const {order} = await seedSale(5, 2, [10]);

        await expect(refundPosOrder({_id: order._id.toString(), amount: 9.99}, ctx)).rejects.toMatchObject({error_code: "pos_refund_lines_required"});
        expect((await PosOrder.findById(order._id))!.state).toBe("paid");
    }));

    // The old tolerance (+ 0.001) let 10.001 KWD through against 10.000 left.
    it("refuses an amount-only refund above what is left, to the thousandth", () => asCompany(async () => {
        const {order} = await seedSale(5, 2, [10], {}, {decimals: 3});

        await expect(refundPosOrder({_id: order._id.toString(), amount: 10.001}, ctx)).rejects.toMatchObject({error_code: "pos_refund_amount_invalid"});
        expect(await chargeState()).toEqual([[10, 0, "succeeded"]]);
    }));
});

// TD-B52: the till's other money checks, compared in minor units at the currency's decimals. Each case is one the old
// fixed tolerance (0.01, 0.001, two decimals) got wrong for a 3-decimal currency.
describe("till money checks at the currency's decimals (TD-B52, GLB-08)", () => {
    // Old: |difference| >= 0.01 let a 0.005 KWD shortfall close without a reason.
    it("asks a reason for a cash difference of one minor unit, and notes it at the currency's decimals", () => asCompany(async () => {
        const {sessionId} = await openTill({decimals: 3, openingBalance: 10.005});

        await expect(closePosSession({_id: sessionId, closingBalance: 10}, ctx)).rejects.toMatchObject({error_code: "pos_close_difference_reason_required"});
        await closePosSession({_id: sessionId, closingBalance: 10, differenceReason: "Short"}, ctx);

        expect((await PosSession.findById(sessionId))!.notes).toBe("Short | Cash difference: -0.005 (counted 10.000 vs expected 10.005)");
    }));

    // Old: discountTotal > 0.001 let a 0.001 KWD discount through without the manager's PIN.
    it("asks the manager's PIN for a one-minor-unit discount", () => asCompany(async () => {
        await expect(seedSale(1, 1, [0.999], {discountPercent: 0.1}, {decimals: 3, pinForDiscount: true}))
            .rejects.toMatchObject({error_code: "pos_manager_pin_invalid"});
        expect(await PosOrder.countDocuments({state: "paid"})).toBe(0);
    }));

    // Old: amountPaid + 0.001 < amountTotal took 9.999 KWD for a 10.000 sale.
    it("refuses a payment one minor unit short", () => asCompany(async () => {
        await expect(seedSale(10, 1, [9.999], {}, {decimals: 3})).rejects.toMatchObject({error_code: "pos_payment_insufficient"});
        expect(await PosOrder.countDocuments({state: "paid"})).toBe(0);
    }));

    // Old: round2 closed a 10.005 KWD till on 10.01.
    it("force-closes a till on its expected cash at the currency's decimals", () => asCompany(async () => {
        const {sessionId} = await openTill({decimals: 3, openingBalance: 10.005});

        await forceClosePosSession(sessionId, "pause", {languageCode: ctx.languageCode, company: ctx.company, userId: ctx.userId});

        const closed = (await PosSession.findById(sessionId))!;
        expect([closed.state, closed.closingBalance]).toEqual(["closed", 10.005]);
    }));

    // TD-B61. Old: 10.4 was stored as the opening balance of a till whose currency has no minor unit.
    it("opens a till on its opening balance at the currency's decimals", () => asCompany(async () => {
        const {sessionId} = await openTill({decimals: 0, openingBalance: 10.4});

        const opened = (await PosSession.findById(sessionId))!;
        expect([opened.openingBalance, opened.expectedCash, opened.cashRegisterBalance]).toEqual([10, 10, 10]);
    }));

    // TD-B61. Old: 10.4 out of a 10 till was refused as a float above the balance, and would have been stored unrounded.
    it("takes a cash move at the currency's decimals and checks it against the register in minor units", () => asCompany(async () => {
        const {sessionId} = await openTill({decimals: 0, openingBalance: 10});

        await cashMovePosSession({_id: sessionId, type: "out", amount: 10.4, reason: "Bank"}, ctx);

        const session = (await PosSession.findById(sessionId))!;
        expect([session.cashMoves.map((move) => move.amount), session.cashRegisterBalance, session.expectedCash]).toEqual([[10], 0, 0]);
    }));

    // Old: the charge was written as the number 10, stored as "10" and "0".
    it("stores the ledger charge at the currency's scale", () => asCompany(async () => {
        await seedSale(5, 2, [10], {}, {decimals: 3});

        const charge = (await PaymentTransaction.findOne({type: "charge"}))!;
        expect([charge.amount.toString(), charge.refundedAmount.toString()]).toEqual(["10.000", "0.000"]);
    }));
});
