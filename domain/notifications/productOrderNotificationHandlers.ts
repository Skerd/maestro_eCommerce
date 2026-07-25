import {ObjectId} from "mongodb";
import {type NotificationEvent, notificationEventBus, } from "@coreModule/domain/notifications/notificationEventBus";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";
import {createAndPushNotification} from "@coreModule/domain/notifications/notificationDomainService";
import {NotificationCategory} from "armonia/src/modules/core/api/user/private/notifications/notifications.enum";
import {NotificationImportance} from "@coreModule/database/schemas/notification/notification";

function langOpts(event: NotificationEvent) {
    return {languageCode: (event.payload.languageCode as string) ?? "en-US"};
}

type ProductOrderCode =
    | typeof NotificationEventCodes.PRODUCT_ORDER_PLACED
    | typeof NotificationEventCodes.PRODUCT_ORDER_PAID
    | typeof NotificationEventCodes.PRODUCT_ORDER_PAYMENT_FAILED
    | typeof NotificationEventCodes.PRODUCT_ORDER_SHIPPED
    | typeof NotificationEventCodes.PRODUCT_ORDER_CANCELLED
    | typeof NotificationEventCodes.PRODUCT_ORDER_REFUNDED;

const DESCRIPTIONS: Record<ProductOrderCode, (orderNumber: string) => string> = {
    [NotificationEventCodes.PRODUCT_ORDER_PLACED]: n => `Order ${n} has been placed`,
    [NotificationEventCodes.PRODUCT_ORDER_PAID]: n => `Payment received for order ${n}`,
    [NotificationEventCodes.PRODUCT_ORDER_PAYMENT_FAILED]: n => `Payment failed for order ${n}`,
    [NotificationEventCodes.PRODUCT_ORDER_SHIPPED]: n => `Order ${n} has been shipped`,
    [NotificationEventCodes.PRODUCT_ORDER_CANCELLED]: n => `Order ${n} has been cancelled`,
    [NotificationEventCodes.PRODUCT_ORDER_REFUNDED]: n => `Order ${n} has been refunded`,
};

const IMPORTANCE: Record<ProductOrderCode, NotificationImportance> = {
    [NotificationEventCodes.PRODUCT_ORDER_PLACED]: NotificationImportance.MEDIUM,
    [NotificationEventCodes.PRODUCT_ORDER_PAID]: NotificationImportance.HIGH,
    [NotificationEventCodes.PRODUCT_ORDER_PAYMENT_FAILED]: NotificationImportance.HIGH,
    [NotificationEventCodes.PRODUCT_ORDER_SHIPPED]: NotificationImportance.MEDIUM,
    [NotificationEventCodes.PRODUCT_ORDER_CANCELLED]: NotificationImportance.HIGH,
    [NotificationEventCodes.PRODUCT_ORDER_REFUNDED]: NotificationImportance.HIGH,
};

function bindHandler(code: ProductOrderCode): void {
    notificationEventBus.on(code, async (event: NotificationEvent) => {
        const {receiverIds, payload} = event;
        const opts = langOpts(event);
        const orderNumber = (payload.orderNumber as string) ?? "";

        for (const receiverId of receiverIds) {
            try {
                await createAndPushNotification(
                    {
                        receiver: new ObjectId(receiverId),
                        company: new ObjectId(payload.companyId as string),
                        code,
                        description: DESCRIPTIONS[code](orderNumber),
                        content: {
                            orderId: payload.orderId,
                            orderNumber,
                        },
                        importance: IMPORTANCE[code],
                        category: NotificationCategory.SYSTEM,
                    },
                    opts,
                );
            } catch (e) {
                console.error(`Failed to create ${code} notification for ${receiverId}:`, e);
            }
        }
    });
}

export function registerProductOrderNotificationHandlers(): void {
    bindHandler(NotificationEventCodes.PRODUCT_ORDER_PLACED);
    bindHandler(NotificationEventCodes.PRODUCT_ORDER_PAID);
    bindHandler(NotificationEventCodes.PRODUCT_ORDER_PAYMENT_FAILED);
    bindHandler(NotificationEventCodes.PRODUCT_ORDER_SHIPPED);
    bindHandler(NotificationEventCodes.PRODUCT_ORDER_CANCELLED);
    bindHandler(NotificationEventCodes.PRODUCT_ORDER_REFUNDED);
}

export function registerAbandonedCartNotificationHandlers(): void {
    notificationEventBus.on(NotificationEventCodes.ABANDONED_CART, async (event: NotificationEvent) => {
        const {receiverIds, payload} = event;
        const opts = langOpts(event);
        const itemCount = (payload.itemCount as number) ?? 0;

        for (const receiverId of receiverIds) {
            try {
                await createAndPushNotification(
                    {
                        receiver: new ObjectId(receiverId),
                        company: new ObjectId(payload.companyId as string),
                        code: NotificationEventCodes.ABANDONED_CART,
                        description: `You left ${itemCount} item${itemCount === 1 ? "" : "s"} in your cart — complete your order`,
                        content: {
                            cartId: payload.cartId,
                            itemCount,
                            subtotal: payload.subtotal,
                        },
                        importance: NotificationImportance.LOW,
                        category: NotificationCategory.SYSTEM,
                    },
                    opts,
                );
            } catch (e) {
                console.error(`Failed to create ABANDONED_CART notification for ${receiverId}:`, e);
            }
        }
    });
}
