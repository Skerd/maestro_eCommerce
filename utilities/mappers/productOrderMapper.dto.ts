import type {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import type {ProductOrder} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/productOrder.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

function mapAddress(addr: any) {
    if (!addr) return undefined;
    return {
        firstName: addr.firstName ?? "",
        lastName: addr.lastName ?? "",
        phone: addr.phone,
        street: addr.street ?? "",
        city: addr.city ?? "",
        state: addr.state,
        postalCode: addr.postalCode,
        country: {
            _id: addr.country?._id?.toString() ?? addr.country?.toString() ?? "",
            name: addr.country?.name ?? "",
            code: addr.country?.code ?? "",
        },
    };
}

export function productOrderToDTO(order: IProductOrder): ProductOrder {
    const customer = order.customer as any;
    const currency = order.currency as any;

    const items = ((order.items as any[]) ?? []).map(item => ({
        _id: item._id?.toString() ?? "",
        product: {
            _id: item.product?._id?.toString() ?? item.product?.toString() ?? "",
            title: item.product?.title ?? "",
            slug: item.product?.slug ?? "",
            sku: item.product?.sku,
        },
        variant: item.variant ? {
            _id: item.variant._id?.toString() ?? item.variant.toString() ?? "",
            sku: item.variant.sku,
            attributeCombination: item.variant.attributeCombination,
        } : undefined,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        snapshot: {
            title: item.snapshot?.title ?? item.product?.title ?? "",
            sku: item.snapshot?.sku,
            imageUrl: item.snapshot?.imageUrl,
        },
    }));

    return {
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        customer: {
            _id: customer?._id?.toString() ?? customer?.toString() ?? "",
            name: customer?.name ?? "",
            surname: customer?.surname ?? "",
        },
        company: order.company ? {_id: order.company._id.toString(), name: order.company.name} : {_id: "", name: ""},
        items,
        subtotal: order.subtotal,
        discountTotal: order.discountTotal,
        shippingTotal: order.shippingTotal,
        taxTotal: order.taxTotal,
        grandTotal: order.grandTotal,
        currency: {
            _id: currency?._id?.toString() ?? currency?.toString() ?? "",
            name: currency?.name ?? "",
            symbol: currency?.symbol ?? "",
            abbreviation: currency?.abbreviation ?? "",
        },
        shippingAddress: mapAddress(order.shippingAddress) ?? {firstName: "", lastName: "", street: "", city: "", country: {_id: "", name: "", code: ""}},
        billingAddress: order.billingAddress ? mapAddress(order.billingAddress) : undefined,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        status: order.status,
        appliedDiscounts: (order.appliedDiscounts as any[])?.map(d => ({
            discount: {_id: d.discount?._id?.toString() ?? d.discount?.toString() ?? "", title: d.discount?.title ?? "", code: d.discount?.code},
            amount: d.amount,
        })),
        taxBreakdown: order.taxBreakdown,
        shippingRate: order.shippingRate,
        notes: order.notes,
        internalNotes: order.internalNotes,
        timeline: (order.timeline as any[])?.map(t => ({
            event: t.event,
            timestamp: t.timestamp instanceof Date ? t.timestamp.toISOString() : t.timestamp,
            userId: t.userId?.toString(),
        })),
        stripePaymentIntentId: order.stripePaymentIntentId,
        idempotencyKey: order.idempotencyKey,
        ...mapSoftDeleteToDTO(order),
        ...mapOwnershipToDTO(order),
    };
}

export function productOrdersToDTO(orders: IProductOrder[]): ProductOrder[] {
    return orders.map(productOrderToDTO);
}

export function productOrderToSelect(order: IProductOrder): ApiSelectDatum {
    return {value: order._id.toString(), label: order.orderNumber};
}

export function productOrdersToSelect(orders: IProductOrder[]): ApiSelectDatum[] {
    return orders.map(productOrderToSelect);
}
