import type {PaymentGateway} from "@financeModule/database/schemas/paymentTransaction/paymentTransaction";
import type {CheckoutPaymentMethod} from "@eCommerceModule/database/schemas/checkout/checkout";
import {stripeAdapter} from "@financeModule/utilities/services/payment/stripeAdapter";
import type {PaymentProviderAdapter} from "@financeModule/utilities/services/payment/paymentProvider.types";

/**
 * Facade over payment gateway adapters. Checkout, the payments webhook, and
 * the productOrder refund action resolve their adapter here — nothing else
 * imports a gateway SDK.
 */

const adapters: Partial<Record<PaymentGateway, PaymentProviderAdapter>> = {
    stripe: stripeAdapter,
    // PayPal: paypalAdapter — add when the PayPal adapter lands
};

/** Payment methods settled offline: no gateway adapter, order starts unpaid. */
const OFFLINE_METHODS: CheckoutPaymentMethod[] = ["cod", "bank_transfer"];

export function isOfflinePaymentMethod(method: CheckoutPaymentMethod): boolean {
    return OFFLINE_METHODS.includes(method);
}

export function paymentMethodToGateway(method: CheckoutPaymentMethod): PaymentGateway {
    if (method === "stripe") return "stripe";
    if (method === "paypal") return "paypal";
    return "manual";
}

export function getPaymentAdapter(gateway: PaymentGateway): PaymentProviderAdapter | null {
    return adapters[gateway] ?? null;
}

/** Adapter for the gateway, or null when the method is offline / unconfigured. */
export function getAdapterForMethod(method: CheckoutPaymentMethod): PaymentProviderAdapter | null {
    if (isOfflinePaymentMethod(method)) return null;
    return getPaymentAdapter(paymentMethodToGateway(method));
}
