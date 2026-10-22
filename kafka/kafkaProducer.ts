import {ECOMMERCE_KAFKA} from "@eCommerceModule/environment";
import {publishEvent} from "@coreModule/kafka/kafkaProducer";
import {getLogger} from "@coreModule/loggers/serverLog";
import type {ManagerPinResetEmailEvent, ProductOrderClientEmailEvent} from "./types";

const logger = getLogger("eCommerce_kafka_producer");

/**
 * Publish manager-PIN reset email event (mirrors forgot-password).
 * @returns false when not published, so the caller sends the email directly
 */
export function publishManagerPinResetEmailEvent(
    params: ManagerPinResetEmailEvent,
): Promise<boolean> {
    return publishEvent(ECOMMERCE_KAFKA.TOPICS.MANAGER_PIN_RESET_EMAIL, params.configId.toString(), params, logger);
}

/**
 * Publish product-order / cart transactional email event.
 * @returns false when not published, so the caller sends the email directly
 */
export function publishProductOrderClientEmailEvent(
    params: ProductOrderClientEmailEvent,
): Promise<boolean> {
    return publishEvent(
        ECOMMERCE_KAFKA.TOPICS.PRODUCT_ORDER_CLIENT_EMAIL,
        (params.orderId || params.cartId || params.userId || params.email).toString(),
        params,
        logger,
    );
}
