import {Document, model, Schema, SchemaTypes} from "mongoose";
import {IMedia} from "@coreModule/database/schemas/media/media";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import publicMediaPlugin from "@coreModule/database/plugins/publicMediaPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {
    ILifeCyclePluginFields,
    IOwnershipPluginFields,
    ISoftDeletePluginFields
} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {MediaSimpleSnippet} from "@coreModule/database/schemas/media/media.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {COLUMN_TYPE} from "armonia/src/modules/core/database/filter/typeOperators";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {
    CollectionSchemaDef,
    collectionRuleFields,
    collectionRuleOperators,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/collection/collection.schema-def";
import {applyCollectionIndexes} from "./collection.indexes";
import {collectionViews} from "./collection.views";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {IProduct} from "@eCommerceModule/database/schemas/product/product";
import {generateUniqueSlug} from "@eCommerceModule/utilities/services/slugGenerationService";

export type CollectionType = "manual" | "dynamic";

export interface ICollection extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    type: CollectionType;
    name: string;
    slug: string;
    description?: string;
    mainImage?: IMedia;
    isVisible?: boolean;
    position?: number;
    products?: IProduct[];
    ruleCondition?: "all" | "any";
    rules?: {
        field: string;
        operator: string;
        value: string
    }[];
    seoTitle?: string;
    seoDescription?: string;
    publishedAt?: Date;
    company: ICompany;
}

const CollectionSchema = new Schema<ICollection>(
    {
        type: {
            type: SchemaTypes.String,
            enum: ["manual", "dynamic"],
            required: true,
        },
        name: {
            type: SchemaTypes.String,
            required: true,
            trim: true
        },
        slug: {
            type: SchemaTypes.String,
            // Set on create by pre-save (derived from name); not required so validation can pass first.
            required: false,
            trim: true,
            lowercase: true,
            permissions: {
                self: {
                    write: "no-permission",
                },
                others: {
                    write: "no-permission",
                }
            }
        },
        description: {
            type: SchemaTypes.String
        },
        mainImage: {
            type: SchemaTypes.ObjectId,
            ref: "Media",
            refAllowlist: MediaSimpleSnippet,
            dynamicTableConfiguration: {
                filterable: false,
                sortable: false,
                cellType: COLUMN_TYPE.AVATAR
            },
        },
        isVisible: {
            type: SchemaTypes.Boolean,
            default: true
        },
        position: {
            type: SchemaTypes.Number,
            default: 0
        },
        products: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "Product",
                refAllowlist: ProductSimpleSnippet
            }],
            default: [],
            dynamicTableConfiguration: {
                refDisplayKey: ["title"],
            },
        },
        ruleCondition: {
            type: SchemaTypes.String,
            enum: ["all", "any"],
            default: "all"
        },
        rules: {
            type: [
                {
                    field: {
                        type: SchemaTypes.String,
                        required: true,
                        enum: collectionRuleFields
                    },
                    operator: {
                        type: SchemaTypes.String,
                        required: true,
                        enum: collectionRuleOperators
                    },
                    value: {
                        type: SchemaTypes.String,
                        required: true
                    }
                },
            ],
            default: [],
        },
        seoTitle: {
            type: SchemaTypes.String
        },
        seoDescription: {
            type: SchemaTypes.String
        },
        publishedAt: {
            type: SchemaTypes.Date
        },
    },
    {
        accessMode: "loose"
    },
);

CollectionSchema.pre("save", async function () {
    if (!this.isNew || this.slug) return;
    if (!this.name) {
        throw new Error("Collection name is required to generate slug");
    }
    const companyId = (this.company as {_id?: unknown} | null)?._id ?? this.company;
    if (!companyId) {
        throw new Error("Collection company is required to generate slug");
    }
    this.slug = await generateUniqueSlug(this.name, this.constructor, companyId as any);
});

ownershipPlugin(CollectionSchema);
publicMediaPlugin(CollectionSchema, {schemaDef: CollectionSchemaDef});
auditPlugin(CollectionSchema);
softDeletePlugin(CollectionSchema);
lifeCyclePlugin(CollectionSchema);
applyCollectionIndexes(CollectionSchema);

const ProductCollection = model<ICollection>("ProductCollection", CollectionSchema);
normalizeSchemaPermissions(ProductCollection);
export default ProductCollection;

addModelData(ProductCollection, collectionViews);
validateSchemaDefAgainstMongoose(CollectionSchema, CollectionSchemaDef, "ProductCollection");
