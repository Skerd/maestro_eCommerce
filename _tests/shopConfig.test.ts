import {describe, expect, it} from "vitest";
import mongoose from "mongoose";
import {mapShopCompany} from "@eCommerceModule/api/eCommerce/public/shopConfig";

// TD-B187: the shop's public config 500ed on the site of any company with a logo, because the logo id is a Mongoose
// ObjectId whose `_id` returns itself, and the old id helper followed `_id` forever.
describe("the shop's company (TD-B187)", () => {
    it("shows the logo of a company whose logo is a stored ObjectId or a populated media", () => {
        const logo = new mongoose.Types.ObjectId();
        expect(mapShopCompany({name: "Store", logo}).logo).toBe(logo.toString());
        expect(mapShopCompany({name: "Store", logo: {_id: logo, name: "logo.png"}}).logo).toBe(logo.toString());
        expect(mapShopCompany({name: "Store"}).logo).toBeUndefined();
    });
});
