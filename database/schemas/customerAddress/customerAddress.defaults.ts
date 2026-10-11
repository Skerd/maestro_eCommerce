import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import CustomerAddress, {type ICustomerAddress} from "./customerAddress";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import type {EcomDemoAddr, EcomDemoGeo} from "@eCommerceModule/database/demo/ecomDemoConstants";

export const CUSTOMER_ADDRESS_HOME_LABEL = "Home";

/**
 * Seeds Almir Leka's Tirana home address. Idempotent on `{company, customer, label: "Home"}`.
 * City and country are required — skip when geo refs are missing.
 */
export async function createCustomerAddresses(
    parentLogger: serverLogger,
    company: ICompany,
    customerId: Types.ObjectId | undefined,
    geo: EcomDemoGeo,
    addr: EcomDemoAddr,
): Promise<HydratedDocument<ICustomerAddress> | undefined> {
    const logger = getLogger("mongoDbInitialization-createCustomerAddresses", parentLogger);
    logger.start("Creating customer addresses...");

    if (!customerId) {
        logger.warn("Skipping customer address: customer almir@leka.com was not found.");
        logger.finish("Finished creating customer addresses!", 0);
        return undefined;
    }
    if (!geo.countryId || !geo.cityId) {
        logger.warn("Skipping customer address: country or city was not seeded.");
        logger.finish("Finished creating customer addresses!", 0);
        return undefined;
    }

    try {
        const payload = {
            customer: customerId,
            type: "shipping",
            firstName: "Almir",
            lastName: "Leka",
            email: "almir@leka.com",
            phone: "+355 69 000 0000",
            street: addr.street,
            city: geo.cityId,
            ...(geo.stateId ? {state: geo.stateId} : {}),
            postalCode: addr.postalCode,
            country: geo.countryId,
            latitude: addr.geoLocation.latitude,
            longitude: addr.geoLocation.longitude,
            isDefault: true,
            label: CUSTOMER_ADDRESS_HOME_LABEL,
            company: company._id,
            createdBy: company.createdBy,
        };

        let doc = await CustomerAddress.findOne({
            company: company._id,
            customer: customerId,
            label: CUSTOMER_ADDRESS_HOME_LABEL,
        });
        if (!doc) {
            doc = await CustomerAddress.create(payload);
        } else {
            doc.set(payload);
            await doc.save();
        }
        logger.finish("Finished creating customer addresses!", 1);
        return doc;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(e);
        logger.err(`Error creating customer address: ${message}`);
        logger.fail("Failed to create customer addresses!");
        return undefined;
    }
}
