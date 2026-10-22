import type {ProductOrderClientEmailEvent} from "@eCommerceModule/kafka/types";
import {publishProductOrderClientEmailEvent} from "@eCommerceModule/kafka/kafkaProducer";
import {sendProductOrderClientMail} from "@eCommerceModule/utilities/emails/sendProductOrderClientMail";

export type DispatchProductOrderClientEmailInput = Omit<
    ProductOrderClientEmailEvent,
    "eventType" | "timestamp"
>;

/**
 * Publishes to Kafka, or sends via SMTP when Kafka or the topic is unavailable or the publish fails.
 */
export async function dispatchProductOrderClientEmail(
    input: DispatchProductOrderClientEmailInput,
): Promise<boolean> {
    if (!input.email?.trim()) {
        return false;
    }

    const event: ProductOrderClientEmailEvent = {
        eventType: "product_order_client_email",
        timestamp: Date.now(),
        ...input,
        email: input.email.trim(),
    };

    if (!(await publishProductOrderClientEmailEvent(event))) {
        await sendProductOrderClientMail(event);
    }
    return true;
}
