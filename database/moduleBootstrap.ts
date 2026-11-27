/** Must be the first import: `addModelData` snapshots REF_SELECT_REGISTRY while models load. */
import {registerECommerceRefSelects} from "armonia/src/modules/eCommerce/database/filter/refSelect";
import type {Model} from "mongoose";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import SavedSearch from "@eCommerceModule/database/schemas/savedSearch/savedSearch";
import OdooConnection from "@eCommerceModule/database/schemas/odooConnection/odooConnection";
import OdooLink from "@eCommerceModule/database/schemas/odooLink/odooLink";
import ShopSettings from "@eCommerceModule/database/schemas/shopSettings/shopSettings";
import {registerPublicMediaBackfillSource} from "@coreModule/utilities/media/publicMediaBackfillRegistry";
import {registerDefaultRoles} from "@coreModule/database/schemas/role/role.defaults";
import {eCommerceDefaultRoles} from "@eCommerceModule/database/schemas/role/eCommerce.role.defaults";
import {ProductSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.schema-def";
import {ProductVariantSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/productVariant.schema-def";
import {CollectionSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/collection.schema-def";
import {companyService} from "@coreModule/database/schemas/company/company.service";
import type {SelfServeBusinessType} from "@coreModule/domain/company/selfServeBusinessTypes";
import {eCommerceReportables} from "@eCommerceModule/domain/reports/eCommerceReportables";
import {seedProductTaxonomy} from "@eCommerceModule/database/seeds/taxonomy/productTaxonomy.seed";

export const eCommerceModels: Model<any>[] = [
    ProductCategory,
    SavedSearch,
    OdooConnection,
    OdooLink,
    ShopSettings,
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

/** A shop may sign itself up on the portal; it is listed there once the platform approves it (D178). */
const selfServeBusinessTypes: SelfServeBusinessType[] = [{
    key: "eCommerce",
    modules: ["eCommerce"],
    // The shop's portal opt-in is a company field, not a config row.
    onCreated: async ({company, session, logger}) => {
        await companyService.updateOne({_id: company._id}, {$set: {shopListedOnPortal: true}}, {session, logger});
    },
}];

export const moduleBootstrap = {
    models: eCommerceModels,
    dropModuleCollections: dropECommerceCollections,
    defaultRoles: eCommerceDefaultRoles,
    selfServeBusinessTypes,
    reportables: eCommerceReportables,
    // The platform product categories (D195), seeded with core's platform lists at database setup.
    platformLists: seedProductTaxonomy,
};
