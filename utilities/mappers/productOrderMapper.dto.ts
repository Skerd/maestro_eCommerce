import type {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import type {ProductOrder} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/productOrder.dto";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";
import {mapLifeCycleToDTO, mapOwnershipToDTO, mapSoftDeleteToDTO} from "@coreModule/utilities/mappers/plugin/pluginMappers.dto";

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

function mapCompanyLabel(company: any): {_id: string; name: string} | undefined {
    if (!company) return undefined;
    if (typeof company === "object" && company._id) {
        return {_id: company._id.toString(), name: company.name ?? ""};
    }
    return {_id: company.toString(), name: ""};
}

export function productOrderToDTO(order: IProductOrder): ProductOrder {
    const customer = order.customer as any;
    const currency = order.currency as any;
    const giftCardEntry = (order as any).giftCard;

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

    const itemProducts = items
        .map(item => item.product)
        .filter(p => typeof p._id === "string" && p._id.length > 0)
        .filter((p, index, arr) => arr.findIndex(x => x._id === p._id) === index);

    const appliedDiscounts = (order.appliedDiscounts as any[])?.map(d => ({
        discount: {
            _id: d.discount?._id?.toString() ?? d.discount?.toString() ?? "",
            title: d.discount?.title ?? "",
            code: d.discount?.code ?? d.code,
        },
        amount: d.amount,
    }));

    const appliedDiscountRefs = (appliedDiscounts ?? [])
        .filter(d => typeof d.discount._id === "string" && d.discount._id.length > 0)
        .map(d => ({
            _id: d.discount._id,
            title: d.discount.title,
            code: d.discount.code,
            amount: d.amount,
        }));

    return {
        _id: order._id.toString(),
        orderNumber: order.orderNumber,
        customer: {
            _id: customer?._id?.toString() ?? customer?.toString() ?? "",
            name: customer?.name ?? "",
            surname: customer?.surname ?? "",
        },
        email: order.email,
        phone: order.phone,
        company: mapCompanyLabel(order.company) ?? {_id: "", name: ""},
        items,
        itemProducts,
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
        appliedDiscounts,
        appliedDiscountRefs,
        taxBreakdown: order.taxBreakdown,
        shippingRate: order.shippingRate,
        notes: order.notes,
        internalNotes: order.internalNotes,
        timeline: (order.timeline as any[])?.map(t => {
            const rawUser = t.userId;
            let user: {_id: string; name: string; surname: string} | undefined;
            if (rawUser != null) {
                if (typeof rawUser === "object" && rawUser._id) {
                    user = {
                        _id: rawUser._id.toString(),
                        name: rawUser.name ?? "",
                        surname: rawUser.surname ?? "",
                    };
                } else {
                    user = {_id: rawUser.toString(), name: "", surname: ""};
                }
            }
            return {
                event: t.event,
                timestamp: t.timestamp instanceof Date ? t.timestamp.toISOString() : t.timestamp,
                user,
                note: t.note,
            };
        }),
        stripePaymentIntentId: order.stripePaymentIntentId,
        idempotencyKey: order.idempotencyKey,
        giftCard: giftCardEntry
            ? {
                giftCard: {
                    _id: giftCardEntry.giftCard?._id?.toString() ?? giftCardEntry.giftCard?.toString() ?? "",
                    code: giftCardEntry.giftCard?.code ?? giftCardEntry.code,
                },
                code: giftCardEntry.code,
                amount: giftCardEntry.amount,
            }
            : undefined,
        ...mapLifeCycleToDTO(order),
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
