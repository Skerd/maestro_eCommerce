/**
 * Escrow helper - creates EscrowTransaction records when order status changes.
 * Tracks hold, release, fee, and refund for eCommerce orders.
 */

import { ObjectId } from "mongodb";
import {
    escrowTransactionService,
    SERVICE_FEE_PERCENT,
} from "@eCommerceModule/database/schemas/escrowTransaction/escrowTransaction.service";
import type { CrudOptions } from "@coreModule/database/services";

type EscrowContext = CrudOptions & { auditUserId: ObjectId | string };

export async function createEscrowHold(
    orderId: ObjectId,
    amount: number,
    currencyId: ObjectId,
    companyId: ObjectId,
    ctx: EscrowContext
): Promise<void> {
    await escrowTransactionService.create(
        {
            order: orderId,
            amount,
            currency: currencyId,
            type: "hold",
            status: "completed",
            company: companyId,
        } as any,
        ctx
    );
}

export async function createEscrowReleaseAndFee(
    orderId: ObjectId,
    totalAmount: number,
    currencyId: ObjectId,
    companyId: ObjectId,
    ctx: EscrowContext
): Promise<void> {
    const feeAmount = Math.round((totalAmount * SERVICE_FEE_PERCENT) / 100 * 100) / 100;
    const providerAmount = totalAmount - feeAmount;

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
    await escrowTransactionService.create(
        {
            order: orderId,
            amount,
            currency: currencyId,
            type: "refund",
            status: "completed",
            company: companyId,
            recipient: "customer",
        } as any,
        ctx
    );
}
