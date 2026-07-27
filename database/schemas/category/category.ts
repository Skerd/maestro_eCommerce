import { Document, model, Schema, SchemaTypes } from "mongoose";
import { normalizeSchemaPermissions } from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {
    ILifeCyclePluginFields,
    IOwnershipPluginFields,
    ISoftDeletePluginFields,
} from "@coreModule/database/types/plugin-fields";
import { ICompany } from "@coreModule/database/schemas/company/company";
import { applyCategoryIndexes } from "./category.indexes";
import { addModelData } from "@coreModule/database/collections";
import { categoryViews } from "./category.views";
import { CategorySimpleSnippet } from "@eCommerceModule/database/schemas/category/category.snippets";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {CategorySchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.schema-def";

export interface IProductCategory extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    company: ICompany;
    name: string;
    slug: string;
    parent?: IProductCategory;
    order: number;
}

/** @deprecated Prefer IProductCategory */
export type ICategory = IProductCategory;

const ProductCategorySchema = new Schema<IProductCategory>(
    {
        name: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
        },
        slug: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
        },
        parent: {
            type: SchemaTypes.ObjectId,
            ref: "ProductCategory",
            refAllowlist: CategorySimpleSnippet,
        },
        order: {
            type: SchemaTypes.Number,
            default: 0,
        },
    },
    {
        accessMode: "loose",
        collection: "productcategories",
    }
);

ownershipPlugin(ProductCategorySchema);
auditPlugin(ProductCategorySchema);
softDeletePlugin(ProductCategorySchema);
applyCategoryIndexes(ProductCategorySchema);
lifeCyclePlugin(ProductCategorySchema);
const ProductCategory = model<IProductCategory>("ProductCategory", ProductCategorySchema);
normalizeSchemaPermissions(ProductCategory);
export default ProductCategory;
/** @deprecated Prefer default ProductCategory export */
export const ListingCategory = ProductCategory;

addModelData(ProductCategory, categoryViews);
validateSchemaDefAgainstMongoose(ProductCategorySchema, CategorySchemaDef, "ProductCategory");
