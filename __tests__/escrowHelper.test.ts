import {afterAll, beforeAll, beforeEach, describe, expect, it} from "vitest";
import {MongoMemoryServer} from "mongodb-memory-server";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import EscrowTransaction from "@eCommerceModule/database/schemas/escrowTransaction/escrowTransaction";
import {createEscrowHold, createEscrowRefund, createEscrowReleaseAndFee} from "@eCommerceModule/utilities/escrowHelper";

let mongod: MongoMemoryServer;

const companyId = new ObjectId();
const currencyId = new ObjectId();
const auditUserId = new ObjectId();

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
}, 120000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

beforeEach(async () => {
    await EscrowTransaction.deleteMany({});
});

// STRIPE_ENABLED is false in tests — helpers must degrade to ledger-only rows.
describe("escrowHelper (ledger-only degradation)", () => {
    it("createEscrowHold writes a completed ledger_only hold", async () => {
        const orderId = new ObjectId();
        await createEscrowHold(orderId, 250, currencyId, companyId, {auditUserId});

        const hold = await EscrowTransaction.findOne({order: orderId, type: "hold"});
        expect(hold).not.toBeNull();
        expect(hold!.status).toBe("completed");
        expect(hold!.gatewayStatus).toBe("ledger_only");
        expect(hold!.amount).toBe(250);
        expect(hold!.gatewayPaymentIntentId).toBeUndefined();
    });

    it("createEscrowReleaseAndFee splits 10% fee and keeps ledger_only without a provider account", async () => {
        const orderId = new ObjectId();
        await createEscrowHold(orderId, 100, currencyId, companyId, {auditUserId});
        await createEscrowReleaseAndFee(orderId, 100, currencyId, companyId, {auditUserId});

        const release = await EscrowTransaction.findOne({order: orderId, type: "release"});
        const fee = await EscrowTransaction.findOne({order: orderId, type: "fee"});

        expect(release!.amount).toBe(90);
        expect(release!.recipient).toBe("provider");
        expect(release!.gatewayStatus).toBe("ledger_only");
        expect(fee!.amount).toBe(10);
        expect(fee!.recipient).toBe("platform");
    });

    it("createEscrowRefund writes a customer refund row", async () => {
        const orderId = new ObjectId();
        await createEscrowHold(orderId, 60, currencyId, companyId, {auditUserId});
        await createEscrowRefund(orderId, 60, currencyId, companyId, {auditUserId});

        const refund = await EscrowTransaction.findOne({order: orderId, type: "refund"});
        expect(refund!.amount).toBe(60);
        expect(refund!.recipient).toBe("customer");
        expect(refund!.gatewayStatus).toBe("ledger_only");
    });

    it("transfer is skipped even with a provider account when the hold never settled", async () => {
        const orderId = new ObjectId();
        await createEscrowHold(orderId, 100, currencyId, companyId, {auditUserId});
        // Simulate a paid hold NOT existing: gatewayStatus stays ledger_only,
        // so even a provider with an account gets a ledger-only release.
        await createEscrowReleaseAndFee(orderId, 100, currencyId, companyId, {auditUserId}, {providerStripeAccountId: "acct_test"});

        const release = await EscrowTransaction.findOne({order: orderId, type: "release"});
        expect(release!.gatewayStatus).toBe("ledger_only");
        expect(release!.gatewayTransferId).toBeUndefined();
    });
});
