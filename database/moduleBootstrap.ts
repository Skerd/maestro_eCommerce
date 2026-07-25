import type {Model} from "mongoose";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import SavedSearch from "@eCommerceModule/database/schemas/savedSearch/savedSearch";

export const eCommerceModels: Model<any>[] = [
    ProductCategory,
    SavedSearch,
];

export async function dropECommerceCollections(): Promise<void> {
    for (const model of eCommerceModels) {
        await model.collection.drop();
    }
}

export const moduleBootstrap = {
    models: eCommerceModels,
    dropModuleCollections: dropECommerceCollections,
};
