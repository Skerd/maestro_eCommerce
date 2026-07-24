import {beforeAll, describe, expect, it} from "vitest";
import Stripe from "stripe";

const WEBHOOK_SECRET = "whsec_test_secret";

// PAYMENTS env is read when @coreModule/environment loads, so stub the vars
// before dynamically importing the adapter.
process.env.STRIPE_ENABLED = "true";
process.env.STRIPE_SECRET_KEY = "sk_test_dummy";
process.env.STRIPE_WEBHOOK_SECRET = WEBHOOK_SECRET;

let stripeAdapter: typeof import("@eCommerceModule/utilities/services/payment/stripeAdapter")["stripeAdapter"];

beforeAll(async () => {
    ({stripeAdapter} = await import("@eCommerceModule/utilities/services/payment/stripeAdapter"));
});

function signedHeader(payload: string, secret = WEBHOOK_SECRET) {
    return Stripe.webhooks.generateTestHeaderString({payload, secret});
}

describe("stripeAdapter webhook verification", () => {
    const payload = JSON.stringify({
        id: "evt_test_1",
        object: "event",
        type: "payment_intent.succeeded",
        data: {object: {id: "pi_test_1", object: "payment_intent", status: "succeeded"}},
    });

    it("is enabled when env is configured", () => {
        expect(stripeAdapter.isEnabled()).toBe(true);
    });

    it("accepts a correctly signed payload", () => {
        const event = stripeAdapter.constructWebhookEvent(payload, signedHeader(payload));
        expect(event.id).toBe("evt_test_1");
        expect(event.type).toBe("payment_intent.succeeded");
        expect((event.data as any).id).toBe("pi_test_1");
    });

    it("rejects a payload signed with the wrong secret", () => {
        expect(() =>
            stripeAdapter.constructWebhookEvent(payload, signedHeader(payload, "whsec_wrong")),
        ).toThrow();
    });

    it("rejects a tampered payload", () => {
        const header = signedHeader(payload);
        const tampered = payload.replace("pi_test_1", "pi_evil_1");
        expect(() => stripeAdapter.constructWebhookEvent(tampered, header)).toThrow();
    });

    it("rejects a garbage signature header", () => {
        expect(() => stripeAdapter.constructWebhookEvent(payload, "t=1,v1=deadbeef")).toThrow();
    });
});
