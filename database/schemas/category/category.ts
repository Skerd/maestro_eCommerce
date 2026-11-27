import { Document, model, Schema, SchemaTypes, Types } from "mongoose";
import { normalizeSchemaPermissions } from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import requestablePlugin, {type IRequestablePluginFields} from "@coreModule/database/plugins/requestablePlugin";
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
import {
    CATEGORY_NAME_MAX,
    CategorySchemaDef,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.schema-def";
import {generateUniqueSlug} from "@coreModule/utilities/helpers/uniqueSlug";
import {apiValidationException, DEFAULT_EXCEPTION_LANGUAGE} from "armonia/src/modules/core/helpers/exceptions";

/** A category's name in each of the panel's languages; `name` is the English one (D195). */
export type CategoryNames = {en?: string; sq?: string; de?: string; fr?: string; it?: string};

/**
 * A platform product category (D195): one tree owned by the platform company and shared by every shop, built like the
 * D160 platform lists. Seeded from Shopify's Standard Product Taxonomy (`shopifyId`); a shop requests a missing one.
 */
export interface IProductCategory extends Document, IOwnershipPluginFields, IRequestablePluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    company: ICompany;
    name: string;
    names?: CategoryNames;
    slug: string;
    parent?: IProductCategory;
    order: number;
    /** The taxonomy id the row was seeded from (`aa-1-2`); a later release updates the same row. */
    shopifyId?: string;
    /** Every name, lower-cased, so a select finds the category in any language. */
    searchText?: string;
    /** The top-level category above it (itself at the top): a shop's "What we sell" branches filter on it (P26.8). */
    branch?: Types.ObjectId;
}

const SERVER_WRITTEN = {self: {write: "no-permission"}, others: {write: "no-permission"}} as const;
const NAME_LANGUAGES = ["en", "sq", "de", "fr", "it"] as const;

/** The text a select searches: the English name and every translation, lower-cased. */
export function categorySearchText(name: string | undefined, names: CategoryNames | undefined): string {
    return [...new Set([name, ...NAME_LANGUAGES.map((language) => names?.[language])]
        .filter((value): value is string => !!value && value.trim() !== "")
        .map((value) => value.trim().toLowerCase()))].join(" | ");
}

const ProductCategorySchema = new Schema<IProductCategory>(
    {
        name: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: CATEGORY_NAME_MAX,
        },
        names: {
            type: new Schema(Object.fromEntries(NAME_LANGUAGES.map((language) => [language, {
                type: SchemaTypes.String, trim: true, maxlength: CATEGORY_NAME_MAX,
            }])), {_id: false}),
            required: false,
            dynamicTableConfiguration: {hideColumn: true},
        },
        shopifyId: {
            type: SchemaTypes.String,
            required: false,
            permissions: SERVER_WRITTEN,
            dynamicTableConfiguration: {hideColumn: true},
        },
        searchText: {
            type: SchemaTypes.String,
            required: false,
            permissions: SERVER_WRITTEN,
            dynamicTableConfiguration: {hideColumn: true},
        },
        branch: {
            type: SchemaTypes.ObjectId,
            ref: "ProductCategory",
            required: false,
            permissions: SERVER_WRITTEN,
            dynamicTableConfiguration: {hideColumn: true},
        },
        slug: {
            type: SchemaTypes.String,
            required: false,
            trim: true,
            lowercase: true,
            permissions: {
                self: {write: "no-permission"},
                others: {write: "no-permission"},
            },
            dynamicTableConfiguration: {hideColumn: true},
        },
        parent: {
            type: SchemaTypes.ObjectId,
            ref: "ProductCategory",
            refAllowlist: CategorySimpleSnippet,
        },
        order: {
            type: SchemaTypes.Number,
            default: 0,
            dynamicTableConfiguration: {hideColumn: true},
        },
    },
    {
        accessMode: "loose",
        collection: "productcategories",
    }
);

/** The top-level category of a category under `parentId`, or the category itself (`selfId`) at the top. */
async function branchUnder(parentId: unknown, selfId: Types.ObjectId): Promise<Types.ObjectId> {
    if (!parentId) return selfId;
    const parent = await ProductCategory.findById(parentId).select("_id branch").lean();
    return parent?.branch ?? parent?._id ?? selfId;
}

ProductCategorySchema.pre("save", async function () {
    // The taxonomy seed sets every row's branch itself (a parent in the same batch is not stored yet).
    if ((this.isNew && !this.branch) || (!this.isNew && this.isModified("parent"))) this.branch = await branchUnder(this.parent, this._id);
    if (!this.name) return;
    if (this.isNew || this.isModified("name") || this.isModified("names")) this.searchText = categorySearchText(this.name, this.names);
    // The taxonomy seed brings its own unique slugs.
    if (this.isNew && this.slug) return;
    if (!this.isNew && !this.isModified("name")) return;
    const companyId = (this.company as {_id?: unknown} | null)?._id ?? this.company;
    if (!companyId) {
        throw apiValidationException("product_category_company_required", "company", null, DEFAULT_EXCEPTION_LANGUAGE);
    }
    this.slug = await generateUniqueSlug(this.name, this.constructor, companyId as any, this.isNew ? undefined : this._id);
});

// CRUD edit uses updateOne($set), which skips pre("save").
ProductCategorySchema.pre(["updateOne", "findOneAndUpdate"], async function () {
    const update = this.getUpdate();
    if (!update || Array.isArray(update)) return;
    const {$set} = update;
    if ($set && $set.parent !== undefined && $set.branch === undefined) {
        // A category moved under another branch takes its branch along, with every category below it.
        const moved = await this.model.findOne(this.getQuery()).select("_id branch").lean();
        if (moved) {
            const branch = await branchUnder($set.parent, moved._id);
            $set.branch = branch;
            if (String(branch) !== String(moved.branch)) {
                let frontier: Types.ObjectId[] = [moved._id];
                while (frontier.length > 0) {
                    const children = await ProductCategory.find({parent: {$in: frontier}}).select("_id").lean();
                    frontier = children.map((child) => child._id);
                    if (frontier.length > 0) await ProductCategory.collection.updateMany({_id: {$in: frontier}}, {$set: {branch}});
                }
            }
        }
    }
    const namesChanged = !!$set && Object.keys($set).some((key) => key === "names" || key.startsWith("names."));
    if (!$set || ($set.name === undefined && !namesChanged)) return;

    const existing = await this.model
        .findOne(this.getQuery())
        .select("_id company name names")
        .session(this.getOptions()?.session ?? null)
        .lean();
    if (!existing?.company) return;

    const names: CategoryNames = {...(existing.names ?? {}), ...($set.names ?? {})};
    for (const language of NAME_LANGUAGES) if ($set[`names.${language}`] !== undefined) names[language] = $set[`names.${language}`];
    $set.searchText = categorySearchText($set.name ?? existing.name, names);
    if ($set.name === undefined || $set.slug !== undefined) return;
    $set.slug = await generateUniqueSlug(String($set.name), this.model, existing.company, existing._id);
});

// A platform list (D160, D195): every shop reads the platform company's rows; a shop's create is a request.
ownershipPlugin(ProductCategorySchema, {tenantScoped: false});
requestablePlugin(ProductCategorySchema);
auditPlugin(ProductCategorySchema);
softDeletePlugin(ProductCategorySchema);
applyCategoryIndexes(ProductCategorySchema);
lifeCyclePlugin(ProductCategorySchema);
const ProductCategory = model<IProductCategory>("ProductCategory", ProductCategorySchema);
normalizeSchemaPermissions(ProductCategory);
export default ProductCategory;

addModelData(ProductCategory, categoryViews);
/** Server-written paths: the seeded taxonomy id and the search text. */
validateSchemaDefAgainstMongoose(ProductCategorySchema, CategorySchemaDef, "ProductCategory", ["shopifyId", "searchText"]);
