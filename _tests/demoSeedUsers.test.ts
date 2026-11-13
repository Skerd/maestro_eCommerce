/**
 * TD-B218: a seed row whose user exists in no dev profile is skipped silently, so the gift card seed names only the
 * core users, which every profile creates before any company's demo seed. The shop's demo notices too (TD-B226).
 */
import {describe, expect, it} from "vitest";
import {defaultSysUsers} from "@coreModule/database/schemas/user/user.defaults";
import {giftCardsSeed} from "@eCommerceModule/database/seeds/finance/giftCards.seed";
import {ECOMMERCE_DEMO_NOTIFICATIONS} from "@eCommerceModule/database/demo/notifications.demo";

describe("eCommerce demo seed users", () => {
    it("names only the core users as gift card purchasers", () => {
        const known = new Set(defaultSysUsers.map((user: {username: string}) => user.username));
        expect(giftCardsSeed.map((card) => card.purchasedBy.$user).filter((username) => !known.has(username))).toEqual([]);
    });

    it("sends the shop's demo notices to core users only", () => {
        const known = new Set(defaultSysUsers.map((user: {username: string}) => user.username));
        expect(ECOMMERCE_DEMO_NOTIFICATIONS.map((row) => row.receiver).filter((username) => !known.has(username))).toEqual([]);
    });
});
