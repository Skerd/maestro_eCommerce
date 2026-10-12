import {beforeEach, describe, expect, it, vi} from "vitest";
import {ObjectId} from "mongodb";

const dispatch = vi.fn(async (_email: Record<string, unknown>) => undefined);
vi.mock("@eCommerceModule/utilities/emails/dispatchProductOrderClientEmail", () => ({
    dispatchProductOrderClientEmail: (email: Record<string, unknown>) => dispatch(email),
}));
vi.mock("@coreModule/domain/notifications/notificationEventBus", () => ({emitNotificationEvent: vi.fn()}));
vi.mock("@coreModule/database/schemas/company/company.service", () => ({
    companyService: {findById: vi.fn(async () => ({name: "Shop"}))},
}));
const customerId = new ObjectId();
vi.mock("@coreModule/database/schemas/user/user.service", () => ({
    userService: {
        findById: vi.fn(async () => ({_id: customerId, username: "login@example.com", name: "Ada", surname: "Lovelace"})),
    },
}));

import {notifyProductOrderCustomer} from "@eCommerceModule/utilities/services/productOrderNotify";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";

const order = (email?: string) => ({
    _id: new ObjectId(), orderNumber: "ORD-1", email, customer: customerId, grandTotal: 12.5, currencyCode: "EUR",
}) as any;

describe("order email recipient (N-08)", () => {
    beforeEach(() => {
        dispatch.mockClear();
    });

    it("writes to the contact email given at checkout, named after the account", async () => {
        await notifyProductOrderCustomer(NotificationEventCodes.PRODUCT_ORDER_PLACED, {
            companyId: new ObjectId(), languageCode: "en-US", order: order("contact@example.com"),
        });
        expect(dispatch.mock.calls[0][0]).toMatchObject({
            email: "contact@example.com", fullName: "Ada Lovelace", userId: customerId.toString(),
        });
    });

    it("falls back to the account login when the order has no contact email", async () => {
        await notifyProductOrderCustomer(NotificationEventCodes.PRODUCT_ORDER_PLACED, {
            companyId: new ObjectId(), languageCode: "en-US", order: order(),
        });
        expect(dispatch.mock.calls[0][0]).toMatchObject({email: "login@example.com"});
    });
});
