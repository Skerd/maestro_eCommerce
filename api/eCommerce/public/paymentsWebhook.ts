import {Router} from "express";
import {asyncHandler} from "@coreModule/utilities/middlewares/asyncHandler";
import authMW from "@coreModule/utilities/middlewares/authMW";
import {rateLimiter} from "@coreModule/utilities/middlewares/rateLimiter";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import Checkout, {ICheckout} from "@eCommerceModule/database/schemas/checkout/checkout";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {fulfillOrderPaidExtras} from "@eCommerceModule/utilities/services/orderPaidFulfillmentService";
import {
    assertIntentMatchesCheckout,
    placePaidCheckoutInBackground,
} from "@eCommerceModule/utilities/services/checkoutPlacementService";
import {notifyProductOrderCustomer} from "@eCommerceModule/utilities/services/productOrderNotify";
import {handleStripeWebhook} from "@financeModule/utilities/services/payment/stripeWebhook";
import {registerPaymentSourceHandler} from "@financeModule/utilities/services/payment/paymentSourceHandlers";

export const basePath = "/api/eCommerce/paymentsWebhook";
/** Opt into raw body retention for Stripe signature verification. */
export const needsRawBody = true;
export const router = Router();

/**
 * Settles a succeeded payment for a checkout. When the buyer never reached
 * /confirm (closed tab, redirect-based payment, network error) the order is
 * placed here, so captured money always ends up as an order. An order that
 * already exists unpaid is marked paid.
 */
async function applyPaymentSucceeded(checkout: ICheckout, ctx: {logger: any; languageCode: string}): Promise<void> {
    const companyId = (checkout.company as any)?._id ?? (checkout.company as any);

    const order = await ProductOrder.findOne({idempotencyKey: checkout.idempotencyKey, company: companyId});
    if (!order) {
        await placePaidCheckoutInBackground(checkout._id as any, ctx);
        return;
    }

    if (order.paymentStatus === "unpaid") {
        order.paymentStatus = "paid";
        if (order.status === "pending") order.status = "confirmed";
        (order.timeline as any[]).push({event: "payment_received", timestamp: new Date()});
        await order.save();

        await fulfillOrderPaidExtras(order, ctx);

        await notifyProductOrderCustomer(NotificationEventCodes.PRODUCT_ORDER_PAID, {
            companyId,
            languageCode: ctx.languageCode,
            order,
            extra: {grandTotal: order.grandTotal},
        });
    }
}

/**
 * Settles the commercial side of a checkout charge once finance's Stripe webhook
 * has recorded it. A charge's ledger row starts as `checkout` and moves to
 * `productOrder` when the order is placed, so both route here.
 */
registerPaymentSourceHandler(["checkout", "productOrder"], {
    async succeeded(intent, ctx) {
        const checkout = await Checkout.findOne({stripePaymentIntentId: intent.id});
        if (!checkout) return;
        try {
            await assertIntentMatchesCheckout(checkout, intent, ctx);
        } catch {
            // Logged inside; the charge is recorded but no order is auto-placed
            return;
        }
        await applyPaymentSucceeded(checkout, ctx);
    },

    async failed(intent, {languageCode}) {
        const checkout = await Checkout.findOne({stripePaymentIntentId: intent.id});
        if (!checkout) return;
        if (checkout.status === "payment_processing") {
            checkout.status = "pending"; // buyer can retry with another method
            await checkout.save();
        }
        const companyId = ((checkout.company as any)?._id ?? checkout.company)?.toString?.() ?? "";
        const order = await ProductOrder.findOne({
            idempotencyKey: checkout.idempotencyKey,
            company: checkout.company,
        }).select("_id orderNumber customer email grandTotal currency");
        const customerId =
            ((order?.customer as any)?._id ?? order?.customer)?.toString?.()
            || ((checkout.user as any)?._id ?? checkout.user)?.toString?.()
            || "";
        if (companyId && (customerId || order?.email)) {
            await notifyProductOrderCustomer(NotificationEventCodes.PRODUCT_ORDER_PAYMENT_FAILED, {
                companyId,
                languageCode,
                order,
                customerId: customerId || undefined,
                orderEmail: order?.email,
                extra: {failureReason: intent.failureReason ?? "", checkoutId: checkout._id.toString()},
            });
        }
    },
});

/**
 * The original Stripe webhook URL, kept so existing Stripe endpoint settings keep
 * working. Same handler as `/api/finance/paymentsWebhook/stripe`.
 */
router.post(
    "/stripe",
    authMW("public"),
    rateLimiter({windowMs: 60000, max: 120}),
    asyncHandler(async (params: any, _queryParams: any, req: any) => handleStripeWebhook(params, req)),
);
