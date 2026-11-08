import {afterAll, beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";
import mongoose from "mongoose";
import {ClientSession, MongoError, ObjectId} from "mongodb";
import {DOMParser} from "@xmldom/xmldom";
import {getLogger} from "@coreModule/loggers/serverLog";

// The tax authority is never called: signing and the SOAP request are captured instead
const sentRequests: Record<string, any>[] = [];
/** Set to make the next CIS call fail, as when the tax authority is unreachable. */
let cisFailure: Error | undefined;
vi.mock("@eCommerceModule/utilities/fiscalization/fiscalSoap", async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getIIC: () => ({iic: "IIC", iicSignature: "SIG"}),
    registerRequest: async (_url: string, _cert: string, _password: string, request: Record<string, any>) => {
        sentRequests.push(request);
        if (cisFailure) throw cisFailure;
        return {status: 200, body: "<ok/>", xml: new DOMParser().parseFromString("<ok/>", "text/xml"), signedXml: ""};
    },
}));
vi.mock("@coreModule/utilities/middlewares/authMW", async () =>
    (await import("@coreModule/_tests/httpHarness")).authMWStub);
// The till's certificate file: only its bytes are read, and the SOAP call above is mocked
vi.mock("@coreModule/utilities/gridfs/gridfsStorage", async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getGridFSStorage: () => ({getFileBuffer: async () => Buffer.from("certificate")}),
}));

import Currency from "@coreModule/database/schemas/currency/currency";
import Product from "@eCommerceModule/database/schemas/product/product";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import TaxZone from "@eCommerceModule/database/schemas/taxZone/taxZone";
import PosConfig from "@eCommerceModule/database/schemas/posConfig/posConfig";
import FiscalConfig from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig";
import Media from "@coreModule/database/schemas/media/media";
import PosPaymentMethod from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod";
import PosOrder from "@eCommerceModule/database/schemas/posOrder/posOrder";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {openPosSession, payAndFiscalizePosOrder, payPosOrder, refundPosOrder} from "@eCommerceModule/workflows/posService";
import PosSession from "@eCommerceModule/database/schemas/posSession/posSession";
import PaymentTransaction from "@financeModule/database/schemas/paymentTransaction/paymentTransaction";
import {registerPosInvoice} from "@eCommerceModule/utilities/fiscalization/fiscalizationService";
import {withTenant} from "@coreModule/utilities/endpoints/tenantScope";
import {runInTransaction} from "@coreModule/utilities/middlewares/runInTransaction";
import request from "supertest";
import {allPermissionTags, appFor, callerHeader} from "@coreModule/_tests/httpHarness";
import * as fiscalRoute from "@eCommerceModule/api/eCommerce/private/fiscal";
import {runPosFiscalSweep} from "@eCommerceModule/utilities/cronJobs/posFiscalSweepJob";

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
    cisFailure = undefined;
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
    return {warehouse, cash, config, sessionId: session._id};
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

    // TD-B70: pay read the till outside the request's transaction, so it missed a pause made in it.
    it("reads the till as the request's transaction sees it", () => asCompany(async () => {
        const {warehouse, cash, config, sessionId} = await seedTill();
        const mug = await seedProduct({price: 10});
        await Inventory.create({product: mug._id, warehouse: warehouse._id, quantityOnHand: 5, quantityReserved: 0, company: companyId});

        await expect(runInTransaction(ctx.logger, async (session) => {
            await PosConfig.updateOne({_id: config._id}, {pausedAt: new Date()}, {session});
            return payPosOrder({
                sessionId: sessionId.toString(),
                lines: [{productId: mug._id.toString(), quantity: 1}],
                payments: [{paymentMethodId: cash._id.toString(), amount: 10}],
            }, {...ctx, session});
        })).rejects.toMatchObject({error_code: "pos_config_paused"});
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

/** A cash till with an active CIS config and a mug in stock: the body of a 12.00 sale of one mug. */
async function seedFiscalSale() {
    const {warehouse, cash, config, sessionId} = await seedTill();
    const mug = await seedProduct({price: 12});
    await Inventory.create({product: mug._id, warehouse: warehouse._id, quantityOnHand: 5, quantityReserved: 0, company: companyId});
    const certificate = new ObjectId();
    await Media.collection.insertOne({_id: certificate, fileId: new ObjectId(), company: companyId});
    const fiscalConfig = new ObjectId();
    await FiscalConfig.collection.insertOne({
        _id: fiscalConfig, name: "CIS", isActive: true, company: companyId, updatedAt: new Date(),
        nipt: "L12345678A", tcrCode: "TCR1", businessUnitCode: "BU1", softCode: "SC1", operatorCode: "OP1",
        fiscalizationUrl: "https://fiscal.test", einvoiceUrl: "https://einvoice.test", selfcareUrl: "https://selfcare.test",
        certificate: [certificate], certificatePassword: "secret",
    });
    await PosConfig.updateOne({_id: config._id}, {fiscalConfig});
    return {
        sessionId: sessionId.toString(),
        lines: [{productId: mug._id.toString(), quantity: 1}],
        payments: [{paymentMethodId: cash._id.toString(), amount: 12}],
    };
}

// TD-B73 / D97: the sale commits first, then CIS registers it outside the transaction.
describe("till sale fiscalization (D97)", () => {
    it("registers the sale with CIS once when its transaction is retried", () => asCompany(async () => {
        const body = await seedFiscalSale();
        // The first commit fails as a write conflict does, so the whole sale is run again
        const commit = vi.spyOn(ClientSession.prototype, "commitTransaction").mockImplementationOnce(async function (this: ClientSession) {
            await this.abortTransaction();
            const conflict = new MongoError("Write conflict");
            conflict.addErrorLabel("TransientTransactionError");
            throw conflict;
        });
        try {
            const sale = await payAndFiscalizePosOrder(body, ctx);
            expect(commit).toHaveBeenCalledTimes(2);
            expect(sale.fiscal).toMatchObject({nslf: "IIC"});
        } finally {
            commit.mockRestore();
        }

        expect(sentRequests).toHaveLength(1);
        expect(await PosOrder.countDocuments({state: "paid"})).toBe(1);
    }));

    it("stores the CIS codes on the committed sale and returns them for the receipt", () => asCompany(async () => {
        const sale = await payAndFiscalizePosOrder(await seedFiscalSale(), ctx);

        expect(sale).toMatchObject({fiscal: {nslf: "IIC", fault: undefined}, order: {nslf: "IIC"}, receipt: {nslf: "IIC", fiscalAttempted: true}});
        expect(sentRequests).toHaveLength(1);
        expect((await PosOrder.findById(sale.order._id))!.nslf).toBe("IIC");
    }));

    it("keeps the sale and stores the fault when CIS fails", () => asCompany(async () => {
        cisFailure = new Error("CIS unreachable");
        const sale = await payAndFiscalizePosOrder(await seedFiscalSale(), ctx);

        expect(sale).toMatchObject({fiscal: {fault: "CIS unreachable"}, receipt: {fiscalError: "CIS unreachable"}});
        const order = (await PosOrder.findById(sale.order._id))!;
        expect(order).toMatchObject({state: "paid", fiscalError: "CIS unreachable"});
        expect(order.nslf).toBeUndefined();
        expect(await ProductOrder.countDocuments({idempotencyKey: `pos:${order._id}`})).toBe(1);
    }));
});

// TD-B75: a sale the pay request never got to CIS is registered by the sweep; one whose answer may be lost never again.
describe("till sale fiscal recovery (TD-B75)", () => {
    const app = appFor([{...fiscalRoute, module: "eCommerce"}]);

    /** Rings up committed sales that never reached CIS, as when the process stops right after the commit. */
    async function seedUnregisteredSales(count: number) {
        const body = await seedFiscalSale();
        const ids: string[] = [];
        for (let i = 0; i < count; i++) ids.push((await payPosOrder(body, ctx)).order._id.toString());
        return ids;
    }
    /** Moves a sale's last change back, past the sweep's grace period, without touching anything else. */
    const age = (id: string, minutes: number, fields: Record<string, unknown> = {}) =>
        PosOrder.collection.updateOne({_id: new ObjectId(id)}, {$set: {updatedAt: new Date(Date.now() - minutes * 60000), ...fields}});
    const marker = async (id: string) => (await PosOrder.findById(id).select("+fiscalRegisteringAt"))!.fiscalRegisteringAt;

    it("registers a stale paid sale that never reached CIS, once", () => asCompany(async () => {
        const [id] = await seedUnregisteredSales(1);
        await age(id, 5);

        await runPosFiscalSweep(companyId, ctx.logger);
        await runPosFiscalSweep(companyId, ctx.logger);

        expect(sentRequests).toHaveLength(1);
        const order = (await PosOrder.findById(id))!;
        expect(order).toMatchObject({state: "paid", nslf: "IIC"});
        expect(order.fiscalError).toBeUndefined();
        expect(await marker(id)).toBeUndefined();
    }));

    it("skips sales that are fresh, registered, faulted or already sent to CIS", () => asCompany(async () => {
        const [fresh, registered, faulted, sent] = await seedUnregisteredSales(4);
        await age(registered, 5, {nslf: "IIC-1", nivf: "FIC-1"});
        await age(faulted, 5, {fiscalError: "CIS unreachable"});
        await age(sent, 20, {fiscalRegisteringAt: new Date(Date.now() - 20 * 60000)});

        await runPosFiscalSweep(companyId, ctx.logger);

        expect(sentRequests).toHaveLength(0);
        expect((await PosOrder.findById(fresh))!.nslf).toBeUndefined();
        expect((await PosOrder.findById(sent))!.nslf).toBeUndefined();
        expect(await marker(sent)).toBeInstanceOf(Date);
    }));

    it("refuses a manual re-send of a sale sent to CIS whose answer was not stored", () => asCompany(async () => {
        const [id] = await seedUnregisteredSales(1);
        await age(id, 20, {fiscalRegisteringAt: new Date(Date.now() - 20 * 60000)});
        const admin = {userId: ctx.userId.toString(), companyId: companyId.toString(), isAdmin: true, permissions: allPermissionTags([PosOrder])};

        const response = await request(app).post("/api/eCommerce/fiscal/fiscalizePosOrder").set(callerHeader(admin)).send({posOrderId: id});

        expect([response.status, response.body.error_code]).toEqual([409, "fiscal_registration_unconfirmed"]);
        expect(sentRequests).toHaveLength(0);
    }));

    it("answers 409 concurrent_request_retry when the sale's transaction runs out of retries", () => asCompany(async () => {
        const body = await seedFiscalSale();
        const exhausted = new MongoError("Write conflict");
        exhausted.addErrorLabel("TransientTransactionError");
        const withTransaction = vi.spyOn(ClientSession.prototype, "withTransaction").mockRejectedValueOnce(exhausted);
        try {
            await expect(payAndFiscalizePosOrder(body, ctx)).rejects.toMatchObject({error_code: "concurrent_request_retry", status: 409});
        } finally {
            withTransaction.mockRestore();
        }
        expect(sentRequests).toHaveLength(0);
    }));
});
