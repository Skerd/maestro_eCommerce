/**
 * Escrow helper - creates EscrowTransaction records when order status changes.
 * Tracks hold, release, fee, and refund for eCommerce orders.
 *
 * When Stripe is configured the ledger rows are mirrored by real gateway
 * objects: hold → PaymentIntent the customer completes, release → Connect
 * transfer to the provider, refund → PaymentIntent refund. Without Stripe the
 * helpers degrade to the original ledger-only behavior (gatewayStatus
 * "ledger_only"), so dev/test environments keep working unchanged.
 */

import { ObjectId } from "mongodb";
import Currency from "@coreModule/database/schemas/currency/currency";
import EscrowTransaction from "@eCommerceModule/database/schemas/escrowTransaction/escrowTransaction";
import {
    escrowTransactionService,
    SERVICE_FEE_PERCENT,
} from "@eCommerceModule/database/schemas/escrowTransaction/escrowTransaction.service";
import { stripeAdapter } from "@eCommerceModule/utilities/services/payment/stripeAdapter";
import { stripeConnectAdapter } from "@eCommerceModule/utilities/services/payment/stripeConnectAdapter";
import type { CrudOptions } from "@coreModule/database/services";

type EscrowContext = CrudOptions & { auditUserId: ObjectId | string };

export type EscrowReleaseGateway = {
    /** Provider's Stripe Connect account id; transfer is skipped when absent. */
    providerStripeAccountId?: string;
};

async function currencyCodeOf(currencyId: ObjectId, session: CrudOptions["session"]): Promise<string | null> {
    const currency: any = await Currency.findById(currencyId, { abbreviation: 1 }).session(session ?? null);
    return currency?.abbreviation ?? null;
}

function transferGroupFor(orderId: ObjectId): string {
    return `marketplace-order-${orderId.toString()}`;
}

export async function createEscrowHold(
    orderId: ObjectId,
    amount: number,
    currencyId: ObjectId,
    companyId: ObjectId,
    ctx: EscrowContext
): Promise<void> {
    let gateway: {gatewayStatus: string; gatewayPaymentIntentId?: string; stripeClientSecret?: string} = {
        gatewayStatus: "ledger_only",
    };

    if (stripeAdapter.isEnabled()) {
        const currencyCode = await currencyCodeOf(currencyId, ctx.session);
        if (currencyCode) {
            try {
                const intent = await stripeAdapter.createPaymentIntent({
                    amount,
                    currencyCode,
                    metadata: {
                        marketplaceOrderId: orderId.toString(),
                        companyId: companyId.toString(),
                    },
                    idempotencyKey: `escrow-hold-${orderId.toString()}`,
                });
                gateway = {
                    gatewayStatus: "pending",
                    gatewayPaymentIntentId: intent.id,
                    stripeClientSecret: intent.clientSecret,
                };
            } catch (e: any) {
                ctx.logger?.warn?.(`Escrow hold PaymentIntent failed for order ${orderId}: ${e.message}`);
                gateway = {gatewayStatus: "failed"};
            }
        }
    }

    await escrowTransactionService.create(
        {
            order: orderId,
            amount,
            currency: currencyId,
            type: "hold",
            status: "completed",
            company: companyId,
            ...gateway,
        } as any,
        ctx
    );
}

export async function createEscrowReleaseAndFee(
    orderId: ObjectId,
    totalAmount: number,
    currencyId: ObjectId,
    companyId: ObjectId,
    ctx: EscrowContext,
    gateway?: EscrowReleaseGateway
): Promise<void> {
    const feeAmount = Math.round((totalAmount * SERVICE_FEE_PERCENT) / 100 * 100) / 100;
    const providerAmount = totalAmount - feeAmount;

    // Real transfer only when the customer's hold actually settled and the
    // provider has completed Connect onboarding; otherwise ledger-only.
    let releaseGateway: {gatewayStatus: string; gatewayTransferId?: string} = {gatewayStatus: "ledger_only"};

    if (stripeConnectAdapter.isEnabled() && gateway?.providerStripeAccountId) {
        const hold = await EscrowTransaction.findOne(
            {order: orderId, type: "hold", company: companyId},
            {gatewayStatus: 1, gatewayPaymentIntentId: 1},
            {session: ctx.session},
        );

        if (hold?.gatewayStatus === "succeeded") {
            const currencyCode = await currencyCodeOf(currencyId, ctx.session);
            if (currencyCode) {
                try {
                    const transferId = await stripeConnectAdapter.createTransfer({
                        amount: providerAmount,
                        currencyCode,
                        destinationAccountId: gateway.providerStripeAccountId,
                        transferGroup: transferGroupFor(orderId),
                        metadata: {marketplaceOrderId: orderId.toString()},
                        idempotencyKey: `escrow-release-${orderId.toString()}`,
                    });
                    releaseGateway = {gatewayStatus: "succeeded", gatewayTransferId: transferId};
                } catch (e: any) {
                    ctx.logger?.warn?.(`Escrow release transfer failed for order ${orderId}: ${e.message}`);
                    releaseGateway = {gatewayStatus: "failed"};
                }
            }
        }
    }

    await Promise.all([
        escrowTransactionService.create(
            {
                order: orderId,
                amount: providerAmount,
                currency: currencyId,
                type: "release",
                status: "completed",
                company: companyId,
                recipient: "provider",
                ...releaseGateway,
            } as any,
            ctx
        ),
        feeAmount > 0
            ? escrowTransactionService.create(
                  {
                      order: orderId,
                      amount: feeAmount,
                      currency: currencyId,
                      type: "fee",
                      status: "completed",
                      company: companyId,
                      recipient: "platform",
                      // The fee is what remains on the platform account after the transfer
                      gatewayStatus: releaseGateway.gatewayStatus,
                  } as any,
                  ctx
              )
            : Promise.resolve(),
    ]);
}

export async function createEscrowRefund(
    orderId: ObjectId,
    amount: number,
    currencyId: ObjectId,
    companyId: ObjectId,
    ctx: EscrowContext
): Promise<void> {
    let refundGateway: {gatewayStatus: string; gatewayRefundId?: string} = {gatewayStatus: "ledger_only"};

    if (stripeAdapter.isEnabled()) {
        const hold = await EscrowTransaction.findOne(
            {order: orderId, type: "hold", company: companyId},
            {gatewayStatus: 1, gatewayPaymentIntentId: 1, amount: 1},
            {session: ctx.session},
        );

        if (hold?.gatewayStatus === "succeeded" && hold.gatewayPaymentIntentId) {
            const currencyCode = await currencyCodeOf(currencyId, ctx.session);
            try {
                const result = await stripeAdapter.createRefund({
                    gatewayTransactionId: hold.gatewayPaymentIntentId,
                    // Full-hold refunds omit amount so the gateway refunds everything
                    amount: amount < hold.amount ? amount : undefined,
                    currencyCode: currencyCode ?? "usd",
                    idempotencyKey: `escrow-refund-${orderId.toString()}-${Math.round(amount * 100)}`,
                });
                refundGateway = {gatewayStatus: "succeeded", gatewayRefundId: result.id};
            } catch (e: any) {
                ctx.logger?.warn?.(`Escrow refund failed for order ${orderId}: ${e.message}`);
                refundGateway = {gatewayStatus: "failed"};
            }
        }
    }

    await escrowTransactionService.create(
        {
            order: orderId,
            amount,
            currency: currencyId,
            type: "refund",
            status: "completed",
            company: companyId,
            recipient: "customer",
            ...refundGateway,
        } as any,
        ctx
    );
}
