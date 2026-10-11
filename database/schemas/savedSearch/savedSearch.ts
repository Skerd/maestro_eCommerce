import {Document, model, Schema, SchemaTypes} from "mongoose";
import {IUser} from "@coreModule/database/schemas/user/user";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {
    ILifeCyclePluginFields,
    IOwnershipPluginFields,
    ISoftDeletePluginFields,
} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {CategorySimpleSnippet} from "@eCommerceModule/database/schemas/category/category.snippets";
import {CollectionSimpleSnippet} from "@eCommerceModule/database/schemas/collection/collection.snippets";
import {IProductCategory} from "@eCommerceModule/database/schemas/category/category";
import {ICollection} from "@eCommerceModule/database/schemas/collection/collection";
import {
    SAVED_SEARCH_NAME_MAX,
    SavedSearchSchemaDef,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/savedSearch/savedSearch.schema-def";
import {SHOP_PRODUCT_SORTS, type ShopProductSort} from "armonia/src/modules/eCommerce/api/eCommerce/public/shopCatalog/shopProducts.form.validator";
import {applySavedSearchIndexes} from "./savedSearch.indexes";
import {savedSearchViews} from "./savedSearch.views";

export interface ISavedSearch extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    customer: IUser;
    name: string;
    categoryIds?: IProductCategory[];
    collectionId?: ICollection;
    priceMin?: number;
    priceMax?: number;
    sort?: ShopProductSort;
}

const SavedSearchSchema = new Schema<ISavedSearch>(
    {
        customer: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            required: true,
            refAllowlist: SimpleUserSnippet,
            dynamicTableConfiguration: {
                refDisplayKey: ["name", "surname"],
            },
        },
        name: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: SAVED_SEARCH_NAME_MAX,
        },
        categoryIds: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "ProductCategory",
            }],
            default: undefined,
            refAllowlist: CategorySimpleSnippet,
            dynamicTableConfiguration: {
                refDisplayKey: ["name"],
            },
        },
        collectionId: {
            type: SchemaTypes.ObjectId,
            ref: "ProductCollection",
            refAllowlist: CollectionSimpleSnippet,
            dynamicTableConfiguration: {
                refDisplayKey: ["name"],
            },
        },
        priceMin: {type: SchemaTypes.Number, min: 0},
        priceMax: {type: SchemaTypes.Number, min: 0},
        sort: {
            type: SchemaTypes.String,
            enum: SHOP_PRODUCT_SORTS,
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(SavedSearchSchema);
auditPlugin(SavedSearchSchema);
softDeletePlugin(SavedSearchSchema);
applySavedSearchIndexes(SavedSearchSchema);
lifeCyclePlugin(SavedSearchSchema);
const SavedSearch = model<ISavedSearch>("SavedSearch", SavedSearchSchema);
normalizeSchemaPermissions(SavedSearch);
export default SavedSearch;

addModelData(SavedSearch, savedSearchViews);
validateSchemaDefAgainstMongoose(SavedSearchSchema, SavedSearchSchemaDef, "SavedSearch");
