import notificationTexts from "armonia/src/modules/eCommerce/helpers/static/notificationTypes/en_US.json";
import {beforeAll, beforeEach, describe, expect, it, vi} from "vitest";
import {ObjectId} from "mongodb";
import type {createAndPushNotification} from "@coreModule/domain/notifications/notificationDomainService";

const mocks = vi.hoisted(() => ({createAndPush: vi.fn<Parameters<typeof createAndPushNotification>, Promise<object>>()}));

// The notification itself is recorded, not stored or pushed.
vi.mock("@coreModule/domain/notifications/notificationDomainService", () => ({createAndPushNotification: mocks.createAndPush}));

import {notificationEventBus} from "@coreModule/domain/notifications/notificationEventBus";
import {
    registerAbandonedCartNotificationHandlers,
    registerProductOrderNotificationHandlers,
} from "@eCommerceModule/domain/notifications/productOrderNotificationHandlers";
import {NotificationEventCodes} from "@eCommerceModule/domain/notifications/notificationEventCodes";

const companyId = new ObjectId().toString();
const receiver = new ObjectId().toString();

async function paramsOf(code: string, payload: Record<string, unknown>) {
    mocks.createAndPush.mockReset().mockResolvedValue({});
    notificationEventBus.emit(code, {code, receiverIds: [receiver], payload: {companyId, ...payload}});
    await vi.waitFor(() => expect(mocks.createAndPush).toHaveBeenCalledTimes(1));
    return mocks.createAndPush.mock.calls[0][0].params;
}

beforeAll(() => {
    registerProductOrderNotificationHandlers();
    registerAbandonedCartNotificationHandlers();
});

beforeEach(() => {
    mocks.createAndPush.mockReset().mockResolvedValue({});
});

// TD-B173: shop notices stored only English text, so they were neither translated nor listed to turn off.
describe("eCommerce notices carry their message values (D117)", () => {
    it("names the order, the stock line and the cart size", async () => {
        expect(await paramsOf(NotificationEventCodes.PRODUCT_ORDER_SHIPPED, {orderNumber: "SO-7"})).toEqual({order: "SO-7"});
        expect(await paramsOf(NotificationEventCodes.INVENTORY_LOW_STOCK, {productTitle: "Mug", warehouseName: "Main", availableQuantity: 2}))
            .toEqual({product: "Mug", warehouse: "Main", quantity: 2});
        expect(await paramsOf(NotificationEventCodes.ABANDONED_CART, {itemCount: 1})).toEqual({count: 1, variant: "one"});
        expect(await paramsOf(NotificationEventCodes.ABANDONED_CART, {itemCount: 3})).toEqual({count: 3, variant: "other"});
    });

    it("has a message and title for every code in the shared texts (D128)", () => {
        const codes: Record<string, {title?: string; message?: string}> = notificationTexts.eCommerce.codes;
        for (const code of Object.values(NotificationEventCodes)) {
            expect(codes[code]?.title, code).toBeTruthy();
            expect(codes[code]?.message, code).toBeTruthy();
        }
    });
});
