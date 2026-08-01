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
import {generateUniqueSlug} from "@eCommerceModule/utilities/services/slugGenerationService";

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
            // Set by hooks from name; not required so create validation can pass first.
            required: false,
            trim: true,
            lowercase: true,
            permissions: {
                self: {write: "no-permission"},
                others: {write: "no-permission"},
            },
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

ProductCategorySchema.pre("save", async function () {
    if (!this.name) return;
    if (!this.isNew && !this.isModified("name")) return;
    const companyId = (this.company as {_id?: unknown} | null)?._id ?? this.company;
    if (!companyId) {
        throw new Error("ProductCategory company is required to generate slug");
    }
    this.slug = await generateUniqueSlug(
        this.name,
        this.constructor,
        companyId as any,
        this.isNew ? undefined : this._id,
    );
});

// CRUD updates use updateOne ($set), which bypasses document save hooks.
ProductCategorySchema.pre(["updateOne", "findOneAndUpdate"], async function () {
    const update = this.getUpdate() as Record<string, any> | null;
    if (!update) return;

    const $set = update.$set
        ?? (Object.keys(update).some((key) => key.startsWith("$")) ? null : update);
    if (!$set || $set.name === undefined || $set.slug !== undefined) return;

    const session = this.getOptions()?.session ?? null;
    const existing = await this.model
        .findOne(this.getQuery())
        .select("_id company")
        .session(session)
        .lean();
    if (!existing?.company) return;

    const slug = await generateUniqueSlug(
        String($set.name),
        this.model,
        existing.company as any,
        existing._id as any,
    );
    if (update.$set) update.$set.slug = slug;
    else update.slug = slug;
});

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
