import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {MongoMemoryServer} from "mongodb-memory-server";
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
import {openPosSession, payPosOrder} from "@eCommerceModule/utilities/services/posService";
import {registerPosInvoice} from "@eCommerceModule/utilities/fiscalization/fiscalizationService";

let mongod: MongoMemoryServer;
const companyId = new ObjectId();
const ctx = {logger: getLogger("pos_flows_test"), languageCode: "en-US", company: {_id: companyId, name: "Shop"}, userId: new ObjectId()};

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
}, 120000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

beforeEach(async () => {
    sentRequests.length = 0;
    for (const collection of await mongoose.connection.db!.collections()) {
        await collection.deleteMany({});
    }
});

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
    it("sells a bundle as its components and a fractional quantity, with the VAT inside the prices", async () => {
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
    });

    it("refuses gift-card products at the till", async () => {
        const {cash, sessionId} = await seedTill();
        const card = await seedProduct({type: "gift_card", price: 25});

        await expect(payPosOrder({
            sessionId,
            lines: [{productId: card._id.toString(), quantity: 1}],
            payments: [{paymentMethodId: cash._id.toString(), amount: 25}],
        } as any, ctx)).rejects.toMatchObject({error_code: "pos_product_not_sellable"});
    });

    it("reports the VAT of each line to the tax authority", async () => {
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
        } as any, {companyVat: "L12345678A"});

        const invoice = sentRequests[0]["6__Invoice"];
        expect(invoice["20__TotVATAmt"]).toBe("4.00");
        expect(invoice["8__TotPriceWoVAT"]).toBe("20.00");
        expect(invoice["30__Items"]["1__I"][0]).toMatchObject({"10__VR": "20.00", "11__VA": "4.00"});
        expect(invoice["31__SameTaxes"]["1__SameTax"][0]).toMatchObject({"3__VATRate": "20.00", "4__VATAmt": "4.00"});
    });
});
