import type {ICart, ICartItem} from "@eCommerceModule/database/schemas/cart/cart";
import type {Cart, CartItem} from "armonia/src/modules/eCommerce/api/eCommerce/private/cart/cart.dto";
import {dateToISOString, objectIdToString} from "@coreModule/utilities/mappers/common.mapper";
import {toShopSeller} from "@eCommerceModule/utilities/mappers/shopCatalog/shopCatalog.mapper";

function cartItemToDTO(item: ICartItem & {_id?: any}): CartItem {
    const productId = objectIdToString((item.product as any)?._id ?? item.product);
    const seller = toShopSeller(item.sellerCompany);
    const sellerCompanyId = objectIdToString((item.sellerCompany as any)?._id ?? item.sellerCompany) || undefined;
    return {
        _id: item._id ? objectIdToString(item._id) : undefined,
        product: {
            _id: productId,
            title: (item.product as any)?.title ?? item.snapshot?.title,
        },
        variant: item.variant
            ? {_id: objectIdToString((item.variant as any)?._id ?? item.variant)}
            : null,
        ...(seller ? {seller} : {}),
        ...(sellerCompanyId ? {sellerCompanyId} : {}),
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
        snapshot: item.snapshot,
    };
}

export function cartToDTO(cart: ICart): Cart {
    return {
        _id: cart._id.toString(),
        items: (cart.items ?? []).map((item) => cartItemToDTO(item as any)),
        subtotal: cart.subtotal ?? 0,
        discountTotal: cart.discountTotal ?? 0,
        appliedDiscounts: (cart.appliedDiscounts ?? []).map((d) => ({
            discount: objectIdToString((d.discount as any)?._id ?? d.discount),
            code: d.code,
            amount: d.amount,
        })),
        appliedGiftCard: cart.appliedGiftCard
            ? {code: cart.appliedGiftCard.code, amount: cart.appliedGiftCard.amount}
            : undefined,
        expiresAt: dateToISOString(cart.expiresAt) || undefined,
    };
}

export function cartsToDTO(carts: ICart[]): Cart[] {
    return carts.map(cartToDTO);
}
