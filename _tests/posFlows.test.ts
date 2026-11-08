import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import {DOMParser} from "@xmldom/xmldom";
import {getLogger} from "@coreModule/loggers/serverLog";

// The tax authority is never called: signing and the SOAP request are captured instead
const sentRequests: Record<string, any>[] = [];
vi.mock("@eCommerceModule/utilities/fiscalization/fiscalSoap", async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getIIC: () => ({iic: "IIC", iicSignature: "SIG"}),
    registerRequest: async (_url: string, _cert: string, _password: string, request: Record<string, any>) => {
        sentRequests.push(request);
        return {status: 200, body: "<ok/>", xml: new DOMParser().parseFromString("<ok/>", "text/xml"), signedXml: ""};
    },
}));

import Currency from "@coreModule/database/schemas/currency/currency";
import Product from "@eCommerceModule/database/schemas/product/product";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import TaxZone from "@eCommerceModule/database/schemas/taxZone/taxZone";
import PosConfig from "@eCommerceModule/database/schemas/posConfig/posConfig";
import PosPaymentMethod from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod";
import PosOrder from "@eCommerceModule/database/schemas/posOrder/posOrder";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {openPosSession, payPosOrder, refundPosOrder} from "@eCommerceModule/workflows/posService";
import PosSession from "@eCommerceModule/database/schemas/posSession/posSession";
import PaymentTransaction from "@financeModule/database/schemas/paymentTransaction/paymentTransaction";
import {registerPosInvoice} from "@eCommerceModule/utilities/fiscalization/fiscalizationService";
import {withTenant} from "@coreModule/utilities/endpoints/tenantScope";
import {runInTransaction} from "@coreModule/utilities/middlewares/runInTransaction";

const companyId = new ObjectId();
/** The tests act on this company's data, as its requests and jobs do (D16). */
const asCompany = <T>(fn: () => PromiseLike<T>): Promise<T> => withTenant(companyId, fn);
const ctx = {logger: getLogger("pos_flows_test"), languageCode: "en-US", company: {_id: companyId, name: "Shop"}, userId: new ObjectId()};

beforeAll(async () => {
    await connectTestDatabase();
}, 120000);

afterAll(async () => {
    await disconnectTestDatabase();
});

beforeEach(() => asCompany(async () => {
    sentRequests.length = 0;
    for (const collection of await mongoose.connection.db!.collections()) {
        await collection.deleteMany({});
    }
}));

/** A till selling from one warehouse in a country with 20 % VAT, paid in cash. */
async function seedTill() {
    const country = new ObjectId();
    const currency = await Currency.create({name: "Euro", symbol: "€", decimalPlaces: 2, abbreviation: "EUR", company: companyId} as any);
    const warehouse = await Warehouse.create({name: "Shop", code: "SHOP", company: companyId, isActive: true, address: {country}} as any);
    await TaxZone.create({
        name: "Home", country, isActive: true, priority: 1, company: companyId,
        rates: [{name: "VAT", rate: 20, isCompound: false, appliesTo: "all"}],
    } as any);
    const cash = await PosPaymentMethod.create({name: "Cash", type: "cash", isActive: true, company: companyId} as any);
    const config = await PosConfig.create({
        name: "Till 1", isActive: true, warehouses: [warehouse._id], currency: currency._id, paymentMethods: [cash._id], company: companyId,
    } as any);
    const {session} = await openPosSession({configId: config._id.toString()}, ctx);
    return {warehouse, cash, sessionId: session._id};
}

let slug = 0;
async function seedProduct(overrides: Record<string, unknown>) {
    slug += 1;
    return Product.create({title: `P${slug}`, slug: `p-${slug}`, sku: `SKU-${slug}`, type: "physical", status: "active", company: companyId, ...overrides} as any);
}

describe("till sales (#19)", () => {
    it("sells a bundle as its components and a fractional quantity, with the VAT inside the prices", () => asCompany(async () => {
        const {warehouse, cash, sessionId} = await seedTill();
        const strap = await seedProduct({price: 20});
        const bundle = await seedProduct({type: "bundle", price: 50, bundleComponents: [{product: strap._id, quantity: 2}]});
        const cheese = await seedProduct({price: 10});
        await Inventory.create({product: strap._id, warehouse: warehouse._id, quantityOnHand: 10, quantityReserved: 0, company: companyId});
        await Inventory.create({product: cheese._id, warehouse: warehouse._id, quantityOnHand: 3, quantityReserved: 0, company: companyId});

        const {order} = await payPosOrder({
            sessionId,
            lines: [{productId: bundle._id.toString(), quantity: 1}, {productId: cheese._id.toString(), quantity: 0.5}],
            payments: [{paymentMethodId: cash._id.toString(), amount: 55}],
        } as any, ctx);

        expect((await Inventory.findOne({product: strap._id}))!.quantityOnHand).toBe(8);
        expect((await Inventory.findOne({product: cheese._id}))!.quantityOnHand).toBe(2.5);
        expect(order.amountTotal).toBe(55);
        // VAT is extracted per line, as the fiscal report lists it: 50 → 8.33, 5 → 0.83
        expect(order.lines.map(line => line.taxAmount)).toEqual([8.33, 0.83]);
        expect(order.amountTax).toBe(9.16);
        const sale = await ProductOrder.findOne({idempotencyKey: `pos:${order._id}`});
        expect(sale!.items.map(item => item.quantity)).toEqual([1, 0.5]);
    }));

    // TD-B68: pay read the products outside the request's transaction, so it priced a line at the committed price.
    it("prices the lines from the products as the request's transaction sees them", () => asCompany(async () => {
        const {warehouse, cash, sessionId} = await seedTill();
        const mug = await seedProduct({price: 10});
        await Inventory.create({product: mug._id, warehouse: warehouse._id, quantityOnHand: 5, quantityReserved: 0, company: companyId});

        const {order} = await runInTransaction(ctx.logger, async (session) => {
            await Product.updateOne({_id: mug._id}, {price: 12}, {session});
            return payPosOrder({
                sessionId: sessionId.toString(),
                lines: [{productId: mug._id.toString(), quantity: 1}],
                payments: [{paymentMethodId: cash._id.toString(), amount: 12}],
            }, {...ctx, session});
        });

        expect(order.lines.map(line => line.unitPrice)).toEqual([12]);
        expect(order.amountTotal).toBe(12);
    }));

    it("refuses gift-card products at the till", () => asCompany(async () => {
        const {cash, sessionId} = await seedTill();
        const card = await seedProduct({type: "gift_card", price: 25});

        await expect(payPosOrder({
            sessionId,
            lines: [{productId: card._id.toString(), quantity: 1}],
            payments: [{paymentMethodId: cash._id.toString(), amount: 25}],
        } as any, ctx)).rejects.toMatchObject({error_code: "pos_product_not_sellable"});
    }));

    it("reports the VAT of each line to the tax authority", () => asCompany(async () => {
        const {warehouse, cash, sessionId} = await seedTill();
        const mug = await seedProduct({price: 12});
        await Inventory.create({product: mug._id, warehouse: warehouse._id, quantityOnHand: 5, quantityReserved: 0, company: companyId});
        const {order} = await payPosOrder({
            sessionId,
            lines: [{productId: mug._id.toString(), quantity: 2}],
            payments: [{paymentMethodId: cash._id.toString(), amount: 24}],
        } as any, ctx);

        await registerPosInvoice((await PosOrder.findById(order._id))!, {
            isVatRegistered: true, tcrCode: "TCR1", businessUnitCode: "BU1", softCode: "SC1", operatorCode: "OP1",
            fiscalizationUrl: "https://fiscal.test", selfcareUrl: "https://selfcare.test",
            certificateBase64: "", certificatePassword: "",
        } as any, {languageCode: "en-US", companyVat: "L12345678A"});

        const invoice = sentRequests[0]["6__Invoice"];
        expect(invoice["20__TotVATAmt"]).toBe("4.00");
        expect(invoice["8__TotPriceWoVAT"]).toBe("20.00");
        expect(invoice["30__Items"]["1__I"][0]).toMatchObject({"10__VR": "20.00", "11__VA": "4.00"});
        expect(invoice["31__SameTaxes"]["1__SameTax"][0]).toMatchObject({"3__VATRate": "20.00", "4__VATAmt": "4.00"});
    }));

    // TD-B31: a cash payment's amount includes the change given back, so the refund used to return the change too.
    it("refunds what was paid, not the cash handed over, and takes only that out of the drawer", () => asCompany(async () => {
        const {warehouse, cash, sessionId} = await seedTill();
        const wine = await seedProduct({price: 43.2});
        await Inventory.create({product: wine._id, warehouse: warehouse._id, quantityOnHand: 5, quantityReserved: 0, company: companyId});
        const {order} = await payPosOrder({
            sessionId,
            lines: [{productId: wine._id.toString(), quantity: 1}],
            payments: [{paymentMethodId: cash._id.toString(), amount: 50}],
        } as any, ctx);
        expect(order.amountReturn).toBe(6.8);
        const drawerAfterSale = (await PosSession.findById(sessionId))!.cashRegisterBalance;

        const {order: refund} = await refundPosOrder({_id: order._id.toString()}, ctx);

        expect(refund.amountTotal).toBe(43.2);
        expect(refund.payments.map(payment => payment.amount)).toEqual([43.2]);
        const drawer = (await PosSession.findById(sessionId))!;
        expect(drawer.cashRegisterBalance).toBe(drawerAfterSale - 43.2);
    }));

    it("splits a refund over card and cash by what each actually paid", () => asCompany(async () => {
        const {warehouse, cash, sessionId} = await seedTill();
        const card = await PosPaymentMethod.create({name: "Card", type: "card", isActive: true, company: companyId} as any);
        const lamp = await seedProduct({price: 50});
        await Inventory.create({product: lamp._id, warehouse: warehouse._id, quantityOnHand: 5, quantityReserved: 0, company: companyId});
        // Two lamps for 100.00: 60.00 on the card, 50.00 in cash with 10.00 change, so the cash really paid 40.00
        const {order} = await payPosOrder({
            sessionId,
            lines: [{productId: lamp._id.toString(), quantity: 2}],
            payments: [{paymentMethodId: card._id.toString(), amount: 60}, {paymentMethodId: cash._id.toString(), amount: 50}],
        } as any, ctx);
        const drawerAfterSale = (await PosSession.findById(sessionId))!.cashRegisterBalance;
        const lineId = (await PosOrder.findById(order._id))!.lines[0]._id.toString();

        const {order: refund} = await refundPosOrder({_id: order._id.toString(), lines: [{lineId, quantity: 1}]}, ctx);

        expect(refund.payments.map(payment => payment.amount)).toEqual([30, 20]);
        expect((await PosSession.findById(sessionId))!.cashRegisterBalance).toBe(drawerAfterSale - 20);
    }));

    // TD-B41: the ledger recorded the cash handed over (change included) and never heard of till refunds.
    it("writes what each payment paid to the finance ledger and books refunds against it", () => asCompany(async () => {
        const {warehouse, cash, sessionId} = await seedTill();
        const card = await PosPaymentMethod.create({name: "Card", type: "card", isActive: true, company: companyId} as any);
        const lamp = await seedProduct({price: 50});
        await Inventory.create({product: lamp._id, warehouse: warehouse._id, quantityOnHand: 5, quantityReserved: 0, company: companyId});
        const {order} = await payPosOrder({
            sessionId,
            lines: [{productId: lamp._id.toString(), quantity: 2}],
            payments: [{paymentMethodId: card._id.toString(), amount: 60}, {paymentMethodId: cash._id.toString(), amount: 50}],
        } as any, ctx);
        const ledger = async (type: string) => (await PaymentTransaction.find({type}).sort({_id: 1})).map(row => ({
            amount: Number(row.amount.toString()), refunded: Number(row.refundedAmount.toString()), status: row.status,
        }));
        expect(await ledger("charge")).toEqual([
            {amount: 60, refunded: 0, status: "succeeded"},
            {amount: 40, refunded: 0, status: "succeeded"},
        ]);

        await refundPosOrder({_id: order._id.toString()}, ctx);

        expect((await ledger("refund")).map(row => row.amount)).toEqual([60, 40]);
        expect(await ledger("charge")).toEqual([
            {amount: 60, refunded: 60, status: "refunded"},
            {amount: 40, refunded: 40, status: "refunded"},
        ]);
    }));
});
