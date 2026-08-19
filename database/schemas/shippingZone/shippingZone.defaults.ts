import ShippingZone from "./shippingZone";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import type {EcomDemoGeo} from "@eCommerceModule/database/demo/ecomDemoConstants";

/**
 * Seeds Albania Domestic rates. Idempotent on `{company, name}`.
 * Skips when the country ref did not resolve.
 */
export async function createShippingZones(
    parentLogger: serverLogger,
    company: ICompany,
    geo: EcomDemoGeo,
): Promise<number> {
    const logger = getLogger("mongoDbInitialization-createShippingZones", parentLogger);
    logger.start("Creating shipping zones...");

    if (!geo.countryId) {
        logger.warn("Skipping shipping zone \"Albania Domestic\": country was not seeded.");
        logger.finish("Finished creating shipping zones!", 0);
        return 0;
    }

    try {
        const payload = {
            name: "Albania Domestic",
            countries: [geo.countryId],
            states: geo.stateId ? [geo.stateId] : [],
            rates: [
                {
                    name: "Standard",
                    type: "flat" as const,
                    price: 4.5,
                    carrier: "Posta Shqiptare",
                    estimatedDeliveryDays: 3,
                },
                {
                    name: "Express",
                    type: "flat" as const,
                    price: 9.9,
                    carrier: "Courier",
                    estimatedDeliveryDays: 1,
                },
                {
                    name: "Free over €60",
                    type: "free" as const,
                    price: 0,
                    conditions: {minOrderAmount: 60},
                    estimatedDeliveryDays: 3,
                },
            ],
            isActive: true,
            company: company._id,
            createdBy: company.createdBy,
        };

        let ship = await ShippingZone.findOne({company: company._id, name: "Albania Domestic"});
        if (!ship) {
            await ShippingZone.create(payload);
        } else {
            ship.set(payload);
            await ship.save();
        }
        logger.finish("Finished creating shipping zones!", 1);
        return 1;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(e);
        logger.err(`Error creating shipping zone: ${message}`);
        logger.fail("Failed to create shipping zones!");
        return 0;
    }
}
