import {afterAll, beforeAll, beforeEach, describe, expect, it} from "vitest";
import {MongoMemoryServer} from "mongodb-memory-server";
import mongoose from "mongoose";
import {ObjectId} from "mongodb";
import PaymentTransaction from "@eCommerceModule/database/schemas/paymentTransaction/paymentTransaction";
import {paymentTransactionService} from "@eCommerceModule/database/schemas/paymentTransaction/paymentTransaction.service";

let mongod: MongoMemoryServer;

const companyId = new ObjectId();
const currencyId = new ObjectId();

beforeAll(async () => {
    mongod = await MongoMemoryServer.create();
    await mongoose.connect(mongod.getUri());
}, 120000);

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

beforeEach(async () => {
    await PaymentTransaction.deleteMany({});
});

async function createPendingCharge(gatewayTransactionId = "pi_test_123", amount = 100) {
    return paymentTransactionService.createPending(
        {
            checkout: new ObjectId(),
            gateway: "stripe",
            amount,
            currency: currencyId,
            gatewayTransactionId,
            company: companyId,
        },
        {},
    );
}

describe("paymentTransactionService", () => {
    it("createPending creates a pending charge", async () => {
        const tx = await createPendingCharge();
        expect(tx.type).toBe("charge");
        expect(tx.status).toBe("pending");
        expect(tx.refundedAmount).toBe(0);
    });

    it("markSucceeded flips a pending charge and is idempotent", async () => {
        await createPendingCharge("pi_abc");

        const updated = await paymentTransactionService.markSucceeded("pi_abc", {eventId: "evt_1"}, {});
        expect(updated!.status).toBe("succeeded");

        // Second call finds nothing pending — no state regression
        const again = await paymentTransactionService.markSucceeded("pi_abc", {eventId: "evt_2"}, {});
        expect(again).toBeNull();

        const row = await PaymentTransaction.findOne({gatewayTransactionId: "pi_abc"});
        expect(row!.status).toBe("succeeded");
        expect((row!.gatewayResponse as any).eventId).toBe("evt_1");
    });

    it("markFailed records the failure reason and only affects pending charges", async () => {
        await createPendingCharge("pi_fail");

        const failed = await paymentTransactionService.markFailed("pi_fail", "card_declined", undefined, {});
        expect(failed!.status).toBe("failed");
        expect(failed!.failureReason).toBe("card_declined");

        // A succeeded charge is not clobbered by a late failure event
        await createPendingCharge("pi_ok");
        await paymentTransactionService.markSucceeded("pi_ok", undefined, {});
        const notFailed = await paymentTransactionService.markFailed("pi_ok", "too_late", undefined, {});
        expect(notFailed).toBeNull();
    });

    it("recordRefund handles partial then full refunds with charge status transitions", async () => {
        const orderId = new ObjectId();
        const charge = await createPendingCharge("pi_refund", 100);
        await paymentTransactionService.markSucceeded("pi_refund", undefined, {});

        await paymentTransactionService.recordRefund(
            {
                order: orderId,
                chargeTransactionId: charge._id as ObjectId,
                gateway: "stripe",
                amount: 40,
                currency: currencyId,
                gatewayTransactionId: "re_1",
                company: companyId,
            },
            {},
        );

        let reloaded = await PaymentTransaction.findById(charge._id);
        expect(reloaded!.refundedAmount).toBe(40);
        expect(reloaded!.status).toBe("partially_refunded");

        await paymentTransactionService.recordRefund(
            {
                order: orderId,
                chargeTransactionId: charge._id as ObjectId,
                gateway: "stripe",
                amount: 60,
                currency: currencyId,
                gatewayTransactionId: "re_2",
                company: companyId,
            },
            {},
        );

        reloaded = await PaymentTransaction.findById(charge._id);
        expect(reloaded!.refundedAmount).toBe(100);
        expect(reloaded!.status).toBe("refunded");

        const refunds = await PaymentTransaction.find({order: orderId, type: "refund"});
        expect(refunds).toHaveLength(2);
        expect(refunds.every(r => r.status === "succeeded")).toBe(true);
    });
});
