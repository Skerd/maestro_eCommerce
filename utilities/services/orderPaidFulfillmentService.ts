import {randomBytes} from "crypto";
import {ObjectId} from "mongodb";
import Product from "@eCommerceModule/database/schemas/product/product";
import DigitalDelivery from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery";
import GiftCard from "@eCommerceModule/database/schemas/giftCard/giftCard";
import {generateGiftCardCode} from "@eCommerceModule/database/schemas/giftCard/giftCard.service";
import type {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import type {CrudOptions} from "@coreModule/database/services";

type FulfillmentCtx = CrudOptions & {auditUserId?: ObjectId | string};

const DEFAULT_DOWNLOAD_LIMIT = 5;
const DEFAULT_DOWNLOAD_EXPIRY_DAYS = 30;

/**
 * Post-payment extras for a ProductOrder: issues gift cards for gift_card
 * lines (one card per unit, balance = unit price) and download entitlements
 * for digital lines. Idempotent — existing cards/deliveries for the same
 * order+product are left alone, so the checkout-confirm and webhook paths can
 * both call it safely.
 */
export async function fulfillOrderPaidExtras(order: IProductOrder, ctx: FulfillmentCtx): Promise<void> {
    const items = (order.items as any[]) ?? [];
    if (items.length === 0) return;

    const companyId = (order.company as any)?._id ?? (order.company as any);
    const customerId = (order.customer as any)?._id ?? (order.customer as any);
    const currencyId = (order.currency as any)?._id ?? (order.currency as any);

    const productIds = items.map(item => (item.product?._id ?? item.product));
    const specialProducts = await Product.find(
        {_id: {$in: productIds}, company: companyId, type: {$in: ["gift_card", "digital"]}},
        {type: 1, documents: 1, downloadLimit: 1, downloadExpiryDays: 1},
        {session: ctx.session},
    );
    if (specialProducts.length === 0) return;

    const productMap = new Map(specialProducts.map(product => [product._id.toString(), product]));

    for (const item of items) {
        const productId = (item.product?._id ?? item.product);
        const product = productMap.get(productId.toString());
        if (!product) continue;

        if (product.type === "gift_card") {
            const existing = await GiftCard.countDocuments({order: order._id, company: companyId}).session(ctx.session ?? null);
            if (existing >= item.quantity) continue;

            for (let i = existing; i < item.quantity; i++) {
                await GiftCard.create([{
                    code: generateGiftCardCode(),
                    initialBalance: item.unitPrice,
                    balance: item.unitPrice,
                    currency: currencyId,
                    purchasedBy: customerId,
                    order: order._id,
                    status: "active",
                    company: companyId,
                    createdBy: ctx.auditUserId,
                }], {session: ctx.session});
            }
            ctx.logger?.debug?.(`Issued ${item.quantity - existing} gift card(s) for order ${order._id}`);
        }

        if (product.type === "digital") {
            const existing = await DigitalDelivery.findOne({order: order._id, product: product._id}).session(ctx.session ?? null);
            if (existing) continue;

            const expiryDays = product.downloadExpiryDays ?? DEFAULT_DOWNLOAD_EXPIRY_DAYS;
            await DigitalDelivery.create([{
                order: order._id,
                product: product._id,
                customer: customerId,
                token: randomBytes(24).toString("hex"),
                media: ((product.documents as any[]) ?? []).map(doc => doc?._id ?? doc),
                downloadLimit: (product.downloadLimit ?? DEFAULT_DOWNLOAD_LIMIT) * item.quantity,
                downloadCount: 0,
                expiresAt: new Date(Date.now() + expiryDays * 86400000),
                company: companyId,
                createdBy: ctx.auditUserId,
            }], {session: ctx.session});
            ctx.logger?.debug?.(`Issued digital delivery for order ${order._id}, product ${product._id}`);
        }
    }
}
