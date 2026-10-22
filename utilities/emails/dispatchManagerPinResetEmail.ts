import type {ManagerPinResetEmailEvent} from "@eCommerceModule/kafka/types";
import {publishManagerPinResetEmailEvent} from "@eCommerceModule/kafka/kafkaProducer";
import {sendManagerPinResetMail} from "@eCommerceModule/utilities/emails/sendManagerPinResetMail";

export type DispatchManagerPinResetEmailInput = Omit<
    ManagerPinResetEmailEvent,
    "eventType" | "timestamp"
>;

/**
 * Publishes to Kafka, or sends via SMTP when Kafka is unavailable or the publish fails.
 */
export async function dispatchManagerPinResetEmail(
    input: DispatchManagerPinResetEmailInput,
): Promise<void> {
    const event: ManagerPinResetEmailEvent = {
        eventType: "manager_pin_reset_email",
        timestamp: Date.now(),
        ...input,
    };

    if (!(await publishManagerPinResetEmailEvent(event))) {
        await sendManagerPinResetMail(event);
    }
}
