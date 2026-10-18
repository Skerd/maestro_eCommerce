import {ObjectId} from "mongodb";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import Currency from "@coreModule/database/schemas/currency/currency";
import Country from "@coreModule/database/schemas/country/country";
import State from "@coreModule/database/schemas/state/state";
import City from "@coreModule/database/schemas/city/city";
import User from "@coreModule/database/schemas/user/user";
import {defaultSysUsers} from "@coreModule/database/schemas/user/user.defaults";
import {defaultCompaniesValues} from "@coreModule/database/schemas/company/company.defaults";
import {createCategories as createListingCategories} from "@eCommerceModule/database/schemas/listingCategory/listingCategory.defaults";
import {createProviderProfiles} from "@eCommerceModule/database/schemas/providerProfile/providerProfile.defaults";
import {createListings} from "@eCommerceModule/database/schemas/listing/listing.defaults";
import {createListingPackages} from "@eCommerceModule/database/schemas/listingPackage/listingPackage.defaults";
import {createListingAddOns} from "@eCommerceModule/database/schemas/listingAddOn/listingAddOn.defaults";
import {createTaskRequests} from "@eCommerceModule/database/schemas/taskRequest/taskRequest.defaults";
import {createBids} from "@eCommerceModule/database/schemas/bid/bid.defaults";
import {createOrders} from "@eCommerceModule/database/schemas/order/order.defaults";
import {createOrderDeliveries} from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery.defaults";
import {createOrderRevisions} from "@eCommerceModule/database/schemas/orderRevision/orderRevision.defaults";
import {createOrderMilestones} from "@eCommerceModule/database/schemas/orderMilestone/orderMilestone.defaults";
import {createListingFlags} from "@eCommerceModule/database/schemas/listingFlag/listingFlag.defaults";
import {createReviews} from "@eCommerceModule/database/schemas/review/review.defaults";
import {createDisputes} from "@eCommerceModule/database/schemas/dispute/dispute.defaults";
import {createBookings} from "@eCommerceModule/database/schemas/booking/booking.defaults";
import {createPromotions} from "@eCommerceModule/database/schemas/promotion/promotion.defaults";

/** Invoked from {@link seedCompanyDemoData} after the product catalog seed. */
async function resolveDemoUsers(company: any, logger: serverLogger) {
    const companyId = company._id;
    const mainUsername = defaultSysUsers.find((u) => u.isMainUser)?.username;
    const provider =
        (mainUsername ? await User.findOne({username: mainUsername}) : null) ||
        (await User.findOne({"roles.company": companyId})) ||
        (await User.findById(company.createdBy));

    const customer =
        (await User.findOne({username: "almir@leka.com"})) ||
        (await User.findOne({
            "roles.company": companyId,
            _id: {$ne: provider?._id},
        })) ||
        provider;

    if (!provider || !customer) {
        logger.err("Could not resolve provider/customer users for marketplace demo.");
        return null;
    }

    return {provider, customer};
}

async function resolveDemoAddress(company: any, logger: serverLogger) {
    const addr = defaultCompaniesValues.address;
    const country = await Country.findOne({code: addr.countryCode, company: company._id}).select("_id");
    const state = await State.findOne({code: addr.stateCode, company: company._id}).select("_id");
    const city = await City.findOne({name: addr.cityName, company: company._id}).select("_id");

    if (!country || !city) {
        logger.warn(
            `Marketplace demo address incomplete (country=${Boolean(country)}, city=${Boolean(city)}); listings/tasks may omit geo.`,
        );
        return null;
    }

    return {
        country: country._id as ObjectId,
        state: (state?._id as ObjectId) || undefined,
        city: city._id as ObjectId,
        street: addr.street,
        postalCode: addr.postalCode,
        latitude: addr.geoLocation.latitude,
        longitude: addr.geoLocation.longitude,
    };
}

export async function seedMarketplaceCompanyDemoData(parentLogger: serverLogger | undefined, company: any): Promise<void> {
    const logger = getLogger("eCommerce_marketplace_company_demo_seed", parentLogger);
    logger.start("Seeding eCommerce marketplace demo data...");

    const currency =
        (await Currency.findOne({abbreviation: "EUR"})) ||
        (await Currency.findOne({}));
    if (!currency) {
        logger.err("No currency found; skipping marketplace demo.");
        logger.fail("Marketplace demo seed failed.");
        return;
    }

    const users = await resolveDemoUsers(company, logger);
    if (!users) {
        logger.fail("Marketplace demo seed failed.");
        return;
    }
    const {provider, customer} = users;

    await createListingCategories(logger, company);
    await createProviderProfiles(logger, company, provider, customer);

    const demoAddress = await resolveDemoAddress(company, logger);
    const listingAddress =
        demoAddress?.state != null
            ? {country: demoAddress.country, state: demoAddress.state, city: demoAddress.city}
            : undefined;

    const listings = await createListings(logger, company, provider, currency, listingAddress);
    await createListingPackages(logger, company, provider, currency, listings);
    await createListingAddOns(logger, company, provider, currency, listings);

    let taskRequests = {taskRequests: [], bySeedKey: {}} as Awaited<ReturnType<typeof createTaskRequests>>;
    if (demoAddress) {
        taskRequests = await createTaskRequests(logger, company, customer, currency, {
            street: demoAddress.street,
            postalCode: demoAddress.postalCode,
            country: demoAddress.country,
            state: demoAddress.state,
            city: demoAddress.city,
            latitude: demoAddress.latitude,
            longitude: demoAddress.longitude,
        });
    } else {
        logger.warn("Skipping task requests — Tirana geo not resolved.");
    }

    const bids = await createBids(logger, company, provider, currency, taskRequests);
    const orders = await createOrders(
        logger,
        company,
        customer,
        provider,
        currency,
        listings,
        taskRequests,
        bids,
    );
    // Deliveries first — revisions hang off the one left in `revision_requested`.
    const deliveries = await createOrderDeliveries(logger, company, provider, orders);
    await createOrderRevisions(logger, company, customer, orders, deliveries);
    await createOrderMilestones(logger, company, customer, currency, orders);

    await createReviews(logger, company, customer, orders, listings);
    await createDisputes(logger, company, customer, orders);
    await createBookings(logger, company, provider, orders);
    await createPromotions(logger, company, listings);
    await createListingFlags(logger, company, customer, listings);

    logger.finish("Finished seeding eCommerce marketplace demo data!");
}
