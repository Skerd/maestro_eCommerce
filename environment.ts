/**
 * Commerce calculation providers and eCommerce Kafka topics.
 * "internal" tax/shipping uses the zone engines; adapters register under their own name.
 */
export const COMMERCE_PROVIDERS = {
    TAX_PROVIDER: process.env.TAX_PROVIDER || "internal",
    SHIPPING_PROVIDER: process.env.SHIPPING_PROVIDER || "internal",
};

export const ECOMMERCE_KAFKA = {
    TOPICS: {
        MANAGER_PIN_RESET_EMAIL: process.env.KAFKA_TOPIC_MANAGER_PIN_RESET_EMAIL,
        PRODUCT_ORDER_CLIENT_EMAIL: process.env.KAFKA_TOPIC_PRODUCT_ORDER_CLIENT_EMAIL,
    },
    CONSUMER_GROUP: {
        MANAGER_PIN_RESET_EMAIL: process.env.KAFKA_CONSUMER_GROUP_MANAGER_PIN_RESET_EMAIL,
        PRODUCT_ORDER_CLIENT_EMAIL: process.env.KAFKA_CONSUMER_GROUP_PRODUCT_ORDER_CLIENT_EMAIL,
    },
};
