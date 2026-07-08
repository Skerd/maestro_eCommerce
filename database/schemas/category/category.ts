import { Document, model, Schema, SchemaTypes } from "mongoose";
import { normalizeSchemaPermissions } from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import { ICompany } from "@coreModule/database/schemas/company/company";
import { applyCategoryIndexes } from "./category.indexes";
import { addModelData } from "@coreModule/database/collections";
import { categoryViews } from "./category.views";
import { CategorySimpleSnippet } from "@eCommerceModule/database/schemas/category/category.snippets";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {CategorySchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.schema-def";

export interface ICategory extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    company: ICompany;
    name: string;
    slug: string;
    parent?: ICategory;
    order: number;
}

const ListingCategorySchema = new Schema<ICategory>(
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
            ref: "ListingCategory",
            refAllowlist: CategorySimpleSnippet,
        },
        order: {
            type: SchemaTypes.Number,
            default: 0,
        },
    },
    {
        accessMode: "loose",
    }
);

ownershipPlugin(ListingCategorySchema);
auditPlugin(ListingCategorySchema);
softDeletePlugin(ListingCategorySchema);
applyCategoryIndexes(ListingCategorySchema);
/** Registered as `ListingCategory`; Mongo collection remains `categories`. */
const ListingCategory = model<ICategory>("ListingCategory", ListingCategorySchema);
normalizeSchemaPermissions(ListingCategory);
export default ListingCategory;

addModelData(ListingCategory, categoryViews);
validateSchemaDefAgainstMongoose(ListingCategorySchema, CategorySchemaDef, "ListingCategory");
