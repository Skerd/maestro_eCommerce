import {randomBytes} from "crypto";
import {ObjectId} from "mongodb";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {digitalDeliveryService} from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery.service";
import {giftCardService, generateGiftCardCode} from "@financeModule/database/schemas/giftCard/giftCard.service";
import type {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {CrudOptions} from "@coreModule/database/services/baseCrudService";
import {CONSTANTS, clientHostFor} from "@coreModule/environment";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import {notifyProductOrderCustomer} from "@eCommerceModule/utilities/services/productOrderNotify";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";

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
    if (order.items.length === 0) return;

    const companyId = nestedEntityToRef(order.company);
    const customerId = nestedEntityToRef(order.customer);
    const currencyId = nestedEntityToRef(order.currency);
    const languageCode = ctx.languageCode ?? CONSTANTS.DEFAULT_LANGUAGE ?? "en-US";
    if (!companyId || !customerId || !currencyId) {
        throw apiValidationException("order_not_found", "", null, languageCode);
    }

    const productIds = order.items.flatMap((item) => {
        const productId = nestedEntityToRef(item.product);
        return productId ? [productId] : [];
    });
    const readOpts = {session: ctx.session, logger: ctx.logger, languageCode};
    const specialProducts = await productService.find(
        {_id: {$in: productIds}, company: companyId, type: {$in: ["gift_card", "digital"]}},
        readOpts,
        undefined,
        "type documents downloadLimit downloadExpiryDays title",
    );
    if (specialProducts.length === 0) return;

    const productMap = new Map(specialProducts.map((product) => [product._id.toString(), product]));
    const issuedGiftCodes: string[] = [];

    // Cards carry no line reference, so allocate the order's existing cards to
    // gift-card lines in line order: line N owns the cards after lines 0..N-1.
    const existingGiftCards = await giftCardService.count({order: order._id, company: companyId}, readOpts);
    let giftCardsAccountedFor = 0;
    const downloadLinks: {productTitle: string; url: string}[] = [];
    const orderId = new ObjectId(order._id.toString());

    for (const item of order.items) {
        const productId = nestedEntityToRef(item.product);
        const product = productId ? productMap.get(productId.toString()) : undefined;
        if (!product) continue;

        if (product.type === "gift_card") {
            const existing = Math.min(item.quantity, Math.max(0, existingGiftCards - giftCardsAccountedFor));
            giftCardsAccountedFor += item.quantity;
            if (existing >= item.quantity) continue;

            for (let i = existing; i < item.quantity; i++) {
                const code = generateGiftCardCode();
                await giftCardService.create(
                    {
                        code,
                        initialBalance: item.unitPrice,
                        balance: item.unitPrice,
                        currency: currencyId,
                        purchasedBy: customerId,
                        order: orderId,
                        status: "active",
                        company: companyId,
                    },
                    {...readOpts, auditUserId: ctx.auditUserId},
                );
                issuedGiftCodes.push(code);
            }
            ctx.logger?.debug(`Issued ${item.quantity - existing} gift card(s) for order ${order._id}`);
        }

        if (product.type === "digital") {
            const existingDelivery = await digitalDeliveryService.findOne(
                {order: orderId, product: product._id},
                readOpts,
            );
            if (existingDelivery) continue;

            const expiryDays = product.downloadExpiryDays ?? DEFAULT_DOWNLOAD_EXPIRY_DAYS;
            const token = randomBytes(24).toString("hex");
            const media = (product.documents ?? []).flatMap((doc) => {
                const mediaId = nestedEntityToRef(doc);
                return mediaId ? [mediaId] : [];
            });
            const delivery = await digitalDeliveryService.create(
                {
                    order: orderId,
                    product: product._id,
                    customer: customerId,
                    token,
                    media,
                    downloadLimit: (product.downloadLimit ?? DEFAULT_DOWNLOAD_LIMIT) * item.quantity,
                    downloadCount: 0,
                    expiresAt: new Date(Date.now() + expiryDays * 86400000),
                    company: companyId,
                },
                {...readOpts, auditUserId: ctx.auditUserId},
            );
            ctx.logger?.debug(`Issued digital delivery for order ${order._id}, product ${product._id}`);

            const productTitle = product.title;
            if (delivery.media.length) {
                for (const mediaRef of delivery.media) {
                    const mediaId = nestedEntityToRef(mediaRef);
                    if (!mediaId) continue;
                    downloadLinks.push({
                        productTitle,
                        url: `${clientHostFor("shop")}/api/eCommerce/digitalDownload/${delivery.token}/${mediaId.toString()}`,
                    });
                }
            } else {
                downloadLinks.push({
                    productTitle,
                    url: `${clientHostFor("shop")}/account/orders`,
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
