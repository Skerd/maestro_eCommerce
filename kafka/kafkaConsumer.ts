import {KAFKA} from "@coreModule/environment";
import {addKafkaTopicConsumer} from "@coreModule/kafka/kafkaConsumer";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import type {ManagerPinResetEmailEvent} from "./types";
import {sendManagerPinResetMail} from "@eCommerceModule/utilities/emails/sendManagerPinResetMail";

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

    umbrellaLog.finish("eCommerce Kafka consumers startup pass complete");
}
