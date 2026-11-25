import {beforeEach, describe, expect, it, vi} from "vitest";
import {ObjectId} from "mongodb";

const dispatch = vi.fn(async (_email: Record<string, unknown>) => undefined);
vi.mock("@eCommerceModule/utilities/emails/dispatchProductOrderClientEmail", () => ({
    dispatchProductOrderClientEmail: (email: Record<string, unknown>) => dispatch(email),
}));
vi.mock("@coreModule/domain/notifications/notificationEventBus", () => ({emitNotificationEvent: vi.fn()}));
const sellerAccount = {holder: "Shop sh.p.k.", iban: "AL47212110090000000235698741", bic: "BKTRALTR", bankName: "BKT"};
const findCompany = vi.fn(async (_id: unknown, _options: unknown, _populate: unknown, select: string) =>
    (select.includes("bankAccount") ? {name: "Shop", bankAccount: sellerAccount} : {name: "Shop"}));
vi.mock("@coreModule/database/schemas/company/company.service", () => ({
    companyService: {findById: (id: unknown, options: unknown, populate: unknown, select: string) => findCompany(id, options, populate, select)},
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

// D190: the order email tells a bank-transfer buyer where to pay: the account of the order's own seller.
describe("order placed email for a bank transfer", () => {
    beforeEach(() => {
        dispatch.mockClear();
        findCompany.mockClear();
    });

    const placed = (seller: ObjectId, paymentMethod: string) => notifyProductOrderCustomer(NotificationEventCodes.PRODUCT_ORDER_PLACED, {
        companyId: seller, languageCode: "en-US",
        order: {...order("contact@example.com"), paymentMethod, paymentStatus: "unpaid", status: "pending"},
    });

    it("carries the seller's bank account, read from the order's own seller", async () => {
        const seller = new ObjectId();
        await placed(seller, "bank_transfer");
        expect(dispatch.mock.calls[0][0]).toMatchObject({kind: "placed", bankTransfer: sellerAccount, companyName: "Shop"});
        expect(findCompany.mock.calls.map(call => String(call[0]))).toEqual([seller.toString()]);
    });

    it("leaves it out for cash on delivery", async () => {
        await placed(new ObjectId(), "cod");
        expect(dispatch.mock.calls[0][0].bankTransfer).toBeUndefined();
    });
});
