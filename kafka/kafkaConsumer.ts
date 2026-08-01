import {KAFKA} from "@coreModule/environment";
import {addKafkaTopicConsumer} from "@coreModule/kafka/kafkaConsumer";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import type {ManagerPinResetEmailEvent, ProductOrderClientEmailEvent} from "./types";
import {sendManagerPinResetMail} from "@eCommerceModule/utilities/emails/sendManagerPinResetMail";
import {sendProductOrderClientMail} from "@eCommerceModule/utilities/emails/sendProductOrderClientMail";

const logger = getLogger("eCommerce_kafka_consumer");

async function processManagerPinResetEmailEvent(event: ManagerPinResetEmailEvent): Promise<void> {
    try {
        await sendManagerPinResetMail(event);
        logger.debug(`Processed manager PIN reset email event for config ${event.configId}`);
    } catch (error: any) {
        logger.err(`Failed to process manager PIN reset email event: ${error.message}`);
        throw error;
    }
}

async function processProductOrderClientEmailEvent(event: ProductOrderClientEmailEvent): Promise<void> {
    try {
        await sendProductOrderClientMail(event);
        logger.debug(`Processed product order client email event kind=${event.kind}`);
    } catch (error: any) {
        logger.err(`Failed to process product order client email event: ${error.message}`);
        throw error;
    }
}

export async function startECommerceKafkaConsumers(parentLogger?: serverLogger): Promise<void> {
    if (!KAFKA.ENABLED) {
        const log = getLogger("eCommerce_kafka_consumers", parentLogger);
        log.warn("Kafka is disabled; skipping eCommerce consumers.");
        return;
    }

    const umbrellaLog = getLogger("eCommerce_kafka_consumers", parentLogger);
    umbrellaLog.start("Starting eCommerce Kafka consumers");

    try {
        await addKafkaTopicConsumer(parentLogger, {
            registryKey: "managerPinResetEmail",
            displayName: "Manager PIN reset email",
            groupId: KAFKA.CONSUMER_GROUP.MANAGER_PIN_RESET_EMAIL,
            topic: KAFKA.TOPICS.MANAGER_PIN_RESET_EMAIL,
            expectedEventType: "manager_pin_reset_email",
            processEvent: (d) => processManagerPinResetEmailEvent(d as ManagerPinResetEmailEvent),
        });
    } catch (err: any) {
        umbrellaLog.err(`Manager PIN reset email consumer failed: ${err?.message}`);
    }

    try {
        await addKafkaTopicConsumer(parentLogger, {
            registryKey: "productOrderClientEmail",
            displayName: "Product order client email",
            groupId: KAFKA.CONSUMER_GROUP.PRODUCT_ORDER_CLIENT_EMAIL,
            topic: KAFKA.TOPICS.PRODUCT_ORDER_CLIENT_EMAIL,
            expectedEventType: "product_order_client_email",
            processEvent: (d) => processProductOrderClientEmailEvent(d as ProductOrderClientEmailEvent),
        });
    } catch (err: any) {
        umbrellaLog.err(`Product order client email consumer failed: ${err?.message}`);
    }

    umbrellaLog.finish("eCommerce Kafka consumers startup pass complete");
}
