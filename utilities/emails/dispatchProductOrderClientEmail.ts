import {getProducerInstance, isKafkaConnected} from "@coreModule/connections/connectToKafka";
import {ECOMMERCE_KAFKA} from "@eCommerceModule/environment";
import type {ProductOrderClientEmailEvent} from "@eCommerceModule/kafka/types";
import {publishProductOrderClientEmailEvent} from "@eCommerceModule/kafka/kafkaProducer";
import {sendProductOrderClientMail} from "@eCommerceModule/utilities/emails/sendProductOrderClientMail";

export type DispatchProductOrderClientEmailInput = Omit<
    ProductOrderClientEmailEvent,
    "eventType" | "timestamp"
>;

/**
 * Publishes to Kafka when connected and topic is configured, otherwise sends via SMTP.
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

    const canUseKafka =
        isKafkaConnected()
        && !!getProducerInstance()
        && !!ECOMMERCE_KAFKA.TOPICS.PRODUCT_ORDER_CLIENT_EMAIL;

    if (canUseKafka) {
        await publishProductOrderClientEmailEvent(event);
    } else {
        await sendProductOrderClientMail(event);
    }
    return true;
}
