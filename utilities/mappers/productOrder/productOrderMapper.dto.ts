import type {IProductOrder, IProductOrderAddress,} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import type {ProductOrder, ProductOrderAddress,} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/productOrder.dto";
import {mapLifeCycleToDTO, mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";
import {mapPopulatedSimpleCurrency, mapPopulatedSimpleUser} from "@coreModule/utilities/mappers/common.mapper";

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
        country: addr.country ? {
            _id: addr.country?._id,
            name: addr.country?.name,
            code: addr.country?.code,
        } : undefined,
    };
}

export function productOrderToDTO(order: IProductOrder): ProductOrder {
    const currency = mapPopulatedSimpleCurrency(order.currency);

    return {
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        customer: mapPopulatedSimpleUser(order.customer) ?? {_id: "", name: "", surname: ""},
        email: order.email,
        phone: order.phone,
        items: order.items?.map((item) => {
            return {
                _id: item._id?.toString() ?? "",
                product: {
                    _id: item.product?._id?.toString(),
                    title: item.product?.title,
                    slug: item.product?.slug,
                    sku: item.product?.sku,
                },
                variant: item.variant ? {
                    _id: item.variant?._id?.toString(),
                    sku: item.variant.sku,
                    attributeCombination: item.variant.attributeCombination?.map((combo) => {
                        return {
                            attribute: {
                                name: combo.attribute.name
                            },
                            value: combo.value,
                        }
                    })
                } : undefined,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                snapshot: {
                    title: item.snapshot?.title ?? item.product?.title,
                    sku: item.snapshot?.sku,
                    imageUrl: item.snapshot?.imageUrl,
                },
                currency,
            }
        }) ?? undefined,
        subtotal: order.subtotal,
        discountTotal: order.discountTotal,
        shippingTotal: order.shippingTotal,
        taxTotal: order.taxTotal,
        grandTotal: order.grandTotal,
        currency,
        shippingAddress: mapAddress(order.shippingAddress),
        billingAddress: order.billingAddress ? mapAddress(order.billingAddress) : undefined,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        status: order.status,
        appliedDiscounts: order.appliedDiscounts?.map((appliedDiscount) => {
            return {
                discount: {
                    _id: appliedDiscount.discount._id.toString(),
                    title: appliedDiscount.discount.title,
                    code: appliedDiscount.code,
                },
                amount: appliedDiscount.amount,
            };
        }),
        taxBreakdown: order.taxBreakdown,
        shippingRate: order.shippingRate,
        notes: order.notes,
        internalNotes: order.internalNotes,
        timeline: order.timeline?.map(t => ({
            event: t.event,
            timestamp: t.timestamp?.toISOString(),
            user: mapPopulatedSimpleUser(t.userId),
            note: t.note,
        })),
        stripePaymentIntentId: order.stripePaymentIntentId,
        idempotencyKey: order.idempotencyKey,
        giftCard: order.giftCard ? {
            giftCard: order.giftCard ? {
                _id: order.giftCard.giftCard._id.toString(),
                code: order.giftCard.giftCard.code
            } : undefined,
            code: order.giftCard.code,
            amount: order.giftCard.amount
        } : undefined,
        ...mapLifeCycleToDTO(order),
        ...mapSoftDeleteToDTO(order),
        ...mapOwnershipToDTO(order),
    };
}

export function productOrdersToDTO(orders: IProductOrder[]): ProductOrder[] {
    return orders.map(productOrderToDTO);
}
