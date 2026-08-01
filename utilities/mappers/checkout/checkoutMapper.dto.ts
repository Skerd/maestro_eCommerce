import type {ICheckout, ICheckoutAddress, ICheckoutItem} from "@eCommerceModule/database/schemas/checkout/checkout";
import type {
    Checkout,
    CheckoutAddress,
    CheckoutItem,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/checkout/checkout.dto";
import {dateToISOString, objectIdToString} from "@coreModule/utilities/mappers/common.mapper";

function checkoutAddressToDTO(address?: ICheckoutAddress): CheckoutAddress | undefined {
    if (!address) return undefined;
    return {
        firstName: address.firstName,
        lastName: address.lastName,
        phone: address.phone,
        street: address.street,
        city: address.city,
        state: address.state,
        postalCode: address.postalCode,
        country: address.country
            ? objectIdToString((address.country as any)?._id ?? address.country)
            : undefined,
    };
}

function checkoutItemToDTO(item: ICheckoutItem): CheckoutItem {
    return {
        product: objectIdToString((item.product as any)?._id ?? item.product),
        variant: item.variant
            ? objectIdToString((item.variant as any)?._id ?? item.variant)
            : undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        snapshot: item.snapshot,
    };
}

export function checkoutToDTO(checkout: ICheckout): Checkout {
    return {
        _id: checkout._id.toString(),
        status: checkout.status,
        items: (checkout.items ?? []).map(checkoutItemToDTO),
        shippingAddress: checkoutAddressToDTO(checkout.shippingAddress),
        billingAddress: checkoutAddressToDTO(checkout.billingAddress),
        availableShippingRates: checkout.availableShippingRates ?? [],
        selectedShippingRate: checkout.selectedShippingRate,
        subtotal: checkout.subtotal ?? 0,
        discountTotal: checkout.discountTotal ?? 0,
        shippingTotal: checkout.shippingTotal ?? 0,
        taxTotal: checkout.taxTotal ?? 0,
        grandTotal: checkout.grandTotal ?? 0,
        giftCard: checkout.giftCard
            ? {code: checkout.giftCard.code, amount: checkout.giftCard.amount}
            : undefined,
        paymentMethod: checkout.paymentMethod,
        stripeClientSecret: checkout.stripeClientSecret,
        expiresAt: dateToISOString(checkout.expiresAt) || undefined,
    };
}

export function checkoutsToDTO(checkouts: ICheckout[]): Checkout[] {
    return checkouts.map(checkoutToDTO);
}
