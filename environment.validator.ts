import type {ModuleEnvironmentContext, ValidationError} from "@coreModule/environment/validator";

/** eCommerce's boot checks (D67): the manager-PIN and order email Kafka topics, while Kafka is on. */
export function validateEnvironment({env, kafkaEnabled, validateString}: ModuleEnvironmentContext): ValidationError[] {
    if (!kafkaEnabled) return [];
    return [
        validateString("KAFKA_TOPIC_MANAGER_PIN_RESET_EMAIL", env.KAFKA_TOPIC_MANAGER_PIN_RESET_EMAIL, true),
        validateString("KAFKA_TOPIC_PRODUCT_ORDER_CLIENT_EMAIL", env.KAFKA_TOPIC_PRODUCT_ORDER_CLIENT_EMAIL, true),
        validateString("KAFKA_CONSUMER_GROUP_MANAGER_PIN_RESET_EMAIL", env.KAFKA_CONSUMER_GROUP_MANAGER_PIN_RESET_EMAIL, true),
        validateString("KAFKA_CONSUMER_GROUP_PRODUCT_ORDER_CLIENT_EMAIL", env.KAFKA_CONSUMER_GROUP_PRODUCT_ORDER_CLIENT_EMAIL, true),
    ].filter((error): error is ValidationError => error !== null);
}
