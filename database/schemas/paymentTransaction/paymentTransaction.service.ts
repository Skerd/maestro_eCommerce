import {ObjectId} from "mongodb";
import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import PaymentTransaction, {IPaymentTransaction, PaymentGateway} from "@eCommerceModule/database/schemas/paymentTransaction/paymentTransaction";
import type {CrudOptions} from "@coreModule/database/services";

/**
 * PaymentTransactions are system-generated: the CRUD router keeps write/delete
 * rate limits at 0 so admins can only read. Every write goes through the
 * methods below, called from the checkout /payment route, the payments
 * webhook, and the productOrder refund action.
 */
export class PaymentTransactionService extends BaseCrudService<IPaymentTransaction, typeof PaymentTransaction> {
    constructor() {
        super(PaymentTransaction, "PaymentTransaction");
    }

    /** Record a pending charge initiated from a checkout (before gateway confirmation). */
    async createPending(
        data: {
            checkout?: ObjectId;
            order?: ObjectId;
            gateway: PaymentGateway;
            amount: number;
            currency: ObjectId;
            gatewayTransactionId?: string;
            metadata?: Record<string, unknown>;
            company: ObjectId;
        },
        opts: CrudOptions & {auditUserId?: ObjectId | string},
    ): Promise<IPaymentTransaction> {
        return this.create(
            {
                ...data,
                type: "charge",
                status: "pending",
                refundedAmount: 0,
            } as any,
            opts,
        );
    }

    /** Mark a charge as succeeded (webhook / gateway confirmation). Idempotent. */
    async markSucceeded(
        gatewayTransactionId: string,
        gatewayResponse: Record<string, unknown> | undefined,
        opts: CrudOptions,
    ): Promise<IPaymentTransaction | null> {
        return PaymentTransaction.findOneAndUpdate(
            {gatewayTransactionId, type: "charge", status: {$in: ["pending", "failed"]}},
            {$set: {status: "succeeded", ...(gatewayResponse ? {gatewayResponse} : {})}},
            {new: true, session: opts.session},
        );
    }

    /** Mark a charge as failed with the gateway's failure reason. Idempotent. */
    async markFailed(
        gatewayTransactionId: string,
        failureReason: string | undefined,
        gatewayResponse: Record<string, unknown> | undefined,
        opts: CrudOptions,
    ): Promise<IPaymentTransaction | null> {
        return PaymentTransaction.findOneAndUpdate(
            {gatewayTransactionId, type: "charge", status: "pending"},
            {$set: {status: "failed", ...(failureReason ? {failureReason} : {}), ...(gatewayResponse ? {gatewayResponse} : {})}},
            {new: true, session: opts.session},
        );
    }

    /**
     * Record a refund against an order: creates a refund transaction row and
     * increments refundedAmount on the original charge.
     */
    async recordRefund(
        data: {
            order: ObjectId;
            chargeTransactionId: ObjectId;
            gateway: PaymentGateway;
            amount: number;
            currency: ObjectId;
            gatewayTransactionId?: string;
            metadata?: Record<string, unknown>;
            company: ObjectId;
        },
        opts: CrudOptions & {auditUserId?: ObjectId | string},
    ): Promise<IPaymentTransaction> {
        const {chargeTransactionId, ...refundData} = data;

        const refund = await this.create(
            {
                ...refundData,
                type: "refund",
                status: "succeeded",
                refundedAmount: 0,
            } as any,
            opts,
        );

        const charge = await PaymentTransaction.findOneAndUpdate(
            {_id: chargeTransactionId, type: "charge"},
            {$inc: {refundedAmount: data.amount}},
            {new: true, session: opts.session},
        );

        if (charge) {
            const fullyRefunded = charge.refundedAmount >= charge.amount;
            await PaymentTransaction.updateOne(
                {_id: charge._id},
                {$set: {status: fullyRefunded ? "refunded" : "partially_refunded"}},
                {session: opts.session},
            );
        }

        return refund;
    }
}

export const paymentTransactionService = new PaymentTransactionService();
