import TaxZone from "./taxZone";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import type {EcomDemoGeo} from "@eCommerceModule/database/demo/ecomDemoConstants";

/**
 * Seeds Albania Standard VAT. Idempotent on `{company, name}`.
 * Skips when the country ref did not resolve.
 */
export async function createTaxZones(
    parentLogger: serverLogger,
    company: ICompany,
    geo: EcomDemoGeo,
): Promise<number> {
    const logger = getLogger("mongoDbInitialization-createTaxZones", parentLogger);
    logger.start("Creating tax zones...");

    if (!geo.countryId) {
        logger.warn("Skipping tax zone \"Albania Standard VAT\": country was not seeded.");
        logger.finish("Finished creating tax zones!", 0);
        return 0;
    }

    try {
        const payload = {
            name: "Albania Standard VAT",
            country: geo.countryId,
            states: geo.stateId ? [geo.stateId] : [],
            rates: [{name: "VAT", rate: 20, isCompound: false, appliesTo: "all" as const}],
            priority: 1,
            isActive: true,
            company: company._id,
            createdBy: company.createdBy,
        };

        let tax = await TaxZone.findOne({company: company._id, name: "Albania Standard VAT"});
        if (!tax) {
            await TaxZone.create(payload);
        } else {
            tax.set(payload);
            await tax.save();
        }
        logger.finish("Finished creating tax zones!", 1);
        return 1;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(e);
        logger.err(`Error creating tax zone: ${message}`);
        logger.fail("Failed to create tax zones!");
        return 0;
    }
}
