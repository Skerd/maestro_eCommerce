import {Document, model, Schema, SchemaTypes} from "mongoose";
import {IMedia} from "@coreModule/database/schemas/media/media";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {ICurrency} from "@coreModule/database/schemas/currency/currency";
import {IProduct} from "@eCommerceModule/database/schemas/product/product";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import publicMediaPlugin from "@coreModule/database/plugins/publicMediaPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {
    ILifeCyclePluginFields,
    IOwnershipPluginFields,
    ISoftDeletePluginFields,
} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {MediaSimpleSnippet} from "@coreModule/database/schemas/media/media.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductAttributeSimpleSnippet} from "@eCommerceModule/database/schemas/productAttribute/productAttribute.snippets";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {
    PRODUCT_VARIANT_ATTRIBUTE_VALUE_MAX,
    PRODUCT_VARIANT_BARCODE_MAX,
    PRODUCT_VARIANT_SKU_MAX,
    ProductVariantSchemaDef,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/productVariant.schema-def";
import {applyProductVariantIndexes} from "./productVariant.indexes";
import {productVariantViews} from "./productVariant.views";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {IProductAttribute} from "@eCommerceModule/database/schemas/productAttribute/productAttribute";

export interface IProductVariant extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    product: IProduct;
    sku?: string;
    barcode?: string;
    attributeCombination?: {
        attribute: IProductAttribute;
        value: string
    }[];
    price?: number;
    compareAtPrice?: number;
    costPrice?: number;
    currency?: ICurrency;
    weight?: number;
    dimensions?: {length?: number; width?: number; height?: number};
    mainImage?: IMedia;
    order: number;
    status: "active" | "inactive";
    trackInventory?: boolean;
}

const ProductVariantSchema = new Schema<IProductVariant>(
    {
        product: {
            type: SchemaTypes.ObjectId,
            ref: "Product",
            required: true,
            refAllowlist: ProductSimpleSnippet,
        },
        sku: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_VARIANT_SKU_MAX,
        },
        barcode: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_VARIANT_BARCODE_MAX,
        },
        attributeCombination: {
            type: [
                {
                    attribute: {
                        type: SchemaTypes.ObjectId,
                        ref: "ProductAttribute",
                        refAllowlist: ProductAttributeSimpleSnippet
                    },
                    value: {
                        type: SchemaTypes.String,
                        required: true,
                        maxlength: PRODUCT_VARIANT_ATTRIBUTE_VALUE_MAX,
                    },
                    _id: false,
                },
            ],
            default: [],
        },
        price: {
            type: SchemaTypes.Number,
            min: 0
        },
        compareAtPrice: {
            type: SchemaTypes.Number,
            min: 0
        },
        costPrice: {
            type: SchemaTypes.Number,
            min: 0
        },
        currency: {
            type: SchemaTypes.ObjectId,
            ref: "Currency",
            refAllowlist: CurrencySimpleSnippet,
        },
        weight: {
            type: SchemaTypes.Number,
            min: 0
        },
        dimensions: {
            type: {
                length: {
                    type: SchemaTypes.Number,
                    min: 0
                },
                width: {
                    type: SchemaTypes.Number,
                    min: 0
                },
                height: {
                    type: SchemaTypes.Number,
                    min: 0
                },
            },
            _id: false,
        },
        mainImage: {
            type: SchemaTypes.ObjectId,
            ref: "Media",
            refAllowlist: MediaSimpleSnippet,
        },
        order: {
            type: SchemaTypes.Number,
            default: 0
        },
        status: {
            type: SchemaTypes.String,
            enum: ["active", "inactive"],
            default: "active",
            dynamicTableConfiguration: {
                enumTones: {
                    active:     "success",
                    inactive:   "neutral",
                },
            },
        },
        trackInventory: {
            type: SchemaTypes.Boolean,
            default: true
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(ProductVariantSchema);
publicMediaPlugin(ProductVariantSchema, {schemaDef: ProductVariantSchemaDef});
auditPlugin(ProductVariantSchema);
softDeletePlugin(ProductVariantSchema);
applyProductVariantIndexes(ProductVariantSchema);
lifeCyclePlugin(ProductVariantSchema);
const ProductVariant = model<IProductVariant>("ProductVariant", ProductVariantSchema);
normalizeSchemaPermissions(ProductVariant);
export default ProductVariant;

addModelData(ProductVariant, productVariantViews);
validateSchemaDefAgainstMongoose(ProductVariantSchema, ProductVariantSchemaDef, "ProductVariant");
