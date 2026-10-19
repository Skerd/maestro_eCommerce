import {Types} from "mongoose";
import {getLogger, serverLogger} from "@coreModule/loggers/serverLog";
import Currency from "@coreModule/database/schemas/currency/currency";
import Country from "@coreModule/database/schemas/country/country";
import State from "@coreModule/database/schemas/state/state";
import City from "@coreModule/database/schemas/city/city";
import User from "@coreModule/database/schemas/user/user";
import {defaultCompaniesValues} from "@coreModule/database/schemas/company/company.defaults";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {createWarehouses} from "@eCommerceModule/database/schemas/warehouse/warehouse.defaults";
import {createProductAttributes} from "@eCommerceModule/database/schemas/productAttribute/productAttribute.defaults";
import {createProductMedia} from "@eCommerceModule/database/seeds/catalog/productMedia";
import {createProducts, type CreateProductsResult} from "@eCommerceModule/database/schemas/product/product.defaults";
import {createProductVariants} from "@eCommerceModule/database/schemas/productVariant/productVariant.defaults";
import {createInventories} from "@eCommerceModule/database/schemas/inventory/inventory.defaults";
import {createCollections} from "@eCommerceModule/database/schemas/collection/collection.defaults";
import {createSavedSearches} from "@eCommerceModule/database/schemas/savedSearch/savedSearch.defaults";
import {createCustomerGroups} from "@eCommerceModule/database/schemas/customerGroup/customerGroup.defaults";
import {createCustomerGroupMembers} from "@eCommerceModule/database/schemas/customerGroupMember/customerGroupMember.defaults";
import {createDiscounts} from "@eCommerceModule/database/schemas/discount/discount.defaults";
import {createTaxZones} from "@eCommerceModule/database/schemas/taxZone/taxZone.defaults";
import {createShippingZones} from "@eCommerceModule/database/schemas/shippingZone/shippingZone.defaults";
import {createPricingRules} from "@eCommerceModule/database/schemas/pricingRule/pricingRule.defaults";
import {createCmsBlocks} from "@eCommerceModule/database/schemas/cmsBlock/cmsBlock.defaults";
import {createCustomerAddresses} from "@eCommerceModule/database/schemas/customerAddress/customerAddress.defaults";
import {
    createProductOrders,
    type CreateProductOrdersResult,
} from "@eCommerceModule/database/schemas/productOrder/productOrder.defaults";
import {createCarts} from "@eCommerceModule/database/schemas/cart/cart.defaults";
import {createCheckouts} from "@eCommerceModule/database/schemas/checkout/checkout.defaults";
import {createFulfillments} from "@eCommerceModule/database/schemas/fulfillment/fulfillment.defaults";
import {createReturnRequests} from "@eCommerceModule/database/schemas/returnRequest/returnRequest.defaults";
import {createDigitalDeliveries} from "@eCommerceModule/database/schemas/digitalDelivery/digitalDelivery.defaults";
import {createProductReviews} from "@eCommerceModule/database/schemas/productReview/productReview.defaults";
import {createInventoryMovements} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.defaults";
import {createPosPaymentMethods} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod.defaults";
import {createPosConfigs} from "@eCommerceModule/database/schemas/posConfig/posConfig.defaults";
import {createPosSessions} from "@eCommerceModule/database/schemas/posSession/posSession.defaults";
import {createPosOrders} from "@eCommerceModule/database/schemas/posOrder/posOrder.defaults";
import {createFiscalConfigs} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig.defaults";

export type SeedECommerceDemoResult = {
    products: CreateProductsResult;
    warehouses: Record<string, Types.ObjectId>;
    orders: CreateProductOrdersResult;
};

/**
 * Orchestrates eCommerce company demo seeds in dependency order.
 * Per-schema writers live next to each mongoose model as `<schema>.defaults.ts`.
 */
export async function seedECommerceDemoData(
    parentLogger: serverLogger | undefined,
    company: ICompany,
): Promise<SeedECommerceDemoResult | undefined> {
    const logger = getLogger("eCommerce_demo_data", parentLogger);
    logger.start("Seeding eCommerce catalog demo data...");

    const currency =
        (await Currency.findOne({abbreviation: "EUR"}).lean()) ||
        (await Currency.findOne({}).lean());
    if (!currency) {
        logger.err("No currency found; cannot seed eCommerce catalog demo.");
        logger.fail("eCommerce demo seed failed.");
        return undefined;
    }

    // Every demo row (orders, carts, groups, till) belongs to echo; the role users stay empty.
    const demoUser = await User.findOne({username: "echo@echo.com"}).select("_id").lean();
    const demoUserId = (demoUser?._id ?? company.createdBy) as Types.ObjectId;

    const addr = defaultCompaniesValues.address;
    const country = await Country.findOne({code: addr.countryCode, company: company._id}).select("_id").lean();
    const state = await State.findOne({code: addr.stateCode, company: company._id}).select("_id").lean();
    const city = await City.findOne({name: addr.cityName, company: company._id}).select("_id").lean();
    const geo = {
        countryId: country?._id,
        stateId: state?._id,
        cityId: city?._id,
    };

    const warehouses = await createWarehouses(logger, company, geo, addr);
    const attributes = await createProductAttributes(logger, company);
    const productMedia = await createProductMedia(logger, company);
    const products = await createProducts(logger, company, currency._id, attributes, productMedia);
    const variants = await createProductVariants(logger, company, currency._id, products, attributes);
    const inventories = await createInventories(logger, company, products, warehouses.primaryWarehouseId, variants);
    const collections = await createCollections(logger, company, products, productMedia);
    await createSavedSearches(logger, company, demoUserId, collections);
    const groups = await createCustomerGroups(logger, company);
    await createCustomerGroupMembers(logger, company, groups, demoUserId);
    await createDiscounts(logger, company, collections);
    await createTaxZones(logger, company, geo);
    await createShippingZones(logger, company, geo);
    await createPricingRules(logger, company, groups, collections);
    await createCmsBlocks(logger, company, collections);
    await createCustomerAddresses(logger, company, demoUserId, geo, addr);
    const orders = await createProductOrders(logger, company, currency._id, products, demoUserId, geo, addr);
    const carts = await createCarts(logger, company, currency._id, products, demoUserId);
    await createCheckouts(logger, company, currency._id, carts, orders, demoUserId, geo, addr);
    await createFulfillments(logger, company, orders);
    await createReturnRequests(logger, company, orders);
    await createDigitalDeliveries(logger, company, orders, products);
    await createProductReviews(logger, company, orders, products);
    await createInventoryMovements(logger, company, products, warehouses.primaryWarehouseId, inventories);
    const posMethods = await createPosPaymentMethods(logger, company);
    const fiscalConfig = await createFiscalConfigs(logger, company);
    const posConfig = await createPosConfigs(
        logger,
        company,
        currency._id,
        posMethods,
        warehouses.primaryWarehouseId,
        fiscalConfig?._id,
    );
    const cashierId = demoUserId;
    const posSession = await createPosSessions(logger, company, posConfig?._id, currency._id, cashierId);
    await createPosOrders(
        logger,
        company,
        posSession?._id,
        posConfig?._id,
        posMethods,
        products,
        cashierId,
        demoUserId,
    );
    const warehouseIds: Record<string, Types.ObjectId> = {};
    for (const [key, doc] of Object.entries(warehouses.bySeedKey)) {
        warehouseIds[key] = doc._id;
    }

    logger.finish(
        `Finished eCommerce catalog demo (products=${Object.keys(products.bySeedKey).length}, ` +
            `warehouses=${Object.keys(warehouseIds).length}, orders=${Object.keys(orders.byOrderNumber).length}).`,
    );

    return {products, warehouses: warehouseIds, orders};
}
