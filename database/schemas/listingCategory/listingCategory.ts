import * as crypto from "crypto";
import slugify from "slugify";
import { Document, model, Schema, SchemaTypes } from "mongoose";
import { normalizeSchemaPermissions } from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields} from "@coreModule/database/types/plugin-fields";
import { ICompany } from "@coreModule/database/schemas/company/company";
import { applyListingCategoryIndexes } from "./listingCategory.indexes";
import { addModelData } from "@coreModule/database/collections";
import { listingCategoryViews } from "./listingCategory.views";
import { ListingCategorySimpleSnippet } from "@eCommerceModule/database/schemas/listingCategory/listingCategory.snippets";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {ListingCategorySchemaDef} from "armonia/src/modules/eCommerce/api/eCommerceMarketplace/private/listingCategory/listingCategory.schema-def";

export interface IListingCategory extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    company: ICompany;
    name: string;
    slug: string;
    parentListingCategory?: IListingCategory;
    order: number;
}

const ListingCategorySchema = new Schema<IListingCategory>(
    {
        name: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
        },
        slug: {
            type: SchemaTypes.String,
            // Set by pre-save on create when omitted; not required so create validation can pass first.
            required: false,
            trim: true,
            permissions: {
                self: {write: "no-permission"},
                others: {write: "no-permission"},
            },
        },
        parentListingCategory: {
            type: SchemaTypes.ObjectId,
            ref: "ListingCategory",
            refAllowlist: ListingCategorySimpleSnippet,
        },
        order: {
            type: SchemaTypes.Number,
            default: 0,
        },
    },
    {
        accessMode: "loose",
        collection: "listingcategories",
    }
);

// Auto-generate unique slug on create: LCAT-{name}-{XXXXXXXX} (sticky after create).
ListingCategorySchema.pre("save", function (next) {
    const category = this as unknown as IListingCategory;
    if (category.isNew && !category.slug) {
        const namePart = slugify(category.name || "category", {lower: true}) || "category";
        const randomPart = crypto.randomBytes(4).toString("hex");
        category.slug = `LCAT-${namePart}-${randomPart}`.toUpperCase();
    }
    next();
});

ownershipPlugin(ListingCategorySchema);
auditPlugin(ListingCategorySchema);
softDeletePlugin(ListingCategorySchema);
lifeCyclePlugin(ListingCategorySchema);
applyListingCategoryIndexes(ListingCategorySchema);
const ListingCategory = model<IListingCategory>("ListingCategory", ListingCategorySchema);
normalizeSchemaPermissions(ListingCategory);
export default ListingCategory;

addModelData(ListingCategory, listingCategoryViews);
validateSchemaDefAgainstMongoose(ListingCategorySchema, ListingCategorySchemaDef, "ListingCategory");
