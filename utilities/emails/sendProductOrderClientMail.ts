import * as fs from "fs";
import * as path from "path";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {CLIENT_SIDE, CONSTANTS, EMAIL} from "@coreModule/environment";
import {applyPlaceholders, loadEmailStrings} from "@coreModule/utilities/emails/emailLocale";
import {sendMail} from "@coreModule/utilities/emails/mailDeliveryService";
import type {ProductOrderClientEmailEvent, ProductOrderClientEmailKind} from "@eCommerceModule/kafka/types";

const imagePath = path.join(__dirname, "./static/images/image-1.png");
const imageCID = "imageCID@example.com";
const fallbackLanguageCode = "en-US";
const LOCALES_ROOT = path.join(__dirname, "static", "locales");
const TEMPLATE_DIR = path.join(__dirname, "templates", "productOrderClient");

const KIND_META: Record<
    ProductOrderClientEmailKind,
    {bodyFile: string; subjectKey: string; headingKey: string; introKey: string; closingKey: string}
> = {
    placed: {bodyFile: "body-placed.html", subjectKey: "subjectPlaced", headingKey: "headingPlaced", introKey: "introPlaced", closingKey: "closingPlaced"},
    paid: {bodyFile: "body-paid.html", subjectKey: "subjectPaid", headingKey: "headingPaid", introKey: "introPaid", closingKey: "closingPaid"},
    payment_failed: {bodyFile: "body-payment-failed.html", subjectKey: "subjectPaymentFailed", headingKey: "headingPaymentFailed", introKey: "introPaymentFailed", closingKey: "closingPaymentFailed"},
    confirmed: {bodyFile: "body-confirmed.html", subjectKey: "subjectConfirmed", headingKey: "headingConfirmed", introKey: "introConfirmed", closingKey: "closingConfirmed"},
    shipped: {bodyFile: "body-shipped.html", subjectKey: "subjectShipped", headingKey: "headingShipped", introKey: "introShipped", closingKey: "closingShipped"},
    delivered: {bodyFile: "body-delivered.html", subjectKey: "subjectDelivered", headingKey: "headingDelivered", introKey: "introDelivered", closingKey: "closingDelivered"},
    cancelled: {bodyFile: "body-cancelled.html", subjectKey: "subjectCancelled", headingKey: "headingCancelled", introKey: "introCancelled", closingKey: "closingCancelled"},
    refunded: {bodyFile: "body-refunded.html", subjectKey: "subjectRefunded", headingKey: "headingRefunded", introKey: "introRefunded", closingKey: "closingRefunded"},
    abandoned_cart: {bodyFile: "body-abandoned-cart.html", subjectKey: "subjectAbandonedCart", headingKey: "headingAbandonedCart", introKey: "introAbandonedCart", closingKey: "closingAbandonedCart"},
    gift_card_issued: {bodyFile: "body-gift-card.html", subjectKey: "subjectGiftCard", headingKey: "headingGiftCard", introKey: "introGiftCard", closingKey: "closingGiftCard"},
    digital_delivery_ready: {bodyFile: "body-digital.html", subjectKey: "subjectDigital", headingKey: "headingDigital", introKey: "introDigital", closingKey: "closingDigital"},
    return_approved: {bodyFile: "body-return-approved.html", subjectKey: "subjectReturnApproved", headingKey: "headingReturnApproved", introKey: "introReturnApproved", closingKey: "closingReturnApproved"},
    return_rejected: {bodyFile: "body-return-rejected.html", subjectKey: "subjectReturnRejected", headingKey: "headingReturnRejected", introKey: "introReturnRejected", closingKey: "closingReturnRejected"},
    new_order_merchant: {bodyFile: "body-new-order-merchant.html", subjectKey: "subjectNewOrderMerchant", headingKey: "headingNewOrderMerchant", introKey: "introNewOrderMerchant", closingKey: "closingNewOrderMerchant"},
    low_stock: {bodyFile: "body-low-stock.html", subjectKey: "subjectLowStock", headingKey: "headingLowStock", introKey: "introLowStock", closingKey: "closingLowStock"},
};

function canSendEmails(): boolean {
    return EMAIL.ENABLED;
}

function readTemplateHtml(filename: string): string {
    return fs.readFileSync(path.join(TEMPLATE_DIR, filename), "utf8");
}

function buildGiftCardList(codes: string[] | undefined): string {
    if (!codes?.length) return "";
    return `<ul style="margin:0 0 14px 0;padding-left:20px;">${codes.map(c => `<li><strong>${c}</strong></li>`).join("")}</ul>`;
}

function buildDownloadList(links: {productTitle: string; url: string}[] | undefined): string {
    if (!links?.length) return "";
    return `<ul style="margin:0 0 14px 0;padding-left:20px;">${links
        .map(l => `<li>${l.productTitle}: <a href="${l.url}">${l.url}</a></li>`)
        .join("")}</ul>`;
}

export async function sendProductOrderClientMail(data: ProductOrderClientEmailEvent): Promise<void> {
    if (!canSendEmails()) {
        return;
    }

    const languageCode = data.languageCode || CONSTANTS.DEFAULT_LANGUAGE || fallbackLanguageCode;
    const pageName = CLIENT_SIDE.NAME ?? "";
    const strings = loadEmailStrings(["productOrderClient"], languageCode, LOCALES_ROOT) as Record<string, string>;
    const meta = KIND_META[data.kind];
    let emailTemplate = readTemplateHtml("productOrderClient.html");
    let bodyInner = readTemplateHtml(meta.bodyFile);

    const ordersUrl = `${CLIENT_SIDE.HOST}/account/orders`;
    const cartUrl = `${CLIENT_SIDE.HOST}/cart`;
    const checkoutUrl = `${CLIENT_SIDE.HOST}/checkout`;

    const trackingLine = data.trackingNumber
        ? applyPlaceholders(strings.trackingLine ?? "Tracking: {trackingNumber}", {
            trackingNumber: data.trackingNumber,
            carrier: data.carrier ?? "",
            trackingUrl: data.trackingUrl ?? "",
        })
        : "";

    const trackingLink = data.trackingUrl
        ? applyPlaceholders(strings.trackingLink ?? '<a href="{trackingUrl}">Track shipment</a>', {
            trackingUrl: data.trackingUrl,
        })
        : "";

    bodyInner = applyPlaceholders(bodyInner, {
        greeting: applyPlaceholders(strings.greeting ?? "Hello {fullName},", {fullName: data.fullName}),
        companyName: data.companyName,
        orderNumber: data.orderNumber ?? "",
        orderTotalDisplay: data.orderTotalDisplay ?? "",
        failureReason: data.failureReason ?? "",
        trackingLine,
        trackingLink,
        refundAmountDisplay: data.refundAmountDisplay ?? "",
        itemCount: String(data.itemCount ?? 0),
        giftCardList: buildGiftCardList(data.giftCardCodes),
        downloadList: buildDownloadList(data.downloadLinks),
        productTitle: data.productTitle ?? "",
        warehouseName: data.warehouseName ?? "",
        availableQuantity: String(data.availableQuantity ?? ""),
        reorderPoint: String(data.reorderPoint ?? ""),
        ordersUrl,
        cartUrl,
        checkoutUrl,
        intro: strings[meta.introKey] ?? strings.introGeneric ?? "",
        closing: strings[meta.closingKey] ?? strings.closingGeneric ?? "",
    });

    const heading = strings[meta.headingKey] ?? strings.heading ?? "Order update";

    emailTemplate = applyPlaceholders(emailTemplate, {
        heading,
        imageAlt: strings.imageAlt ?? "",
        copyright: applyPlaceholders(strings.copyright ?? "© {pageName}", {pageName}),
        username: data.fullName,
        bodyInner,
        pageName,
    });

    const subject = applyPlaceholders(strings[meta.subjectKey] ?? strings.subjectGeneric ?? "Order update", {
        companyName: data.companyName,
        orderNumber: data.orderNumber ?? "",
        pageName,
        productTitle: data.productTitle ?? "",
    });

    try {
        await sendMail(data.companyId, {
            to: data.email,
            subject,
            html: emailTemplate,
            attachments: [
                {
                    filename: "companyTick.png",
                    path: imagePath,
                    cid: imageCID,
                },
            ],
        });
    } catch {
        throw apiValidationException("could_not_send_email", "product_order_client_email", null, languageCode);
    }
}
