import {ObjectId} from "mongodb";
import type {ClientSession} from "mongoose";
import {runAfterCommit} from "@coreModule/utilities/middlewares/transactionUtils";
import Currency from "@coreModule/database/schemas/currency/currency";
import {emitNotificationEvent} from "@coreModule/domain/notifications/notificationEventBus";
import {userService} from "@coreModule/database/schemas/user/user.service";
import {companyService} from "@coreModule/database/schemas/company/company.service";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import type {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import type {ProductOrderClientEmailKind} from "@eCommerceModule/kafka/types";
import {dispatchProductOrderClientEmail} from "@eCommerceModule/utilities/emails/dispatchProductOrderClientEmail";
import {
    findCompanyAdminEmailRecipients,
    findCompanyAdminReceiverIds,
} from "@eCommerceModule/utilities/services/companyStaffRecipients";

const ORDER_CODE_TO_EMAIL_KIND: Partial<Record<string, ProductOrderClientEmailKind>> = {
    [NotificationEventCodes.PRODUCT_ORDER_PLACED]: "placed",
    [NotificationEventCodes.PRODUCT_ORDER_PAID]: "paid",
    [NotificationEventCodes.PRODUCT_ORDER_PAYMENT_FAILED]: "payment_failed",
    [NotificationEventCodes.PRODUCT_ORDER_CONFIRMED]: "confirmed",
    [NotificationEventCodes.PRODUCT_ORDER_SHIPPED]: "shipped",
    [NotificationEventCodes.PRODUCT_ORDER_DELIVERED]: "delivered",
    [NotificationEventCodes.PRODUCT_ORDER_CANCELLED]: "cancelled",
    [NotificationEventCodes.PRODUCT_ORDER_REFUNDED]: "refunded",
    [NotificationEventCodes.GIFT_CARD_ISSUED]: "gift_card_issued",
    [NotificationEventCodes.DIGITAL_DELIVERY_READY]: "digital_delivery_ready",
    [NotificationEventCodes.RETURN_REQUEST_APPROVED]: "return_approved",
    [NotificationEventCodes.RETURN_REQUEST_REJECTED]: "return_rejected",
};

function formatMoney(amount: number | undefined, languageCode: string, currencyCode?: string): string | undefined {
    if (amount == null || Number.isNaN(amount)) return undefined;
    try {
        return new Intl.NumberFormat(
            languageCode,
            currencyCode ? {style: "currency", currency: currencyCode} : {maximumFractionDigits: 2},
        ).format(amount);
    } catch {
        return currencyCode ? `${amount} ${currencyCode}` : String(amount);
    }
}

/** The ISO code of an order's currency, so amounts in emails say what money they are. */
async function resolveCurrencyCode(currency: unknown): Promise<string | undefined> {
    const currencyId = nestedEntityToRef(currency);
    if (!currencyId) return undefined;
    const doc = await Currency.findById(currencyId, {abbreviation: 1}).lean();
    return doc?.abbreviation?.toUpperCase();
}

async function resolveCompanyName(companyId: string): Promise<string> {
    const company = await companyService.findById(companyId, {}, undefined, "name");
    return company?.name ?? "";
}

/**
 * Who order emails go to: the address the buyer gave for this order (the
 * checkout contact email), else their account login. The account supplies the
 * name either way.
 */
async function resolveRecipientEmail(opts: {
    customerId?: string;
    orderEmail?: string;
}): Promise<{email: string; fullName: string; userId?: string} | null> {
    let account: {email: string; fullName: string; userId: string} | null = null;
    if (opts.customerId) {
        try {
            const user = await userService.findById(
                new ObjectId(opts.customerId),
                {},
                undefined,
                "username name surname fullName",
            );
            if (user?.username) {
                account = {
                    email: user.username,
                    fullName: user.fullName || `${user.name ?? ""} ${user.surname ?? ""}`.trim() || user.username,
                    userId: user._id.toString(),
                };
            }
        } catch {
            // fall back to the order email alone
        }
    }
    const orderEmail = opts.orderEmail?.trim();
    if (orderEmail) {
        return {email: orderEmail, fullName: account?.fullName ?? orderEmail, userId: account?.userId};
    }
    return account;
}

export type NotifyOrderOpts = {
    companyId: ObjectId | string;
    languageCode: string;
    order?: Pick<IProductOrder, "_id" | "orderNumber" | "email" | "customer" | "grandTotal"> & Partial<Pick<IProductOrder, "currency" | "currencyCode">> | null;
    orderId?: string;
    orderNumber?: string;
    orderEmail?: string;
    customerId?: string;
    extra?: {
        grandTotal?: number;
        trackingNumber?: string;
        trackingUrl?: string;
        carrier?: string;
        amount?: number;
        failureReason?: string;
        giftCardCodes?: string[];
        downloadLinks?: {productTitle: string; url: string}[];
        returnRequestId?: string;
        checkoutId?: string;
    };
    /** Skip in-app push (email only). */
    emailOnly?: boolean;
    /** Skip transactional email. */
    skipEmail?: boolean;
    /** The caller's transaction: sending waits until it commits (see runAfterCommit). */
    session?: ClientSession | null;
};

/**
 * In-app notify (when customer id present) + transactional email (order.email, else the customer's login).
 */
export async function notifyProductOrderCustomer(
    code: string,
    opts: NotifyOrderOpts,
): Promise<void> {
    if (opts.session) {
        return runAfterCommit(opts.session, () => notifyProductOrderCustomer(code, {...opts, session: undefined}));
    }
    const companyId = opts.companyId.toString();
    const customerFromOrder = opts.order ? nestedEntityToRef(opts.order.customer) : undefined;
    const customerId = opts.customerId || customerFromOrder?.toString() || "";
    const orderId = opts.orderId || opts.order?._id?.toString?.() || "";
    const orderNumber = opts.orderNumber || opts.order?.orderNumber || "";
    const orderEmail = opts.orderEmail || opts.order?.email || "";

    if (!opts.emailOnly && customerId) {
        emitNotificationEvent(code, {
            receiverIds: [customerId],
            payload: {
                companyId,
                languageCode: opts.languageCode,
                orderId,
                orderNumber,
                ...(opts.extra ?? {}),
            },
        });
    }

    if (opts.skipEmail) return;

    const emailKind = ORDER_CODE_TO_EMAIL_KIND[code];
    if (!emailKind) return;

    const recipient = await resolveRecipientEmail({customerId, orderEmail});
    if (!recipient) return;

    const companyName = await resolveCompanyName(companyId);
    const currencyCode = opts.order?.currencyCode ?? await resolveCurrencyCode(opts.order?.currency);
    await dispatchProductOrderClientEmail({
        email: recipient.email,
        userId: recipient.userId,
        fullName: recipient.fullName,
        languageCode: opts.languageCode,
        kind: emailKind,
        companyId,
        companyName,
        orderId,
        orderNumber,
        orderTotalDisplay: formatMoney(opts.extra?.grandTotal ?? opts.order?.grandTotal, opts.languageCode, currencyCode),
        trackingNumber: opts.extra?.trackingNumber || undefined,
        trackingUrl: opts.extra?.trackingUrl || undefined,
        carrier: opts.extra?.carrier || undefined,
        refundAmountDisplay: formatMoney(opts.extra?.amount, opts.languageCode, currencyCode),
        failureReason: opts.extra?.failureReason || undefined,
        giftCardCodes: opts.extra?.giftCardCodes,
        downloadLinks: opts.extra?.downloadLinks,
        returnRequestId: opts.extra?.returnRequestId || undefined,
    });
}

/**
 * Merchant in-app + email for a new product order.
 */
export async function notifyMerchantsNewOrder(opts: {
    companyId: ObjectId | string;
    languageCode: string;
    orderId: string;
    orderNumber: string;
    grandTotal?: number;
    currency?: unknown;
    session?: ClientSession | null;
}): Promise<void> {
    if (opts.session) {
        return runAfterCommit(opts.session, () => notifyMerchantsNewOrder({...opts, session: undefined}));
    }
    const currencyCode = await resolveCurrencyCode(opts.currency);
    const companyId = opts.companyId.toString();
    const receiverIds = await findCompanyAdminReceiverIds(companyId);
    if (receiverIds.length) {
        emitNotificationEvent(NotificationEventCodes.PRODUCT_ORDER_NEW_MERCHANT, {
            receiverIds,
            payload: {
                companyId,
                languageCode: opts.languageCode,
                orderId: opts.orderId,
                orderNumber: opts.orderNumber,
            },
        });
    }

    const companyName = await resolveCompanyName(companyId);
    const admins = await findCompanyAdminEmailRecipients(companyId);
    await Promise.all(
        admins.map(admin =>
            dispatchProductOrderClientEmail({
                email: admin.email,
                userId: admin.userId,
                fullName: admin.fullName,
                languageCode: opts.languageCode,
                kind: "new_order_merchant",
                companyId,
                companyName,
                orderId: opts.orderId,
                orderNumber: opts.orderNumber,
                orderTotalDisplay: formatMoney(opts.grandTotal, opts.languageCode, currencyCode),
            }),
        ),
    );
}

export async function notifyMerchantsLowStock(opts: {
    companyId: ObjectId | string;
    languageCode: string;
    inventoryId: string;
    productTitle: string;
    warehouseName: string;
    availableQuantity: number;
    reorderPoint: number;
}): Promise<void> {
    const companyId = opts.companyId.toString();
    const receiverIds = await findCompanyAdminReceiverIds(companyId);
    if (receiverIds.length) {
        emitNotificationEvent(NotificationEventCodes.INVENTORY_LOW_STOCK, {
            receiverIds,
            payload: {
                companyId,
                languageCode: opts.languageCode,
                inventoryId: opts.inventoryId,
                productTitle: opts.productTitle,
                warehouseName: opts.warehouseName,
                availableQuantity: opts.availableQuantity,
                reorderPoint: opts.reorderPoint,
            },
        });
    }

    const companyName = await resolveCompanyName(companyId);
    const admins = await findCompanyAdminEmailRecipients(companyId);
    await Promise.all(
        admins.map(admin =>
            dispatchProductOrderClientEmail({
                email: admin.email,
                userId: admin.userId,
                fullName: admin.fullName,
                languageCode: opts.languageCode,
                kind: "low_stock",
                companyId,
                companyName,
                productTitle: opts.productTitle,
                warehouseName: opts.warehouseName,
                availableQuantity: opts.availableQuantity,
                reorderPoint: opts.reorderPoint,
            }),
        ),
    );
}

export async function notifyAbandonedCartEmail(opts: {
    companyId: string;
    languageCode: string;
    userId: string;
    cartId: string;
    itemCount: number;
    subtotal?: number;
}): Promise<void> {
    const recipient = await resolveRecipientEmail({customerId: opts.userId});
    if (!recipient) return;
    const companyName = await resolveCompanyName(opts.companyId);
    await dispatchProductOrderClientEmail({
        email: recipient.email,
        userId: recipient.userId,
        fullName: recipient.fullName,
        languageCode: opts.languageCode,
        kind: "abandoned_cart",
        companyId: opts.companyId,
        companyName,
        cartId: opts.cartId,
        itemCount: opts.itemCount,
        orderTotalDisplay: formatMoney(opts.subtotal, opts.languageCode),
    });
}
