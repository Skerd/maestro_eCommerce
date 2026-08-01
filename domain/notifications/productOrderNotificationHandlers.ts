import {ObjectId} from "mongodb";
import {type NotificationEvent, notificationEventBus} from "@coreModule/domain/notifications/notificationEventBus";
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
    | typeof NotificationEventCodes.PRODUCT_ORDER_CONFIRMED
    | typeof NotificationEventCodes.PRODUCT_ORDER_SHIPPED
    | typeof NotificationEventCodes.PRODUCT_ORDER_DELIVERED
    | typeof NotificationEventCodes.PRODUCT_ORDER_CANCELLED
    | typeof NotificationEventCodes.PRODUCT_ORDER_REFUNDED
    | typeof NotificationEventCodes.PRODUCT_ORDER_NEW_MERCHANT
    | typeof NotificationEventCodes.GIFT_CARD_ISSUED
    | typeof NotificationEventCodes.DIGITAL_DELIVERY_READY
    | typeof NotificationEventCodes.RETURN_REQUEST_CREATED
    | typeof NotificationEventCodes.RETURN_REQUEST_APPROVED
    | typeof NotificationEventCodes.RETURN_REQUEST_REJECTED
    | typeof NotificationEventCodes.INVENTORY_LOW_STOCK;

const DESCRIPTIONS: Record<ProductOrderCode, (payload: Record<string, unknown>) => string> = {
    [NotificationEventCodes.PRODUCT_ORDER_PLACED]: p => `Order ${p.orderNumber ?? ""} has been placed`,
    [NotificationEventCodes.PRODUCT_ORDER_PAID]: p => `Payment received for order ${p.orderNumber ?? ""}`,
    [NotificationEventCodes.PRODUCT_ORDER_PAYMENT_FAILED]: p => `Payment failed for order ${p.orderNumber ?? ""}`,
    [NotificationEventCodes.PRODUCT_ORDER_CONFIRMED]: p => `Order ${p.orderNumber ?? ""} has been confirmed`,
    [NotificationEventCodes.PRODUCT_ORDER_SHIPPED]: p => `Order ${p.orderNumber ?? ""} has been shipped`,
    [NotificationEventCodes.PRODUCT_ORDER_DELIVERED]: p => `Order ${p.orderNumber ?? ""} has been delivered`,
    [NotificationEventCodes.PRODUCT_ORDER_CANCELLED]: p => `Order ${p.orderNumber ?? ""} has been cancelled`,
    [NotificationEventCodes.PRODUCT_ORDER_REFUNDED]: p => `Order ${p.orderNumber ?? ""} has been refunded`,
    [NotificationEventCodes.PRODUCT_ORDER_NEW_MERCHANT]: p => `New order ${p.orderNumber ?? ""} received`,
    [NotificationEventCodes.GIFT_CARD_ISSUED]: p => `Gift card issued for order ${p.orderNumber ?? ""}`,
    [NotificationEventCodes.DIGITAL_DELIVERY_READY]: p => `Digital downloads ready for order ${p.orderNumber ?? ""}`,
    [NotificationEventCodes.RETURN_REQUEST_CREATED]: p => `Return request for order ${p.orderNumber ?? ""}`,
    [NotificationEventCodes.RETURN_REQUEST_APPROVED]: p => `Return approved for order ${p.orderNumber ?? ""}`,
    [NotificationEventCodes.RETURN_REQUEST_REJECTED]: p => `Return rejected for order ${p.orderNumber ?? ""}`,
    [NotificationEventCodes.INVENTORY_LOW_STOCK]: p =>
        `Low stock: ${p.productTitle ?? "product"} @ ${p.warehouseName ?? "warehouse"} (${p.availableQuantity ?? 0} left)`,
};

const IMPORTANCE: Record<ProductOrderCode, NotificationImportance> = {
    [NotificationEventCodes.PRODUCT_ORDER_PLACED]: NotificationImportance.MEDIUM,
    [NotificationEventCodes.PRODUCT_ORDER_PAID]: NotificationImportance.HIGH,
    [NotificationEventCodes.PRODUCT_ORDER_PAYMENT_FAILED]: NotificationImportance.HIGH,
    [NotificationEventCodes.PRODUCT_ORDER_CONFIRMED]: NotificationImportance.MEDIUM,
    [NotificationEventCodes.PRODUCT_ORDER_SHIPPED]: NotificationImportance.MEDIUM,
    [NotificationEventCodes.PRODUCT_ORDER_DELIVERED]: NotificationImportance.MEDIUM,
    [NotificationEventCodes.PRODUCT_ORDER_CANCELLED]: NotificationImportance.HIGH,
    [NotificationEventCodes.PRODUCT_ORDER_REFUNDED]: NotificationImportance.HIGH,
    [NotificationEventCodes.PRODUCT_ORDER_NEW_MERCHANT]: NotificationImportance.HIGH,
    [NotificationEventCodes.GIFT_CARD_ISSUED]: NotificationImportance.HIGH,
    [NotificationEventCodes.DIGITAL_DELIVERY_READY]: NotificationImportance.HIGH,
    [NotificationEventCodes.RETURN_REQUEST_CREATED]: NotificationImportance.HIGH,
    [NotificationEventCodes.RETURN_REQUEST_APPROVED]: NotificationImportance.MEDIUM,
    [NotificationEventCodes.RETURN_REQUEST_REJECTED]: NotificationImportance.MEDIUM,
    [NotificationEventCodes.INVENTORY_LOW_STOCK]: NotificationImportance.HIGH,
};

function bindHandler(code: ProductOrderCode): void {
    notificationEventBus.on(code, async (event: NotificationEvent) => {
        const {receiverIds, payload} = event;
        const opts = langOpts(event);

        for (const receiverId of receiverIds) {
            try {
                await createAndPushNotification(
                    {
                        receiver: new ObjectId(receiverId),
                        company: new ObjectId(payload.companyId as string),
                        code,
                        description: DESCRIPTIONS[code](payload),
                        content: {
                            orderId: payload.orderId,
                            orderNumber: payload.orderNumber,
                            cartId: payload.cartId,
                            returnRequestId: payload.returnRequestId,
                            inventoryId: payload.inventoryId,
                            productTitle: payload.productTitle,
                            warehouseName: payload.warehouseName,
                            availableQuantity: payload.availableQuantity,
                            reorderPoint: payload.reorderPoint,
                            trackingNumber: payload.trackingNumber,
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
    bindHandler(NotificationEventCodes.PRODUCT_ORDER_CONFIRMED);
    bindHandler(NotificationEventCodes.PRODUCT_ORDER_SHIPPED);
    bindHandler(NotificationEventCodes.PRODUCT_ORDER_DELIVERED);
    bindHandler(NotificationEventCodes.PRODUCT_ORDER_CANCELLED);
    bindHandler(NotificationEventCodes.PRODUCT_ORDER_REFUNDED);
    bindHandler(NotificationEventCodes.PRODUCT_ORDER_NEW_MERCHANT);
    bindHandler(NotificationEventCodes.GIFT_CARD_ISSUED);
    bindHandler(NotificationEventCodes.DIGITAL_DELIVERY_READY);
    bindHandler(NotificationEventCodes.RETURN_REQUEST_CREATED);
    bindHandler(NotificationEventCodes.RETURN_REQUEST_APPROVED);
    bindHandler(NotificationEventCodes.RETURN_REQUEST_REJECTED);
    bindHandler(NotificationEventCodes.INVENTORY_LOW_STOCK);
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
