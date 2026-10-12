/** Must be the first import: `addModelData` snapshots REF_SELECT_REGISTRY while models load. */
import {registerECommerceRefSelects} from "armonia/src/modules/eCommerce/database/filter/refSelect";
import type {Model} from "mongoose";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import SavedSearch from "@eCommerceModule/database/schemas/savedSearch/savedSearch";
import {registerPublicMediaBackfillSource} from "@coreModule/utilities/media/publicMediaBackfillRegistry";
import {registerDefaultRoles} from "@coreModule/database/schemas/role/role.defaults";
import {eCommerceDefaultRoles} from "@eCommerceModule/database/schemas/role/eCommerce.role.defaults";
import {ProductSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.schema-def";
import {ProductVariantSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/productVariant.schema-def";
import {CollectionSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/collection.schema-def";

export const eCommerceModels: Model<any>[] = [
    ProductCategory,
    SavedSearch,
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

export const moduleBootstrap = {
    models: eCommerceModels,
    dropModuleCollections: dropECommerceCollections,
    defaultRoles: eCommerceDefaultRoles,
};
