import type {IProductOrder, IProductOrderAddress} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import type {BuyerProductOrder, ProductOrder, ProductOrderAddress} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/productOrder.dto";
import type {CurrencySimple} from "armonia/src/modules/core/dto/currency.dto";
import type {CountrySimple} from "armonia/src/modules/core/dto/country.dto";
import type {SimpleBlankUser} from "armonia/src/modules/core/dto/user.dto";
import type {ProductSimple} from "armonia/src/modules/eCommerce/dto/product.dto";
import type {ProductVariantSimple} from "armonia/src/modules/eCommerce/dto/productVariant.dto";
import type {DiscountSimple} from "armonia/src/modules/eCommerce/dto/discount.dto";
import {mapLifeCycleToDTO, mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import {mapSnippet} from "@coreModule/utilities/mappers/common.mapper";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {CountrySimpleSnippet} from "@coreModule/database/schemas/country/country.snippets";
import {SimpleBlankUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";
import {DiscountSimpleSnippet} from "@eCommerceModule/database/schemas/discount/discount.snippets";

function mapAddress(addr: IProductOrderAddress | undefined): ProductOrderAddress | undefined {
    if (!addr) return undefined;
    return {
        firstName: addr.firstName,
        lastName: addr.lastName,
        phone: addr.phone,
        street: addr.street,
        city: addr.city,
        state: addr.state,
        postalCode: addr.postalCode,
        country: mapSnippet<CountrySimple>()(addr.country, CountrySimpleSnippet),
    };
}

export function productOrderToDTO(order: IProductOrder): ProductOrder {
    const currency = mapSnippet<CurrencySimple>()(order.currency, CurrencySimpleSnippet)!;

    return {
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        customer: mapSnippet<SimpleBlankUser>()(order.customer, SimpleBlankUserSnippet)!,
        email: order.email,
        phone: order.phone,
        items: order.items?.map((item) => ({
            _id: item._id?.toString() ?? "",
            product: mapSnippet<ProductSimple>()(item.product, ProductSimpleSnippet)!,
            variant: mapSnippet<ProductVariantSimple>()(item.variant, ProductVariantSimpleSnippet),
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            totalPrice: item.totalPrice,
            snapshot: {
                title: item.snapshot?.title ?? item.product?.title,
                sku: item.snapshot?.sku,
                imageUrl: item.snapshot?.imageUrl,
                variantLabel: item.snapshot?.variantLabel,
                productType: item.snapshot?.productType,
            },
            currency,
        })) ?? undefined,
        subtotal: order.subtotal,
        discountTotal: order.discountTotal,
        shippingTotal: order.shippingTotal,
        taxTotal: order.taxTotal,
        grandTotal: order.grandTotal,
        currency,
        currencyCode: order.currencyCode,
        shippingAddress: mapAddress(order.shippingAddress)!,
        billingAddress: order.billingAddress ? mapAddress(order.billingAddress) : undefined,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        status: order.status,
        appliedDiscounts: order.appliedDiscounts?.map((appliedDiscount) => {
            const discount = mapSnippet<DiscountSimple>()(appliedDiscount.discount, DiscountSimpleSnippet)!;
            return {
                discount: {
                    ...discount,
                    code: appliedDiscount.code ?? discount.code,
                },
                amount: appliedDiscount.amount,
            };
        }),
        taxBreakdown: order.taxBreakdown,
        shippingRate: order.shippingRate,
        notes: order.notes,
        internalNotes: order.internalNotes,
        timeline: order.timeline?.map((t) => ({
            event: t.event,
            timestamp: t.timestamp?.toISOString(),
            user: mapSnippet<SimpleBlankUser>()(t.userId, SimpleBlankUserSnippet),
            note: t.note,
        })),
        stripePaymentIntentId: order.stripePaymentIntentId,
        idempotencyKey: order.idempotencyKey,
        giftCard: order.giftCard ? {
            giftCard: order.giftCard.giftCard ? {
                _id: order.giftCard.giftCard._id.toString(),
                code: order.giftCard.giftCard.code,
            } : undefined,
            code: order.giftCard.code,
            amount: order.giftCard.amount,
        } : undefined,
        ...mapLifeCycleToDTO(order),
        ...mapSoftDeleteToDTO(order),
        ...mapOwnershipToDTO(order),
    };
}

/** Timeline events a buyer is shown; the rest (stock and gift-card shortfalls, restock notes) are for staff. */
const BUYER_TIMELINE_EVENTS = new Set([
    "order_placed", "payment_received", "order_confirmed", "order_processing", "order_partially_shipped", "order_shipped",
    "shipment_delivered", "shipment_failed", "order_delivered", "fulfilled", "order_cancelled", "order_refunded",
    "order_partially_refunded", "refunded",
]);

/** The order as its buyer may see it (storefront routes): staff-only fields and events are dropped. */
export function productOrderToBuyerDTO(order: IProductOrder): BuyerProductOrder {
    const {internalNotes, stripePaymentIntentId, idempotencyKey, paymentTransactions, timeline, ...dto} = productOrderToDTO(order);
    return {
        ...dto,
        timeline: timeline?.filter(entry => BUYER_TIMELINE_EVENTS.has(entry.event)).map(({event, timestamp}) => ({event, timestamp})),
    };
}

export function productOrdersToDTO(orders: IProductOrder[]): ProductOrder[] {
    return orders.map(productOrderToDTO);
}
