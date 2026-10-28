import * as fs from "fs";
import * as path from "path";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import {CLIENT_SIDE, CONSTANTS, EMAIL, clientHostFor} from "@coreModule/environment";
import {applyPlaceholders, loadEmailStrings, type EmailStrings} from "@coreModule/utilities/emails/emailLocale";
import {
    ctaButtonHtml,
    currentYear,
    EMAIL_FONT,
    escapeHtml,
    layoutStrings,
    localized,
    pushRow,
    summaryCardHtml,
    type SummaryRow,
} from "@coreModule/utilities/emails/emailLayout";
import {sendMail} from "@coreModule/utilities/emails/mailDeliveryService";
import type {ProductOrderClientEmailEvent, ProductOrderClientEmailKind} from "@eCommerceModule/kafka/types";

const fallbackLanguageCode = "en-US";
const LOCALES_ROOT = path.join(__dirname, "static", "locales");
const TEMPLATE_DIR = path.join(__dirname, "templates", "productOrderClient");

const KIND_META: Record<
    ProductOrderClientEmailKind,
    {subjectKey: string; headingKey: string; introKey: string; closingKey: string}
> = {
    placed: {subjectKey: "subjectPlaced", headingKey: "headingPlaced", introKey: "introPlaced", closingKey: "closingPlaced"},
    paid: {subjectKey: "subjectPaid", headingKey: "headingPaid", introKey: "introPaid", closingKey: "closingPaid"},
    payment_failed: {subjectKey: "subjectPaymentFailed", headingKey: "headingPaymentFailed", introKey: "introPaymentFailed", closingKey: "closingPaymentFailed"},
    confirmed: {subjectKey: "subjectConfirmed", headingKey: "headingConfirmed", introKey: "introConfirmed", closingKey: "closingConfirmed"},
    shipped: {subjectKey: "subjectShipped", headingKey: "headingShipped", introKey: "introShipped", closingKey: "closingShipped"},
    delivered: {subjectKey: "subjectDelivered", headingKey: "headingDelivered", introKey: "introDelivered", closingKey: "closingDelivered"},
    cancelled: {subjectKey: "subjectCancelled", headingKey: "headingCancelled", introKey: "introCancelled", closingKey: "closingCancelled"},
    refunded: {subjectKey: "subjectRefunded", headingKey: "headingRefunded", introKey: "introRefunded", closingKey: "closingRefunded"},
    abandoned_cart: {subjectKey: "subjectAbandonedCart", headingKey: "headingAbandonedCart", introKey: "introAbandonedCart", closingKey: "closingAbandonedCart"},
    gift_card_issued: {subjectKey: "subjectGiftCard", headingKey: "headingGiftCard", introKey: "introGiftCard", closingKey: "closingGiftCard"},
    digital_delivery_ready: {subjectKey: "subjectDigital", headingKey: "headingDigital", introKey: "introDigital", closingKey: "closingDigital"},
    return_approved: {subjectKey: "subjectReturnApproved", headingKey: "headingReturnApproved", introKey: "introReturnApproved", closingKey: "closingReturnApproved"},
    return_rejected: {subjectKey: "subjectReturnRejected", headingKey: "headingReturnRejected", introKey: "introReturnRejected", closingKey: "closingReturnRejected"},
    new_order_merchant: {subjectKey: "subjectNewOrderMerchant", headingKey: "headingNewOrderMerchant", introKey: "introNewOrderMerchant", closingKey: "closingNewOrderMerchant"},
    low_stock: {subjectKey: "subjectLowStock", headingKey: "headingLowStock", introKey: "introLowStock", closingKey: "closingLowStock"},
};

const STAFF_KINDS = new Set<ProductOrderClientEmailKind>(["new_order_merchant", "low_stock"]);

function canSendEmails(): boolean {
    return EMAIL.ENABLED;
}

function readTemplateHtml(filename: string): string {
    return fs.readFileSync(path.join(TEMPLATE_DIR, filename), "utf8");
}

function codeListHtml(title: string, codes: string[]): string {
    if (!codes.length) return "";
    const items = codes
        .map(
            code =>
                `<li style="margin:0 0 6px;font-family:${EMAIL_FONT};font-size:14px;font-weight:600;line-height:170%;color:#111114;">${escapeHtml(code)}</li>`
        )
        .join("");
    return `<p style="margin:22px 0 8px;font-family:${EMAIL_FONT};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;line-height:150%;color:#9aa0a8;">${escapeHtml(title)}</p>
<ul style="margin:0;padding-left:18px;">${items}</ul>`;
}

function downloadListHtml(title: string, links: {productTitle: string; url: string}[]): string {
    if (!links.length) return "";
    const items = links
        .map(
            link =>
                `<li style="margin:0 0 6px;font-family:${EMAIL_FONT};font-size:14px;line-height:170%;"><a href="${escapeHtml(link.url)}" target="_blank" rel="noopener" style="color:#b8873a;text-decoration:underline;">${escapeHtml(link.productTitle)}</a></li>`
        )
        .join("");
    return `<p style="margin:22px 0 8px;font-family:${EMAIL_FONT};font-size:11px;font-weight:600;letter-spacing:0.08em;text-transform:uppercase;line-height:150%;color:#9aa0a8;">${escapeHtml(title)}</p>
<ul style="margin:0;padding-left:18px;">${items}</ul>`;
}

function orderBodyParts(
    strings: EmailStrings,
    data: ProductOrderClientEmailEvent,
    links: {ordersUrl: string; cartUrl: string; checkoutUrl: string}
): {detailsSummary: string; extra: string; cta: string} {
    const rows: SummaryRow[] = [];
    let summaryTitle = strings.summaryTitle ?? "";
    let extra = "";
    let ctaLabel = "";
    let ctaUrl = "";

    switch (data.kind) {
        case "placed":
            pushRow(rows, strings.labelOrder, data.orderNumber);
            pushRow(rows, strings.labelTotal, data.orderTotalDisplay);
            ctaLabel = strings.ctaOrders ?? "";
            ctaUrl = links.ordersUrl;
            break;
        case "paid":
            pushRow(rows, strings.labelOrder, data.orderNumber);
            pushRow(rows, strings.labelTotal, data.orderTotalDisplay);
            break;
        case "payment_failed":
            pushRow(rows, strings.labelOrder, data.orderNumber);
            pushRow(rows, strings.labelReason, data.failureReason);
            ctaLabel = strings.ctaCheckout ?? "";
            ctaUrl = links.checkoutUrl;
            break;
        case "shipped":
            pushRow(rows, strings.labelOrder, data.orderNumber);
            pushRow(rows, strings.labelCarrier, data.carrier);
            pushRow(rows, strings.labelTracking, data.trackingNumber);
            if (data.trackingUrl) {
                ctaLabel = strings.ctaTrack ?? "";
                ctaUrl = data.trackingUrl;
            }
            break;
        case "refunded":
            pushRow(rows, strings.labelOrder, data.orderNumber);
            pushRow(rows, strings.labelRefund, data.refundAmountDisplay);
            break;
        case "abandoned_cart":
            pushRow(rows, strings.labelItems, data.itemCount != null ? String(data.itemCount) : undefined);
            pushRow(rows, strings.labelSubtotal, data.orderTotalDisplay);
            ctaLabel = strings.ctaCart ?? "";
            ctaUrl = links.cartUrl;
            break;
        case "gift_card_issued":
            pushRow(rows, strings.labelOrder, data.orderNumber);
            extra = codeListHtml(strings.giftCardsLabel ?? "", data.giftCardCodes ?? []);
            break;
        case "digital_delivery_ready":
            pushRow(rows, strings.labelOrder, data.orderNumber);
            extra = downloadListHtml(strings.downloadsLabel ?? "", data.downloadLinks ?? []);
            break;
        case "new_order_merchant":
            pushRow(rows, strings.labelOrder, data.orderNumber);
            pushRow(rows, strings.labelTotal, data.orderTotalDisplay);
            break;
        case "low_stock":
            summaryTitle = strings.summaryStock ?? summaryTitle;
            pushRow(rows, strings.labelProduct, data.productTitle);
            pushRow(rows, strings.labelWarehouse, data.warehouseName);
            pushRow(rows, strings.labelAvailable, data.availableQuantity != null ? String(data.availableQuantity) : undefined);
            pushRow(rows, strings.labelReorder, data.reorderPoint != null ? String(data.reorderPoint) : undefined);
            break;
        case "confirmed":
        case "delivered":
        case "cancelled":
        case "return_approved":
        case "return_rejected":
            pushRow(rows, strings.labelOrder, data.orderNumber);
            break;
    }

    return {
        detailsSummary: summaryCardHtml(summaryTitle, rows),
        extra,
        cta: ctaLabel && ctaUrl ? ctaButtonHtml(ctaLabel, ctaUrl, strings.fallbackLabel ?? "") : "",
    };
}

export async function sendProductOrderClientMail(data: ProductOrderClientEmailEvent): Promise<void> {
    if (!canSendEmails()) {
        return;
    }

    const languageCode = data.languageCode || CONSTANTS.DEFAULT_LANGUAGE || fallbackLanguageCode;
    const pageName = CLIENT_SIDE.NAME ?? "";
    const strings = loadEmailStrings(["productOrderClient"], languageCode, LOCALES_ROOT);
    const meta = KIND_META[data.kind];

    const ordersUrl = `${clientHostFor("portal")}/shop/account/orders`;
    const cartUrl = `${clientHostFor("portal")}/shop/cart`;
    const checkoutUrl = `${clientHostFor("portal")}/shop/checkout`;
    const parts = orderBodyParts(strings, data, {ordersUrl, cartUrl, checkoutUrl});

    const bodyInner = applyPlaceholders(readTemplateHtml("body.html"), {
        intro: strings[meta.introKey] ?? strings.introGeneric ?? "",
        closing: strings[meta.closingKey] ?? strings.closingGeneric ?? "",
        detailsSummary: parts.detailsSummary,
        extra: parts.extra,
        cta: parts.cta,
    });

    const layout = layoutStrings(strings, meta.headingKey, meta.introKey);
    if (STAFF_KINDS.has(data.kind)) {
        layout.ignore = strings.ignoreStaff ?? "";
        layout.footerNote = strings.footerNoteStaff ?? "";
    }

    let emailTemplate = applyPlaceholders(readTemplateHtml("productOrderClient.html"), layout);
    emailTemplate = applyPlaceholders(emailTemplate, {
        greeting: localized(strings, "greeting", {fullName: escapeHtml(data.fullName)}),
        bodyInner,
        companyName: escapeHtml(data.companyName),
        pageName,
        year: currentYear(),
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
        });
    } catch {
        throw apiValidationException("could_not_send_email", "product_order_client_email", null, languageCode);
    }
}
