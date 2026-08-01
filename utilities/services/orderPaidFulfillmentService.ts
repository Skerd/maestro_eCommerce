import {randomBytes} from "crypto";
import {ObjectId} from "mongodb";
import Product from "@eCommerceModule/database/schemas/product/product";
import DigitalDelivery from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery";
import GiftCard from "@financeModule/database/schemas/giftCard/giftCard";
import {generateGiftCardCode} from "@financeModule/database/schemas/giftCard/giftCard.service";
import type {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {CrudOptions} from "@coreModule/database/services/baseCrudService";
import {CLIENT_SIDE, CONSTANTS} from "@coreModule/environment";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import {notifyProductOrderCustomer} from "@eCommerceModule/utilities/services/productOrderNotify";

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
    const languageCode = ctx.languageCode ?? CONSTANTS.DEFAULT_LANGUAGE ?? "en-US";

    const productIds = items.map(item => (item.product?._id ?? item.product));
    const specialProducts = await Product.find(
        {_id: {$in: productIds}, company: companyId, type: {$in: ["gift_card", "digital"]}},
        {type: 1, documents: 1, downloadLimit: 1, downloadExpiryDays: 1, title: 1},
        {session: ctx.session},
    );
    if (specialProducts.length === 0) return;

    const productMap = new Map(specialProducts.map(product => [product._id.toString(), product]));
    const issuedGiftCodes: string[] = [];
    const downloadLinks: {productTitle: string; url: string}[] = [];

    for (const item of items) {
        const productId = (item.product?._id ?? item.product);
        const product = productMap.get(productId.toString());
        if (!product) continue;

        if (product.type === "gift_card") {
            const existing = await GiftCard.countDocuments({order: order._id, company: companyId}).session(ctx.session ?? null);
            if (existing >= item.quantity) continue;

            for (let i = existing; i < item.quantity; i++) {
                const code = generateGiftCardCode();
                await GiftCard.create([{
                    code,
                    initialBalance: item.unitPrice,
                    balance: item.unitPrice,
                    currency: currencyId,
                    purchasedBy: customerId,
                    order: order._id,
                    status: "active",
                    company: companyId,
                    createdBy: ctx.auditUserId,
                }], {session: ctx.session});
                issuedGiftCodes.push(code);
            }
            ctx.logger?.debug?.(`Issued ${item.quantity - existing} gift card(s) for order ${order._id}`);
        }

        if (product.type === "digital") {
            const existingDelivery = await DigitalDelivery.findOne({order: order._id, product: product._id}).session(ctx.session ?? null);
            if (existingDelivery) continue;

            const expiryDays = product.downloadExpiryDays ?? DEFAULT_DOWNLOAD_EXPIRY_DAYS;
            const token = randomBytes(24).toString("hex");
            const created = await DigitalDelivery.create([{
                order: order._id,
                product: product._id,
                customer: customerId,
                token,
                media: ((product.documents as any[]) ?? []).map(doc => doc?._id ?? doc),
                downloadLimit: (product.downloadLimit ?? DEFAULT_DOWNLOAD_LIMIT) * item.quantity,
                downloadCount: 0,
                expiresAt: new Date(Date.now() + expiryDays * 86400000),
                company: companyId,
                createdBy: ctx.auditUserId,
            }], {session: ctx.session});
            const delivery = created[0];
            ctx.logger?.debug?.(`Issued digital delivery for order ${order._id}, product ${product._id}`);

            const mediaIds = ((delivery.media as any[]) ?? []).map(m => (m?._id ?? m)?.toString?.()).filter(Boolean);
            const productTitle = (product as any).title ?? "Download";
            if (mediaIds.length) {
                for (const mediaId of mediaIds) {
                    downloadLinks.push({
                        productTitle,
                        url: `${CLIENT_SIDE.HOST}/api/eCommerce/digitalDownload/${delivery.token}/${mediaId}`,
                    });
                }
            } else {
                downloadLinks.push({
                    productTitle,
                    url: `${CLIENT_SIDE.HOST}/account/orders`,
                });
            }
        }
    }

    if (issuedGiftCodes.length) {
        await notifyProductOrderCustomer(NotificationEventCodes.GIFT_CARD_ISSUED, {
            companyId,
            languageCode,
            order,
            extra: {giftCardCodes: issuedGiftCodes},
        });
    }

    if (downloadLinks.length) {
        await notifyProductOrderCustomer(NotificationEventCodes.DIGITAL_DELIVERY_READY, {
            companyId,
            languageCode,
            order,
            extra: {downloadLinks},
        });
    }
}
