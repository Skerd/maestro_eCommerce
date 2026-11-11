import {afterAll, beforeAll, describe, expect, it, vi} from "vitest";
import {connectTestDatabase, disconnectTestDatabase} from "@coreModule/_tests/testDatabase";
import {ObjectId} from "mongodb";
import {getLogger} from "@coreModule/loggers/serverLog";

// The demo customer is never emailed from a test
vi.mock("@eCommerceModule/utilities/services/productOrderNotify", () => ({
    notifyProductOrderCustomer: vi.fn(async () => undefined),
    notifyMerchantsNewOrder: vi.fn(async () => undefined),
    notifyMerchantsLowStock: vi.fn(async () => undefined),
    notifyAbandonedCartEmail: vi.fn(async () => undefined),
}));

import Currency from "@coreModule/database/schemas/currency/currency";
import User from "@coreModule/database/schemas/user/user";
import type {ICompany} from "@coreModule/database/schemas/company/company";
import {defaultCompaniesValues} from "@coreModule/database/schemas/company/company.defaults";
import {withTenant} from "@coreModule/utilities/endpoints/tenantScope";
import PaymentTransaction from "@financeModule/database/schemas/paymentTransaction/paymentTransaction";
import Product from "@eCommerceModule/database/schemas/product/product";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import InventoryMovement from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import ReturnRequest from "@eCommerceModule/database/schemas/returnRequest/returnRequest";
import StockCount from "@eCommerceModule/database/schemas/stockCount/stockCount";
import StockTransfer from "@eCommerceModule/database/schemas/stockTransfer/stockTransfer";
import PosConfig from "@eCommerceModule/database/schemas/posConfig/posConfig";
import PosSession from "@eCommerceModule/database/schemas/posSession/posSession";
import PosOrder from "@eCommerceModule/database/schemas/posOrder/posOrder";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import {createWarehouses} from "@eCommerceModule/database/schemas/warehouse/warehouse.defaults";
import {createProductOrders} from "@eCommerceModule/database/schemas/productOrder/productOrder.defaults";
import {createReturnRequests} from "@eCommerceModule/database/schemas/returnRequest/returnRequest.defaults";
import {createInventoryMovements} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.defaults";
import {createPosPaymentMethods} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod.defaults";
import {createPosConfigs} from "@eCommerceModule/database/schemas/posConfig/posConfig.defaults";
import {
    seedECommerceStateCoverage,
    STATE_COVERAGE_PRODUCT_KEYS,
} from "@eCommerceModule/database/demo/eCommerceStateCoverage.demo";
import type {CreateProductsResult} from "@eCommerceModule/database/schemas/product/product.defaults";

const logger = getLogger("ecommerce_demo_seed_test");
const userId = new ObjectId();
const company = {
    _id: new ObjectId(),
    name: "Arpeggio Market",
    createdBy: userId,
} as unknown as ICompany;
/** The seed fills this company's data, as its setup does (D16); the checks read it as the company. */
const asCompany = <T>(fn: () => PromiseLike<T>): Promise<T> => withTenant(company._id, fn);

const STOCK: Record<string, {price: number; stock: number}> = {
    "prod-02-hoodie": {price: 69, stock: 42},
    [STATE_COVERAGE_PRODUCT_KEYS.mouse]: {price: 79, stock: 80},
    [STATE_COVERAGE_PRODUCT_KEYS.keyboard]: {price: 129, stock: 55},
    [STATE_COVERAGE_PRODUCT_KEYS.caseKit]: {price: 39.9, stock: 120},
};
/** Every model in the list has a `countDocuments`; each is called on its own model so the overloads resolve. */
const countOf = (model: {countDocuments: (filter: object) => {exec: () => Promise<number>}}) => model.countDocuments({}).exec();
const MODELS = [ReturnRequest, StockCount, StockTransfer, PosConfig, PosSession, PosOrder, InventoryMovement, Inventory, ProductOrder, PaymentTransaction];
const counts = async () =>
    Object.fromEntries(await Promise.all(MODELS.map(async (model) => [model.modelName, await await countOf(model)])));
const stockLevels = async () =>
    (await Inventory.find({}).sort({_id: 1})).map((row) => [String(row.product), String(row.warehouse), row.quantityOnHand, row.quantityReserved]);

/** The parts of the shop's demo the coverage builds on, from their own writers, then the coverage itself. */
async function seedShop() {
    const currency = await Currency.findOne({abbreviation: "EUR"});
    const warehouses = await createWarehouses(logger, company, {}, defaultCompaniesValues.address);
    const bySeedKey: CreateProductsResult["bySeedKey"] = {};
    for (const [seedKey, {price}] of Object.entries(STOCK)) {
        bySeedKey[seedKey] =
            (await Product.findOne({slug: seedKey})) ??
            (await Product.create([{title: seedKey, slug: seedKey, sku: seedKey.toUpperCase(), type: "physical", status: "active", price, trackInventory: true, company: company._id}]))[0];
    }
    const products = {bySeedKey};
    for (const [seedKey, {stock}] of Object.entries(STOCK)) {
        const filter = {product: bySeedKey[seedKey]._id, warehouse: warehouses.primaryWarehouseId};
        if (!(await Inventory.exists(filter))) await Inventory.create({...filter, quantityOnHand: stock, quantityReserved: 0, company: company._id});
    }
    const hoodieInventory = await Inventory.findOne({product: bySeedKey["prod-02-hoodie"]._id});
    await createInventoryMovements(logger, company, products, warehouses.primaryWarehouseId, {rows: [], hoodieInventory: hoodieInventory ?? undefined});
    const orders = await createProductOrders(logger, company, currency!._id, products, userId, {}, defaultCompaniesValues.address);
    await createReturnRequests(logger, company, orders);
    const posMethods = await createPosPaymentMethods(logger, company);
    const posConfig = await createPosConfigs(logger, company, currency!._id, posMethods, warehouses.primaryWarehouseId, undefined);

    await seedECommerceStateCoverage(undefined, company, {
        currencyId: currency!._id,
        cashierId: userId,
        products,
        warehouses,
        posConfig,
        posMethods,
        orders,
    });
}

beforeAll(async () => {
    await connectTestDatabase();
    await asCompany(async () => {
        await Currency.create({name: "Euro", symbol: "€", abbreviation: "EUR", decimalPlaces: 2, company: company._id});
        await User.collection.insertOne({_id: userId, username: "echo@echo.com", name: "echo", surname: "silence", companies: [company._id]});
    });
}, 120000);

afterAll(async () => {
    await disconnectTestDatabase();
});

describe("eCommerce demo seed: every state", () => {
    it("seeds returns, till shifts and sales, stock movements, counts and transfers in each state", () => asCompany(async () => {
        await seedShop();

        const returnStatuses = (await ReturnRequest.find({}).select("status")).map((request) => request.status);
        expect(new Set(returnStatuses)).toEqual(new Set(["pending", "approved", "rejected", "received", "completed"]));

        expect(new Set((await PosSession.find({}).select("state")).map((session) => session.state)))
            .toEqual(new Set(["opened", "closing_control", "closed"]));
        // The closed shift has its cash moves and closed a little short, with the reason on it
        const closed = await PosSession.findOne({notes: /pos-shift-closed/});
        expect(closed!.state).toBe("closed");
        expect(closed!.cashMoves.map((move) => move.type)).toEqual(["in", "out"]);
        expect(closed!.closingBalance).toBe(closed!.expectedCash - 2);
        expect(closed!.notes).toMatch(/Two coins short/);

        const orders = await PosOrder.find({});
        expect(new Set(orders.map((order) => order.state))).toEqual(new Set(["paid", "refunded", "cancel", "draft"]));
        // Two refund orders (one full, one partial); the partly refunded sale stays paid with its refund on it
        expect(orders.filter((order) => order.isRefund)).toHaveLength(2);
        expect(orders.some((order) => !order.isRefund && order.state === "paid" && (order.amountRefunded ?? 0) > 0)).toBe(true);
        expect(orders.filter((order) => order.fiscalError)).toHaveLength(1);
        // Every sale carries the till's currency
        const currency = await Currency.findOne({abbreviation: "EUR"});
        expect(orders.every((order) => String(order.currency) === String(currency!._id))).toBe(true);
        // Each sale went through the till: its order and its ledger charge exist
        expect(await ProductOrder.countDocuments({idempotencyKey: /^pos:/})).toBe(orders.filter((order) => order.state !== "draft" && order.state !== "cancel" && !order.isRefund).length);
        expect(await PaymentTransaction.countDocuments({type: "refund"})).toBe(2);

        for (const status of ["draft", "applied", "cancelled"]) {
            expect(await StockCount.countDocuments({status})).toBe(1);
        }
        for (const status of ["draft", "done", "cancelled"]) {
            expect(await StockTransfer.countDocuments({status})).toBe(1);
        }
        const reasons = new Set((await InventoryMovement.find({}).select("reason")).map((move) => move.reason));
        expect(reasons).toEqual(new Set(["initial", "restock", "sale", "return", "adjustment", "damage", "write_off", "transfer_in", "transfer_out"]));

        // Stock follows its movements: what is on hand is the seeded stock plus every movement since
        const primary = await Warehouse.findOne({code: "CEN-MAIN"});
        for (const key of Object.values(STATE_COVERAGE_PRODUCT_KEYS)) {
            const product = await Product.findOne({slug: key});
            const row = await Inventory.findOne({product: product!._id, warehouse: primary!._id});
            const moves = await InventoryMovement.find({product: product!._id, warehouse: primary!._id});
            const moved = moves.reduce((sum, move) => sum + move.quantity, 0);
            expect(row!.quantityOnHand).toBe(STOCK[key].stock + moved);
        }
        // The done transfer opened the overflow warehouse's rows
        expect(await Inventory.countDocuments({warehouse: {$ne: primary!._id}})).toBe(2);
    }), 300000);

    it("changes nothing when it runs again", () => asCompany(async () => {
        const before = await counts();
        const stock = await stockLevels();
        await seedShop();
        expect(await counts()).toEqual(before);
        expect(await stockLevels()).toEqual(stock);
    }), 300000);
});
