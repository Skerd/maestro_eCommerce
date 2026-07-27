import {isKafkaConnected} from "@coreModule/connections/connectToKafka";
import type {ManagerPinResetEmailEvent} from "@eCommerceModule/kafka/types";
import {publishManagerPinResetEmailEvent} from "@eCommerceModule/kafka/kafkaProducer";
import {sendManagerPinResetMail} from "@eCommerceModule/utilities/emails/sendManagerPinResetMail";

export type DispatchManagerPinResetEmailInput = Omit<
    ManagerPinResetEmailEvent,
    "eventType" | "timestamp"
>;

/**
 * Publishes to Kafka when connected, otherwise sends via SMTP (same split as forgot-password).
 */
export async function dispatchManagerPinResetEmail(
    input: DispatchManagerPinResetEmailInput,
): Promise<void> {
    const event: ManagerPinResetEmailEvent = {
        eventType: "manager_pin_reset_email",
        timestamp: Date.now(),
        ...input,
    };

    if (isKafkaConnected()) {
        await publishManagerPinResetEmailEvent(event);
    } else {
        await sendManagerPinResetMail(event);
    }
}
