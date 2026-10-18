/** Must be the first import: `addModelData` snapshots REF_SELECT_REGISTRY while models load. */
import {registerECommerceRefSelects} from "armonia/src/modules/eCommerce/database/filter/refSelect";
import type {Model} from "mongoose";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import SavedSearch from "@eCommerceModule/database/schemas/savedSearch/savedSearch";
import OdooConnection from "@eCommerceModule/database/schemas/odooConnection/odooConnection";
import OdooLink from "@eCommerceModule/database/schemas/odooLink/odooLink";
import ListingCategory from "@eCommerceModule/database/schemas/listingCategory/listingCategory";
import Listing from "@eCommerceModule/database/schemas/listing/listing";
import TaskRequest from "@eCommerceModule/database/schemas/taskRequest/taskRequest";
import Bid from "@eCommerceModule/database/schemas/bid/bid";
import Order from "@eCommerceModule/database/schemas/order/order";
import Review from "@eCommerceModule/database/schemas/review/review";
import ListingPackage from "@eCommerceModule/database/schemas/listingPackage/listingPackage";
import ListingAddOn from "@eCommerceModule/database/schemas/listingAddOn/listingAddOn";
import ProviderProfile from "@eCommerceModule/database/schemas/providerProfile/providerProfile";
import Booking from "@eCommerceModule/database/schemas/booking/booking";
import Dispute from "@eCommerceModule/database/schemas/dispute/dispute";
import Promotion from "@eCommerceModule/database/schemas/promotion/promotion";
import ListingFlag from "@eCommerceModule/database/schemas/listingFlag/listingFlag";
import OrderDelivery from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery";
import OrderMilestone from "@eCommerceModule/database/schemas/orderMilestone/orderMilestone";
import OrderRevision from "@eCommerceModule/database/schemas/orderRevision/orderRevision";
import {registerPublicMediaBackfillSource} from "@coreModule/utilities/media/publicMediaBackfillRegistry";
import {registerDefaultRoles} from "@coreModule/database/schemas/role/role.defaults";
import {eCommerceDefaultRoles} from "@eCommerceModule/database/schemas/role/eCommerce.role.defaults";
import {ProductSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.schema-def";
import {ProductVariantSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/productVariant.schema-def";
import {CollectionSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/collection.schema-def";
import {ListingSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listing/listing.schema-def";
import {TaskRequestSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/taskRequest/taskRequest.schema-def";

export const eCommerceModels: Model<any>[] = [
    ProductCategory,
    SavedSearch,
    OdooConnection,
    OdooLink,
    ListingCategory,
    Listing,
    TaskRequest,
    Bid,
    Order,
    Review,
    ListingPackage,
    ListingAddOn,
    ProviderProfile,
    Booking,
    Dispute,
    Promotion,
    ListingFlag,
    OrderDelivery,
    OrderMilestone,
    OrderRevision,
];

export async function dropECommerceCollections(): Promise<void> {
    for (const model of eCommerceModels) {
        await model.collection.drop();
    }
}

registerDefaultRoles(eCommerceDefaultRoles);
registerECommerceRefSelects();
registerPublicMediaBackfillSource({
    name: "Product",
    schemaDef: ProductSchemaDef,
    loadModel: () => import("@eCommerceModule/database/schemas/product/product").then((m) => m.default),
});
registerPublicMediaBackfillSource({
    name: "ProductVariant",
    schemaDef: ProductVariantSchemaDef,
    loadModel: () => import("@eCommerceModule/database/schemas/productVariant/productVariant").then((m) => m.default),
});
registerPublicMediaBackfillSource({
    name: "ProductCollection",
    schemaDef: CollectionSchemaDef,
    loadModel: () => import("@eCommerceModule/database/schemas/collection/collection").then((m) => m.default),
});
registerPublicMediaBackfillSource({
    name: "Listing",
    schemaDef: ListingSchemaDef,
    loadModel: () => import("@eCommerceModule/database/schemas/listing/listing").then((m) => m.default),
});
registerPublicMediaBackfillSource({
    name: "TaskRequest",
    schemaDef: TaskRequestSchemaDef,
    loadModel: () => import("@eCommerceModule/database/schemas/taskRequest/taskRequest").then((m) => m.default),
});

export const moduleBootstrap = {
    models: eCommerceModels,
    dropModuleCollections: dropECommerceCollections,
    defaultRoles: eCommerceDefaultRoles,
};
