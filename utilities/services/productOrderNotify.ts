import {ObjectId} from "mongodb";
import {emitNotificationEvent} from "@coreModule/domain/notifications/notificationEventBus";
import {userService} from "@coreModule/database/schemas/user/user.service";
import Company from "@coreModule/database/schemas/company/company";
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

function formatMoney(amount: number | undefined, languageCode: string): string | undefined {
    if (amount == null || Number.isNaN(amount)) return undefined;
    try {
        return new Intl.NumberFormat(languageCode, {maximumFractionDigits: 2}).format(amount);
    } catch {
        return String(amount);
    }
}

async function resolveCompanyName(companyId: string): Promise<string> {
    const company = await Company.findById(companyId).select("name").lean();
    return (company as any)?.name ?? "";
}

async function resolveRecipientEmail(opts: {
    customerId?: string;
    orderEmail?: string;
}): Promise<{email: string; fullName: string; userId?: string} | null> {
    if (opts.customerId) {
        try {
            const user = await userService.findById(
                new ObjectId(opts.customerId),
                {},
                undefined,
                "username name surname fullName",
            );
            if (user?.username) {
                return {
                    email: user.username,
                    fullName: user.fullName || `${user.name ?? ""} ${user.surname ?? ""}`.trim() || user.username,
                    userId: user._id.toString(),
                };
            }
        } catch {
            // fall through to order email
        }
    }
    if (opts.orderEmail?.trim()) {
        return {email: opts.orderEmail.trim(), fullName: opts.orderEmail.trim()};
    }
    return null;
}

export type NotifyOrderOpts = {
    companyId: ObjectId | string;
    languageCode: string;
    order?: Pick<IProductOrder, "_id" | "orderNumber" | "email" | "customer" | "grandTotal"> | null;
    orderId?: string;
    orderNumber?: string;
    orderEmail?: string;
    customerId?: string;
    extra?: Record<string, unknown>;
    /** Skip in-app push (email only). */
    emailOnly?: boolean;
    /** Skip transactional email. */
    skipEmail?: boolean;
};

/**
 * In-app notify (when customer id present) + transactional email (customer user email or order.email).
 */
export async function notifyProductOrderCustomer(
    code: string,
    opts: NotifyOrderOpts,
): Promise<void> {
    const companyId = opts.companyId.toString();
    const customerId =
        opts.customerId
        || ((opts.order?.customer as any)?._id ?? opts.order?.customer)?.toString?.()
        || "";
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
        orderTotalDisplay: formatMoney(
            (opts.extra?.grandTotal as number | undefined) ?? (opts.order as any)?.grandTotal,
            opts.languageCode,
        ),
        trackingNumber: (opts.extra?.trackingNumber as string) || undefined,
        trackingUrl: (opts.extra?.trackingUrl as string) || undefined,
        carrier: (opts.extra?.carrier as string) || undefined,
        refundAmountDisplay: formatMoney(opts.extra?.amount as number | undefined, opts.languageCode),
        failureReason: (opts.extra?.failureReason as string) || undefined,
        giftCardCodes: opts.extra?.giftCardCodes as string[] | undefined,
        downloadLinks: opts.extra?.downloadLinks as {productTitle: string; url: string}[] | undefined,
        returnRequestId: (opts.extra?.returnRequestId as string) || undefined,
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
}): Promise<void> {
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
                orderTotalDisplay: formatMoney(opts.grandTotal, opts.languageCode),
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
