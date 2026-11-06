import {describe, expect, it} from "vitest";
import {getTaxpayerFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/fiscal/fiscal.form.validator";

// TD-B22: `.max()` chained on `notEmptyZod` threw while building the schema, so `/getTaxpayer` answered 500 on every call.
describe("fiscal /getTaxpayer schema", () => {
    const fiscalConfigId = "64b000000000000000000001";

    it("builds and accepts a TIN", () => {
        expect(getTaxpayerFormSchema("en-US").safeParse({fiscalConfigId, tin: "L12345678A"}).success).toBe(true);
    });

    it("refuses a missing, empty or too long TIN with a validation error", () => {
        const schema = getTaxpayerFormSchema("en-US");
        expect(schema.safeParse({fiscalConfigId}).success).toBe(false);
        expect(schema.safeParse({fiscalConfigId, tin: ""}).success).toBe(false);
        expect(schema.safeParse({fiscalConfigId, tin: "x".repeat(21)}).success).toBe(false);
    });
});
