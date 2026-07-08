import {Document, model, Schema, SchemaTypes} from "mongoose";
import {IMedia} from "@coreModule/database/schemas/media/media";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {ICurrency} from "@coreModule/database/schemas/currency/currency";
import {IProduct} from "@eCommerceModule/database/schemas/product/product";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {MediaSimpleSnippet} from "@coreModule/database/schemas/media/media.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductAttributeSimpleSnippet} from "@eCommerceModule/database/schemas/productAttribute/productAttribute.snippets";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {ProductVariantSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/productVariant.schema-def";
import {applyProductVariantIndexes} from "./productVariant.indexes";
import {productVariantViews} from "./productVariant.views";

export interface IProductVariant extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    product: IProduct;
    sku?: string;
    barcode?: string;
    attributeCombination?: {attribute: Schema.Types.ObjectId; value: string}[];
    price?: number;
    compareAtPrice?: number;
    costPrice?: number;
    currency?: ICurrency;
    weight?: number;
    dimensions?: {length?: number; width?: number; height?: number};
    mainImage?: IMedia;
    position: number;
    status: "active" | "inactive";
    trackInventory?: boolean;
    company: ICompany;
}

const DimensionsSubSchema = new Schema(
    {
        length: {type: SchemaTypes.Number, min: 0},
        width: {type: SchemaTypes.Number, min: 0},
        height: {type: SchemaTypes.Number, min: 0},
    },
    {_id: false},
);

const ProductVariantSchema = new Schema<IProductVariant>(
    {
        product: {
            type: SchemaTypes.ObjectId,
            ref: "Product",
            required: true,
            refAllowlist: ProductSimpleSnippet,
        },
        sku: {type: SchemaTypes.String, trim: true},
        barcode: {type: SchemaTypes.String, trim: true},
        attributeCombination: {
            type: [
                {
                    attribute: {type: SchemaTypes.ObjectId, ref: "ProductAttribute", refAllowlist: ProductAttributeSimpleSnippet},
                    value: {type: SchemaTypes.String, required: true},
                    _id: false,
                },
            ],
            default: [],
        },
        price: {type: SchemaTypes.Number, min: 0},
        compareAtPrice: {type: SchemaTypes.Number, min: 0},
        costPrice: {type: SchemaTypes.Number, min: 0},
        currency: {
            type: SchemaTypes.ObjectId,
            ref: "Currency",
            refAllowlist: CurrencySimpleSnippet,
        },
        weight: {type: SchemaTypes.Number, min: 0},
        dimensions: {type: DimensionsSubSchema},
        mainImage: {
            type: SchemaTypes.ObjectId,
            ref: "Media",
            refAllowlist: MediaSimpleSnippet,
        },
        position: {type: SchemaTypes.Number, default: 0},
        status: {
            type: SchemaTypes.String,
            enum: ["active", "inactive"],
            default: "active",
        },
        trackInventory: {type: SchemaTypes.Boolean, default: true},
    },
    {accessMode: "loose"},
);

ownershipPlugin(ProductVariantSchema);
auditPlugin(ProductVariantSchema);
softDeletePlugin(ProductVariantSchema);
applyProductVariantIndexes(ProductVariantSchema);
const ProductVariant = model<IProductVariant>("ProductVariant", ProductVariantSchema);
normalizeSchemaPermissions(ProductVariant);
export default ProductVariant;

addModelData(ProductVariant, productVariantViews);
validateSchemaDefAgainstMongoose(ProductVariantSchema, ProductVariantSchemaDef, "ProductVariant");
