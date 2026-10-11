import type {HydratedDocument} from "mongoose";
import type {Types} from "mongoose";
import CustomerAddress, {type ICustomerAddress} from "./customerAddress";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {defaultCompaniesValues} from "@coreModule/database/schemas/company/company.defaults";
import {demoName} from "@coreModule/utilities/helpers";
import type {CustomerAddressType} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/customerAddress.schema-def";

export const CUSTOMER_ADDRESS_HOME_LABEL = demoName("Home");
export const CUSTOMER_ADDRESS_BILLING_LABEL = demoName("Billing");

type CustomerAddressSeed = {
    type: CustomerAddressType;
    label: string;
    isDefault: boolean;
};

/**
 * Seeds echo's Tirana shipping + billing addresses. Idempotent on `{company, customer, label}`.
 * One default may exist per type. City and country are required — skip when geo refs are missing.
 */
export async function createCustomerAddresses(
    parentLogger: serverLogger,
    company: ICompany,
    customerId: Types.ObjectId | undefined,
    geo: {countryId?: Types.ObjectId; stateId?: Types.ObjectId; cityId?: Types.ObjectId},
    addr: typeof defaultCompaniesValues.address,
): Promise<HydratedDocument<ICustomerAddress>[]> {
    const logger = getLogger("mongoDbInitialization-createCustomerAddresses", parentLogger);
    logger.start("Creating customer addresses...");

    if (!customerId) {
        logger.warn("Skipping customer address: customer echo@echo.com was not found.");
        logger.finish("Finished creating customer addresses!", 0);
        return [];
    }
    if (!geo.countryId || !geo.cityId) {
        logger.warn("Skipping customer address: country or city was not seeded.");
        logger.finish("Finished creating customer addresses!", 0);
        return [];
    }

    const seeds: readonly CustomerAddressSeed[] = [
        {type: "shipping", label: CUSTOMER_ADDRESS_HOME_LABEL, isDefault: true},
        {type: "billing", label: CUSTOMER_ADDRESS_BILLING_LABEL, isDefault: true},
    ];

    const created: HydratedDocument<ICustomerAddress>[] = [];

    try {
        for (const seed of seeds) {
            const payload = {
                customer: customerId,
                type: seed.type,
                firstName: "echo",
                lastName: "silence",
                email: "echo@echo.com",
                phone: "+355 69 000 0000",
                street: addr.street,
                city: geo.cityId,
                ...(geo.stateId ? {state: geo.stateId} : {}),
                postalCode: addr.postalCode,
                country: geo.countryId,
                latitude: addr.geoLocation.latitude,
                longitude: addr.geoLocation.longitude,
                isDefault: seed.isDefault,
                label: seed.label,
                company: company._id,
                createdBy: company.createdBy,
            };

            let doc = await CustomerAddress.findOne({
                company: company._id,
                customer: customerId,
                label: seed.label,
            });
            if (!doc) {
                doc = await CustomerAddress.create(payload);
            } else {
                doc.set(payload);
                await doc.save();
            }
            created.push(doc);
        }
        logger.finish("Finished creating customer addresses!", created.length);
        return created;
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : String(e);
        console.log(e);
        logger.err(`Error creating customer address: ${message}`);
        logger.fail("Failed to create customer addresses!");
        return created;
    }
}
