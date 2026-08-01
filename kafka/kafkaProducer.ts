import {getProducerInstance} from "@coreModule/connections/connectToKafka";
import {KAFKA} from "@coreModule/environment";
import {canPublish, publishWithRetry} from "@coreModule/kafka/kafkaProducer";
import {getLogger} from "@coreModule/loggers/serverLog";
import type {ManagerPinResetEmailEvent, ProductOrderClientEmailEvent} from "./types";

const logger = getLogger("eCommerce_kafka_producer");

/**
 * Publish manager-PIN reset email event (fire-and-forget; mirrors forgot-password).
 */
export async function publishManagerPinResetEmailEvent(
    params: ManagerPinResetEmailEvent,
): Promise<void> {
    if (!canPublish(logger)) {
        return;
    }

    const producer = getProducerInstance();
    const topic = KAFKA.TOPICS.MANAGER_PIN_RESET_EMAIL;
    if (!producer || !topic) {
        logger.warn("Kafka producer or topic not available, skipping manager PIN reset email event");
        return;
    }

    try {
        await publishWithRetry(
            topic,
            {
                key: params.configId.toString(),
                value: JSON.stringify(params),
                headers: {
                    "event-type": "manager_pin_reset_email",
                    timestamp: new Date(params.timestamp).toISOString(),
                },
            },
            KAFKA.PRODUCER_MAX_RETRIES,
            logger,
        );
        logger.debug(`Published manager PIN reset email event for config ${params.configId}`);
    } catch (error: any) {
        logger.err(
            `Failed to publish manager PIN reset email event for config ${params.configId}: ${error.message}`,
        );
    }
}

/**
 * Publish product-order / cart transactional email event.
 */
export async function publishProductOrderClientEmailEvent(
    params: ProductOrderClientEmailEvent,
): Promise<void> {
    if (!canPublish(logger)) {
        return;
    }

    const producer = getProducerInstance();
    const topic = KAFKA.TOPICS.PRODUCT_ORDER_CLIENT_EMAIL;
    if (!producer || !topic) {
        logger.warn("Kafka producer or topic not available, skipping product order client email event");
        return;
    }

    try {
        await publishWithRetry(
            topic,
            {
                key: (params.orderId || params.cartId || params.userId || params.email).toString(),
                value: JSON.stringify(params),
                headers: {
                    "event-type": "product_order_client_email",
                    timestamp: new Date(params.timestamp).toISOString(),
                },
            },
            KAFKA.PRODUCER_MAX_RETRIES,
            logger,
        );
        logger.debug(`Published product order client email event kind=${params.kind}`);
    } catch (error: any) {
        logger.err(`Failed to publish product order client email event: ${error.message}`);
    }
}
