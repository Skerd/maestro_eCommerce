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
/** The IIC every signing yields; its signature is a function of the input, as RSA PKCS#1 v1.5 signing is. */
let signedIic = "IIC";
const iicInputs: string[] = [];
vi.mock("@eCommerceModule/utilities/fiscalization/fiscalSoap", async (importOriginal) => ({
    ...(await importOriginal<object>()),
    getIIC: (input: string) => {
        iicInputs.push(input);
        return {iic: signedIic, iicSignature: `SIG:${input}`};
    },
    signXml: (xml: string) => xml,
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
import {openPosSession, payAndFiscalizePosOrder, payPosOrder, refundPosOrder, sendPosOrderToCis} from "@eCommerceModule/workflows/posService";
import PosSession from "@eCommerceModule/database/schemas/posSession/posSession";
import PaymentTransaction from "@financeModule/database/schemas/paymentTransaction/paymentTransaction";
import {registerPosInvoice, type FiscalCert} from "@eCommerceModule/utilities/fiscalization/fiscalizationService";
import type {IFiscalConfig} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig";
import {calculateLinesTax} from "@eCommerceModule/utilities/services/taxCalculationService";
import {withTenant} from "@coreModule/utilities/endpoints/tenantScope";
import {runInTransaction} from "@coreModule/utilities/middlewares/runInTransaction";
import request from "supertest";
import {allPermissionTags, appFor, callerHeader} from "@coreModule/_tests/httpHarness";
import * as fiscalRoute from "@eCommerceModule/api/eCommerce/private/fiscal";
import * as posOrderRoute from "@eCommerceModule/api/eCommerce/private/checked/posOrder";
import {actionPermissionTag} from "@coreModule/utilities/security/actionPermissions";
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
    signedIic = "IIC";
    iicInputs.length = 0;
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

// D98 / TD-B76: staff resolve a sale whose CIS answer was lost, after checking the CIS portal.
describe("unconfirmed CIS registration (D98)", () => {
    const app = appFor([{...posOrderRoute, module: "eCommerce"}]);
    const NSLF = "0a1b2c3d4e5f60718293a4b5c6d7e8f9";
    const NIVF = "6f9619ff-8b86-4d11-b42d-00c04fc964ff";
    const EIC = "1b4e28ba-2fa1-41d2-883f-0016d3cca427";
    const sentAt = new Date(Date.now() - 20 * 60000);
    const staffId = new ObjectId();
    const staff = (permissions: string[]) => callerHeader({userId: staffId.toString(), companyId: companyId.toString(), permissions});
    const tag = (action: string) => actionPermissionTag(PosOrder, action, "self")!;

    /** A committed sale sent to CIS whose answer was not stored, as a timeout leaves it. */
    async function seedUnconfirmedSale(body?: Awaited<ReturnType<typeof seedFiscalSale>>) {
        const id = (await payPosOrder(body ?? await seedFiscalSale(), ctx)).order._id.toString();
        await PosOrder.collection.updateOne({_id: new ObjectId(id)}, {$set: {fiscalRegisteringAt: sentAt, fiscalError: "timeout of 60000ms exceeded"}});
        return id;
    }
    const stored = async (id: string) => (await PosOrder.findById(id).select("+fiscalRegisteringAt"))!;
    const post = (action: string, body: Record<string, unknown>, permissions = [tag(action)]) =>
        request(app).post(`/api/eCommerce/posOrder/${action}`).set(staff(permissions)).send(body);

    it("tells the panel which sales await a CIS portal check", () => asCompany(async () => {
        const body = await seedFiscalSale();
        const neverSent = (await payPosOrder(body, ctx)).order._id.toString();
        const unconfirmed = await seedUnconfirmedSale(body);
        const reader = allPermissionTags([PosOrder]);

        const single = async (id: string) => (await post("single", {_id: id}, reader)).body;
        const list = await request(app).post("/api/eCommerce/posOrder").set(staff(reader)).send({offset: 0, limit: 10});

        expect((await single(unconfirmed)).fiscalAwaitingConfirmation).toBe(true);
        expect((await single(neverSent)).fiscalAwaitingConfirmation).toBe(false);
        expect(Object.fromEntries(list.body.data.map((row: {_id: string; fiscalAwaitingConfirmation: boolean}) => [row._id, row.fiscalAwaitingConfirmation])))
            .toEqual({[unconfirmed]: true, [neverSent]: false});
    }));

    it("records the codes found in the CIS portal as the sale's fiscal result, and who recorded them", () => asCompany(async () => {
        const id = await seedUnconfirmedSale();

        const response = await post("recordFiscalCodes", {_id: id, nslf: NSLF, nivf: NIVF, eic: EIC});

        expect(response.status).toBe(200);
        expect(response.body.data.order).toMatchObject({
            nslf: NSLF.toUpperCase(), nivf: NIVF, eic: EIC, fiscalAwaitingConfirmation: false, fiscalResolution: "recorded",
        });
        const order = await stored(id);
        expect(order).toMatchObject({nslf: NSLF.toUpperCase(), nivf: NIVF, eic: EIC, fiscalResolution: "recorded"});
        expect(order.fiscalRegisteringAt).toBeUndefined();
        expect(order.fiscalError).toBeUndefined();
        expect(order.fiscalizedAt).toEqual(sentAt);
        expect(String(order.fiscalResolvedBy)).toBe(staffId.toString());
        expect(order.fiscalResolvedAt).toBeInstanceOf(Date);
        expect(sentRequests).toHaveLength(0);
    }));

    it("refuses codes in the wrong format", () => asCompany(async () => {
        const id = await seedUnconfirmedSale();

        const response = await post("recordFiscalCodes", {_id: id, nslf: "not-a-code", nivf: NIVF});

        expect(response.status).toBe(400);
        expect((await stored(id)).fiscalRegisteringAt).toEqual(sentAt);
    }));

    it("clears the mark and sends the sale to CIS once when it was not registered", () => asCompany(async () => {
        const id = await seedUnconfirmedSale();

        const response = await post("resendFiscal", {_id: id});

        expect(response.status).toBe(200);
        expect(sentRequests).toHaveLength(1);
        expect(response.body.data).toMatchObject({nslf: "IIC", order: {nslf: "IIC", fiscalAwaitingConfirmation: false, fiscalResolution: "resent"}});
        const order = await stored(id);
        expect(order).toMatchObject({nslf: "IIC", fiscalResolution: "resent"});
        expect(order.fiscalRegisteringAt).toBeUndefined();
        expect(String(order.fiscalResolvedBy)).toBe(staffId.toString());
    }));

    it("refuses a sale that does not await a CIS portal check", () => asCompany(async () => {
        const body = await seedFiscalSale();
        const neverSent = (await payPosOrder(body, ctx)).order._id.toString();
        const registered = await seedUnconfirmedSale(body);
        await PosOrder.collection.updateOne({_id: new ObjectId(registered)}, {$set: {nslf: "IIC", nivf: NIVF}});

        for (const id of [neverSent, registered]) {
            const record = await post("recordFiscalCodes", {_id: id, nslf: NSLF, nivf: NIVF});
            const resend = await post("resendFiscal", {_id: id});
            expect([record.status, record.body.error_code]).toEqual([409, "fiscal_not_awaiting_confirmation"]);
            expect([resend.status, resend.body.error_code]).toEqual([409, "fiscal_not_awaiting_confirmation"]);
        }
        expect(sentRequests).toHaveLength(0);
    }));

    it("refuses a caller without the action's permission", () => asCompany(async () => {
        const id = await seedUnconfirmedSale();

        const record = await post("recordFiscalCodes", {_id: id, nslf: NSLF, nivf: NIVF}, [tag("resendFiscal")]);
        const resend = await post("resendFiscal", {_id: id}, [tag("recordFiscalCodes")]);

        expect([record.status, record.body.error_code]).toEqual([403, "user_permissions_not_sufficient"]);
        expect([resend.status, resend.body.error_code]).toEqual([403, "user_permissions_not_sufficient"]);
        expect(sentRequests).toHaveLength(0);
        expect((await stored(id)).fiscalRegisteringAt).toEqual(sentAt);
    }));
});

// TD-B71: a till refund is registered with CIS as a corrective invoice of the sale it refunds.
describe("till refund fiscalization (TD-B71)", () => {
    const FIC = "6f9619ff-8b86-4d11-b42d-00c04fc964ff";

    it("sends the refund as a corrective invoice naming the sale's IIC and issue time, with negative amounts", () => asCompany(async () => {
        const {order: sale} = await payAndFiscalizePosOrder(await seedFiscalSale(), ctx);
        // CIS answered with its FIC: the sale is registered
        await PosOrder.collection.updateOne({_id: new ObjectId(sale._id)}, {$set: {nivf: FIC}});
        const issued = (await PosOrder.findById(sale._id))!.fiscalIssueDateTime;
        const {order: refund} = await refundPosOrder({_id: sale._id.toString()}, ctx);

        await sendPosOrderToCis(refund._id.toString(), ctx);

        expect(sentRequests).toHaveLength(2);
        const invoice = sentRequests[1]["6__Invoice"];
        expect(issued).toEqual(expect.any(String));
        expect(invoice["24__CorrectiveInv"]).toEqual({"1__IICRef": "IIC", "2__IssueDateTime": issued, "3__Type": "CORRECTIVE"});
        expect(invoice["9__TotPrice"]).toBe("-12.00");
        expect(invoice["30__Items"]["1__I"][0]).toMatchObject({"4__Q": "-1.00", "8__PB": "-10.00", "9__PA": "-12.00", "11__VA": "-2.00"});
    }));

    // The invoice number's year is the issue time's in Albania: just after midnight on 1 January it is already the new
    // year there, while UTC (and a server on it) is still in the old one.
    it("numbers the invoice with the year of its issue time in Albanian time", () => asCompany(async () => {
        const {order} = await payPosOrder(await seedFiscalSale(), ctx);
        const issueDateTime = "2027-01-01T00:30:00+01:00";

        await registerPosInvoice((await PosOrder.findById(order._id))!, {
            isVatRegistered: true, nipt: "L12345678A", tcrCode: "TCR1", businessUnitCode: "BU1", softCode: "SC1", operatorCode: "OP1",
            fiscalizationUrl: "https://fiscal.test", selfcareUrl: "https://selfcare.test", certificateBase64: "", certificatePassword: "",
        } as IFiscalConfig & FiscalCert, {languageCode: "en-US", issueDateTime});

        const invoice = sentRequests[0]["6__Invoice"];
        expect(invoice["3__IssueDateTime"]).toBe(issueDateTime);
        expect(invoice["4__InvNum"]).toMatch(/^\d+\/2027\/TCR1$/);
    }));

    it("refuses to register the refund of a sale CIS never registered, and sends nothing", () => asCompany(async () => {
        const body = await seedFiscalSale();
        const neverSent = (await payPosOrder(body, ctx)).order;
        // Sent, but CIS gave no FIC (a fault): not registered either
        const unregistered = (await payAndFiscalizePosOrder(body, ctx)).order;
        sentRequests.length = 0;

        for (const sale of [neverSent, unregistered]) {
            const {order: refund} = await refundPosOrder({_id: sale._id.toString()}, ctx);
            await expect(sendPosOrderToCis(refund._id.toString(), ctx)).rejects.toMatchObject({error_code: "fiscal_refund_original_not_fiscalized"});
            // Nothing reached CIS, so the refund may be sent once its sale is registered
            expect((await PosOrder.findById(refund._id).select("+fiscalRegisteringAt"))!.fiscalRegisteringAt).toBeUndefined();
        }
        expect(sentRequests).toHaveLength(0);
    }));
});

// TD-B77: a sale resolved with the codes from the CIS portal (D98) is signed again for its e-invoice.
describe("e-invoice of a sale resolved from the CIS portal (TD-B77)", () => {
    const fiscalApp = appFor([{...fiscalRoute, module: "eCommerce"}]);
    const posOrderApp = appFor([{...posOrderRoute, module: "eCommerce"}]);
    const NSLF = "0A1B2C3D4E5F60718293A4B5C6D7E8F9";
    const NIVF = "6f9619ff-8b86-4d11-b42d-00c04fc964ff";
    const staff = () => callerHeader({userId: ctx.userId.toString(), companyId: companyId.toString(), permissions: allPermissionTags([PosOrder])});

    /** A sale sent with NSLF as its IIC whose CIS answer was lost, then resolved by staff with the codes they found. */
    async function seedRecordedSale(recordedNslf: string) {
        signedIic = NSLF;
        cisFailure = new Error("timeout of 60000ms exceeded");
        const {order} = await payAndFiscalizePosOrder(await seedFiscalSale(), ctx);
        cisFailure = undefined;
        const id = order._id.toString();
        const recorded = await request(posOrderApp).post("/api/eCommerce/posOrder/recordFiscalCodes").set(staff()).send({_id: id, nslf: recordedNslf, nivf: NIVF});
        expect(recorded.status).toBe(200);
        return id;
    }
    const registerEinvoice = (id: string) =>
        request(fiscalApp).post("/api/eCommerce/fiscal/registerEinvoice").set(staff()).send({posOrderId: id});

    it("signs the sale again over the input it was sent with, stores the signature and registers the e-invoice", () => asCompany(async () => {
        const id = await seedRecordedSale(NSLF.toLowerCase());
        const [sentInput] = iicInputs;

        const response = await registerEinvoice(id);

        expect(response.status).toBe(200);
        expect(iicInputs).toEqual([sentInput, sentInput]);
        expect((await PosOrder.findById(id).select("+iicSignature"))!.iicSignature).toBe(`SIG:${sentInput}`);
        const ubl = Buffer.from(sentRequests[1]["5__EinvoiceEnvelope"]["1__UblInvoice"][0]["2__@UblInvoice"], "base64").toString("utf8");
        expect(ubl).toContain(`IICSignature=SIG:${sentInput}`);
    }));

    it("uses the signature stored when CIS answered, without signing again", () => asCompany(async () => {
        const {order} = await payAndFiscalizePosOrder(await seedFiscalSale(), ctx);
        const id = order._id.toString();
        await PosOrder.collection.updateOne({_id: new ObjectId(id)}, {$set: {nivf: NIVF}});

        const response = await registerEinvoice(id);

        expect(response.status).toBe(200);
        expect(iicInputs).toHaveLength(1);
        const ubl = Buffer.from(sentRequests[1]["5__EinvoiceEnvelope"]["1__UblInvoice"][0]["2__@UblInvoice"], "base64").toString("utf8");
        expect(ubl).toContain(`IICSignature=SIG:${iicInputs[0]}`);
    }));

    /** A registered sale and its refund, both fiscalized; the sale's e-invoice is registered unless `saleEic` is null. */
    async function seedFiscalizedRefund(saleEic: string | null) {
        const {order: sale} = await payAndFiscalizePosOrder(await seedFiscalSale(), ctx);
        await PosOrder.collection.updateOne({_id: new ObjectId(sale._id)}, {$set: {nivf: NIVF, ...(saleEic ? {eic: saleEic} : {})}});
        const {order: refund} = await refundPosOrder({_id: sale._id.toString()}, ctx);
        await sendPosOrderToCis(refund._id.toString(), ctx);
        await PosOrder.collection.updateOne({_id: new ObjectId(refund._id)}, {$set: {nivf: "7c9e6679-7425-40de-944b-e07fc1f90ae7"}});
        const issued = (await PosOrder.findById(sale._id))!.fiscalIssueDateTime!;
        return {refundId: refund._id.toString(), issued};
    }

    // Item 3 of the 2026-11-09 follow-up: a refund's e-invoice corrects the sale's, as its fiscal invoice does (TD-B71).
    it("registers a refund's e-invoice as a corrective invoice of the sale's, with negative amounts", () => asCompany(async () => {
        const {refundId, issued} = await seedFiscalizedRefund("1b4e28ba-2fa1-41d2-883f-0016d3cca427");

        const response = await registerEinvoice(refundId);

        expect(response.status).toBe(200);
        const ubl = Buffer.from(sentRequests[2]["5__EinvoiceEnvelope"]["1__UblInvoice"][0]["2__@UblInvoice"], "base64").toString("utf8");
        expect(ubl).toContain("<cbc:InvoiceTypeCode>384</cbc:InvoiceTypeCode>");
        expect(ubl.replace(/\s+/g, "")).toContain(
            `<cac:BillingReference><cac:InvoiceDocumentReference><cbc:ID>IIC</cbc:ID><cbc:IssueDate>${issued.slice(0, 10)}</cbc:IssueDate>`,
        );
        expect(ubl).toContain(`<cbc:PayableAmount currencyID="ALL">-12.00</cbc:PayableAmount>`);
        expect(ubl).toContain(`<cbc:InvoicedQuantity unitCode="C62">-1.00</cbc:InvoicedQuantity>`);
        expect(ubl).toContain(`<cbc:PriceAmount currencyID="ALL">10.00</cbc:PriceAmount>`);
        // The negative totals keep their VAT category
        expect(ubl).not.toContain("<cbc:ID>Z</cbc:ID>");
    }));

    it("refuses a refund's e-invoice when the sale has no registered e-invoice, and sends nothing", () => asCompany(async () => {
        const {refundId} = await seedFiscalizedRefund(null);

        const response = await registerEinvoice(refundId);

        expect(response.body.error_code).toBe("fiscal_einvoice_refund_original_missing");
        expect(sentRequests).toHaveLength(2);
    }));

    it("refuses codes whose IIC is not the one the sale was sent with, and registers nothing", () => asCompany(async () => {
        const id = await seedRecordedSale("ffffffffffffffffffffffffffffffff");

        const response = await registerEinvoice(id);

        expect(response.body.error_code).toBe("fiscal_iic_mismatch");
        expect(sentRequests).toHaveLength(1);
        expect((await PosOrder.findById(id).select("+iicSignature"))!.iicSignature).toBeUndefined();
    }));
});

// TD-B77: the till actions are gated by their own action permissions (SEC-02), not by POS field write tags.
describe("till action permissions (SEC-02)", () => {
    const app = appFor([{...posOrderRoute, module: "eCommerce"}]);
    const caller = (permissions: string[]) => callerHeader({userId: ctx.userId.toString(), companyId: companyId.toString(), permissions});
    const tag = (action: string) => actionPermissionTag(PosOrder, action, "self")!;

    it("refunds and reprints with each action's permission alone", () => asCompany(async () => {
        const {order} = await payPosOrder(await seedFiscalSale(), ctx);
        const _id = order._id.toString();

        const refund = await request(app).post("/api/eCommerce/posOrder/refund").set(caller([tag("refund")])).send({_id});
        const reprint = await request(app).post("/api/eCommerce/posOrder/reprint").set(caller([tag("reprint")])).send({_id});

        expect([refund.status, reprint.status]).toEqual([200, 200]);
        expect(await PosOrder.countDocuments({isRefund: true})).toBe(1);
    }));

    it("refuses the till actions to a caller with only the POS field write tags", () => asCompany(async () => {
        const {order} = await payPosOrder(await seedFiscalSale(), ctx);
        const _id = order._id.toString();
        const fieldWrites = caller(["posorders[write:state]", "posorders[write:amountRefunded]"]);

        const refund = await request(app).post("/api/eCommerce/posOrder/refund").set(fieldWrites).send({_id});
        const reprint = await request(app).post("/api/eCommerce/posOrder/reprint").set(fieldWrites).send({_id});

        expect([refund.status, refund.body.error_code]).toEqual([403, "user_permissions_not_sufficient"]);
        expect([reprint.status, reprint.body.error_code]).toEqual([403, "user_permissions_not_sufficient"]);
        expect(await PosOrder.countDocuments({isRefund: true})).toBe(0);
    }));
});

// TD-B74: the tax helpers read tax zones and products through the caller's transaction.
describe("tax inside a transaction (TD-B74)", () => {
    it("extracts a till sale's VAT at the rate its transaction set", () => asCompany(async () => {
        const {warehouse, cash, sessionId} = await seedTill();
        const mug = await seedProduct({price: 12});
        await Inventory.create({product: mug._id, warehouse: warehouse._id, quantityOnHand: 5, quantityReserved: 0, company: companyId});

        const {order} = await runInTransaction(ctx.logger, async (session) => {
            await TaxZone.updateOne({name: "Home"}, {$set: {"rates.0.rate": 50}}, {session});
            return payPosOrder({
                sessionId: sessionId.toString(),
                lines: [{productId: mug._id.toString(), quantity: 1}],
                payments: [{paymentMethodId: cash._id.toString(), amount: 12}],
            }, {...ctx, session});
        });

        // 12.00 with 50 % VAT inside it holds 4.00 (2.00 at the committed 20 %)
        expect(order.amountTax).toBe(4);
    }));

    it("taxes checkout lines by the zones and product types its transaction sees", () => asCompany(async () => {
        await seedTill();
        const zone = (await TaxZone.findOne({name: "Home"}))!;
        const ebook = await seedProduct({price: 10});

        const tax = await runInTransaction(ctx.logger, async (session) => {
            await Product.updateOne({_id: ebook._id}, {$set: {type: "digital"}}, {session});
            await TaxZone.updateOne({_id: zone._id}, {$push: {rates: {name: "Digital", rate: 5, isCompound: false, appliesTo: "digital"}}}, {session});
            return calculateLinesTax([{product: ebook._id, totalPrice: 10}], 0, {country: String(zone.country)}, companyId, 2, session);
        });

        expect(tax).toEqual({amount: 2.5, breakdown: [{name: "VAT", rate: 20, amount: 2}, {name: "Digital", rate: 5, amount: 0.5}]});
    }));
});
