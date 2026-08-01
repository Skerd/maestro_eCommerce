export type ManagerPinResetEmailEvent = {
    eventType: "manager_pin_reset_email";
    email: string;
    userId: string;
    fullName: string;
    configId: string;
    configName: string;
    resetCode: string;
    languageCode: string;
    timestamp: number;
    companyId?: string;
};

export type ProductOrderClientEmailKind =
    | "placed"
    | "paid"
    | "payment_failed"
    | "confirmed"
    | "shipped"
    | "delivered"
    | "cancelled"
    | "refunded"
    | "abandoned_cart"
    | "gift_card_issued"
    | "digital_delivery_ready"
    | "return_approved"
    | "return_rejected"
    | "new_order_merchant"
    | "low_stock";

export type ProductOrderClientEmailEvent = {
    eventType: "product_order_client_email";
    email: string;
    userId?: string;
    fullName: string;
    languageCode: string;
    timestamp: number;
    kind: ProductOrderClientEmailKind;
    companyId: string;
    companyName: string;
    orderId?: string;
    orderNumber?: string;
    orderTotalDisplay?: string;
    trackingNumber?: string;
    trackingUrl?: string;
    carrier?: string;
    refundAmountDisplay?: string;
    failureReason?: string;
    cartId?: string;
    itemCount?: number;
    giftCardCodes?: string[];
    downloadLinks?: {productTitle: string; url: string}[];
    returnRequestId?: string;
    productTitle?: string;
    warehouseName?: string;
    availableQuantity?: number;
    reorderPoint?: number;
};
