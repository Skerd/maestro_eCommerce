import {describe, expect, it, vi} from "vitest";

// The till switched off, as it is until fiscalization is certified (D186); the other POS tests switch it on.
vi.mock("armonia/src/modules/finance/helpers/fiscalAvailability", () => ({FISCALIZATION_AVAILABLE: false}));
const {findFiscalConfigs} = vi.hoisted(() => ({findFiscalConfigs: vi.fn()}));
vi.mock("@financeModule/database/schemas/fiscalConfig/fiscalConfig.service", async (importOriginal) => {
    const original = await importOriginal<typeof import("@financeModule/database/schemas/fiscalConfig/fiscalConfig.service")>();
    return {fiscalConfigService: Object.assign(Object.create(original.fiscalConfigService), {find: findFiscalConfigs})};
});

import {ObjectId} from "mongodb";
import request from "supertest";
import {appFor} from "@coreModule/_tests/httpHarness";
import {runPosFiscalSweep} from "@eCommerceModule/utilities/cronJobs/posFiscalSweepJob";
import * as posRoute from "@eCommerceModule/api/eCommerce/private/pos";
import * as fiscalRoute from "@eCommerceModule/api/eCommerce/private/fiscal";
import * as posOrderRoute from "@eCommerceModule/api/eCommerce/private/checked/posOrder";
import * as posSessionRoute from "@eCommerceModule/api/eCommerce/private/checked/posSession";
import * as posConfigRoute from "@eCommerceModule/api/eCommerce/private/posConfig";
import * as posPaymentMethodRoute from "@eCommerceModule/api/eCommerce/private/checked/posPaymentMethod";

const app = appFor([posRoute, fiscalRoute, posOrderRoute, posSessionRoute, posConfigRoute, posPaymentMethodRoute].map((route) => ({basePath: route.basePath, router: route.router, module: "eCommerce"})));

describe("the till coming soon (D186)", () => {
    it("refuses the till, its fiscal calls and every POS action and write", async () => {
        const calls: ["post" | "put" | "patch" | "delete", string][] = [
            ["post", "/api/eCommerce/pos/catalog"],
            ["post", "/api/eCommerce/pos/currentSession"],
            ["post", "/api/eCommerce/fiscal/fiscalizePosOrder"],
            ["post", "/api/eCommerce/posSession/open"],
            ["post", "/api/eCommerce/posSession/cashMove"],
            ["post", "/api/eCommerce/posOrder/pay"],
            ["post", "/api/eCommerce/posOrder/refund"],
            ["post", "/api/eCommerce/posOrder/resendFiscal"],
            ["post", "/api/eCommerce/posConfig/activate"],
            ["post", "/api/eCommerce/posConfig/resetManagerPin"],
            ["put", "/api/eCommerce/posConfig"],
            ["patch", "/api/eCommerce/posPaymentMethod"],
            ["delete", "/api/eCommerce/posPaymentMethod"],
        ];
        for (const [method, path] of calls) {
            const response = await request(app)[method](path).send({});
            expect([response.status, response.body.error_code], `${method} ${path}`).toEqual([403, "fiscalization_coming_soon"]);
        }
    });

    it("leaves the fiscal sweep with nothing to send", async () => {
        await runPosFiscalSweep(new ObjectId());
        expect(findFiscalConfigs).not.toHaveBeenCalled();
    });
});
