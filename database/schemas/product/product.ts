import {Document, model, Schema, SchemaTypes} from "mongoose";
import {IMedia} from "@coreModule/database/schemas/media/media";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {ICurrency} from "@coreModule/database/schemas/currency/currency";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import {COLUMN_TYPE} from "armonia/src/modules/core/database/filter/typeOperators";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {MediaSimpleSnippet} from "@coreModule/database/schemas/media/media.snippets";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {ProductSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.schema-def";
import {ProductSimpleSnippet} from "./product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";
import {ProductAttributeSimpleSnippet} from "@eCommerceModule/database/schemas/productAttribute/productAttribute.snippets";
import {applyProductIndexes} from "./product.indexes";
import {productViews} from "./product.views";

export type ProductType = "physical" | "digital" | "service" | "variable" | "bundle" | "gift_card";
export type ProductStatus = "draft" | "active" | "archived";

export interface IProduct extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    type: ProductType;
    title: string;
    slug: string;
    description?: string;
    shortDescription?: string;
    highlights?: string[];
    careInstructions?: string;
    warranty?: string;
    faqs?: {question: string; answer: string}[];
    // Identifiers
    sku?: string;
    barcode?: string;
    gtin?: string;
    upc?: string;
    ean?: string;
    isbn?: string;
    mpn?: string;
    hsCode?: string;
    countryOfOrigin?: string;
    // Organization
    brand?: string;
    vendor?: string;
    tags?: string[];
    categories?: Schema.Types.ObjectId[];
    collections?: Schema.Types.ObjectId[];
    // Pricing
    price?: number;
    compareAtPrice?: number;
    costPrice?: number;
    msrp?: number;
    saleStartsAt?: Date;
    saleEndsAt?: Date;
    taxable?: boolean;
    taxClass?: string;
    minOrderQty?: number;
    maxOrderQty?: number;
    stepQty?: number;
    currency?: ICurrency;
    // Shipping / physical
    weight?: number;
    weightUnit?: string;
    dimensions?: {length?: number; width?: number; height?: number};
    dimensionUnit?: string;
    volumetricWeight?: number;
    shippingClass?: string;
    isHazmat?: boolean;
    requiresShipping?: boolean;
    // Inventory hints
    trackInventory?: boolean;
    allowBackorder?: boolean;
    lowStockThreshold?: number;
    safetyStock?: number;
    backorderLimit?: number;
    preorderEnabled?: boolean;
    preorderAvailableAt?: Date;
    availableForSale?: boolean;
    // Media
    mainImage?: IMedia;
    gallery?: IMedia[];
    videoUrls?: string[];
    documents?: IMedia[];
    // Variants / options
    variantOptions?: Schema.Types.ObjectId[];
    hasVariants?: boolean;
    defaultVariant?: Schema.Types.ObjectId;
    variantCount?: number;
    // Merchandising
    relatedProducts?: Schema.Types.ObjectId[];
    upsells?: Schema.Types.ObjectId[];
    crossSells?: Schema.Types.ObjectId[];
    frequentlyBoughtTogether?: Schema.Types.ObjectId[];
    featured?: boolean;
    badges?: string[];
    // Ratings (system-computed, denormalized)
    ratingAverage?: number;
    ratingCount?: number;
    reviewCount?: number;
    // Publishing
    status: ProductStatus;
    publishedAt?: Date;
    // Legacy free-form attributes/specifications
    attributes?: {name: string; values: string[]}[];
    specifications?: {label: string; value: string}[];
    seo?: {
        metaTitle?: string;
        metaDescription?: string;
        metaKeywords?: string[];
        canonicalUrl?: string;
        openGraphTitle?: string;
        openGraphDescription?: string;
        openGraphImage?: IMedia;
        twitterCard?: string;
        structuredDataType?: string;
        sitemapInclude?: boolean;
        sitemapPriority?: number;
        noIndex?: boolean;
    };
    company: ICompany;
}

const SeoSubSchema = new Schema(
    {
        metaTitle: {type: SchemaTypes.String},
        metaDescription: {type: SchemaTypes.String},
        metaKeywords: {type: [SchemaTypes.String], default: []},
        canonicalUrl: {type: SchemaTypes.String},
        openGraphTitle: {type: SchemaTypes.String},
        openGraphDescription: {type: SchemaTypes.String},
        openGraphImage: {type: SchemaTypes.ObjectId, ref: "Media", refAllowlist: MediaSimpleSnippet},
        twitterCard: {type: SchemaTypes.String, enum: ["summary", "summary_large_image"], default: "summary_large_image"},
        structuredDataType: {type: SchemaTypes.String},
        sitemapInclude: {type: SchemaTypes.Boolean, default: true},
        sitemapPriority: {type: SchemaTypes.Number, min: 0, max: 1},
        noIndex: {type: SchemaTypes.Boolean, default: false},
    },
    {_id: false},
);

const DimensionsSubSchema = new Schema(
    {
        length: {type: SchemaTypes.Number, min: 0},
        width: {type: SchemaTypes.Number, min: 0},
        height: {type: SchemaTypes.Number, min: 0},
    },
    {_id: false},
);

const FaqSubSchema = new Schema(
    {
        question: {type: SchemaTypes.String, required: true},
        answer: {type: SchemaTypes.String, required: true},
    },
    {_id: false},
);

const ProductSchema = new Schema<IProduct>(
    {
        type: {
            type: SchemaTypes.String,
            enum: ["physical", "digital", "service", "variable", "bundle", "gift_card"],
            required: true,
        },
        title: {type: SchemaTypes.String, required: true, trim: true},
        slug: {type: SchemaTypes.String, required: true, trim: true, lowercase: true},
        description: {type: SchemaTypes.String, default: ""},
        shortDescription: {type: SchemaTypes.String, default: ""},
        highlights: {type: [SchemaTypes.String], default: []},
        careInstructions: {type: SchemaTypes.String},
        warranty: {type: SchemaTypes.String},
        faqs: {type: [FaqSubSchema], default: []},
        // Identifiers
        sku: {type: SchemaTypes.String, trim: true},
        barcode: {type: SchemaTypes.String, trim: true},
        gtin: {type: SchemaTypes.String, trim: true},
        upc: {type: SchemaTypes.String, trim: true},
        ean: {type: SchemaTypes.String, trim: true},
        isbn: {type: SchemaTypes.String, trim: true},
        mpn: {type: SchemaTypes.String, trim: true},
        hsCode: {type: SchemaTypes.String, trim: true},
        countryOfOrigin: {type: SchemaTypes.String, trim: true},
        // Organization
        brand: {type: SchemaTypes.String, trim: true},
        vendor: {type: SchemaTypes.String, trim: true},
        tags: {type: [SchemaTypes.String], default: []},
        categories: {
            type: [{type: SchemaTypes.ObjectId, ref: "ListingCategory"}],
            default: [],
        },
        collections: {
            type: [{type: SchemaTypes.ObjectId, ref: "ProductCollection"}],
            default: [],
        },
        // Pricing
        price: {type: SchemaTypes.Number, min: 0},
        compareAtPrice: {type: SchemaTypes.Number, min: 0},
        costPrice: {type: SchemaTypes.Number, min: 0},
        msrp: {type: SchemaTypes.Number, min: 0},
        saleStartsAt: {type: SchemaTypes.Date},
        saleEndsAt: {type: SchemaTypes.Date},
        taxable: {type: SchemaTypes.Boolean, default: true},
        taxClass: {type: SchemaTypes.String, trim: true},
        minOrderQty: {type: SchemaTypes.Number, min: 0},
        maxOrderQty: {type: SchemaTypes.Number, min: 0},
        stepQty: {type: SchemaTypes.Number, min: 0},
        currency: {
            type: SchemaTypes.ObjectId,
            ref: "Currency",
            refAllowlist: CurrencySimpleSnippet,
        },
        // Shipping / physical
        weight: {type: SchemaTypes.Number, min: 0},
        weightUnit: {type: SchemaTypes.String, enum: ["kg", "lb", "g", "oz"], default: "kg"},
        dimensions: {type: DimensionsSubSchema},
        dimensionUnit: {type: SchemaTypes.String, enum: ["cm", "in"], default: "cm"},
        volumetricWeight: {type: SchemaTypes.Number, min: 0},
        shippingClass: {type: SchemaTypes.String, trim: true},
        isHazmat: {type: SchemaTypes.Boolean, default: false},
        requiresShipping: {type: SchemaTypes.Boolean, default: true},
        // Inventory hints
        trackInventory: {type: SchemaTypes.Boolean, default: true},
        allowBackorder: {type: SchemaTypes.Boolean, default: false},
        lowStockThreshold: {type: SchemaTypes.Number, min: 0},
        safetyStock: {type: SchemaTypes.Number, min: 0},
        backorderLimit: {type: SchemaTypes.Number, min: 0},
        preorderEnabled: {type: SchemaTypes.Boolean, default: false},
        preorderAvailableAt: {type: SchemaTypes.Date},
        availableForSale: {type: SchemaTypes.Boolean, default: true},
        // Media
        mainImage: {
            type: SchemaTypes.ObjectId,
            ref: "Media",
            refAllowlist: MediaSimpleSnippet,
            dynamicTableConfiguration: {filterable: false, sortable: false, cellType: COLUMN_TYPE.AVATAR},
        },
        gallery: {
            type: [{type: SchemaTypes.ObjectId, ref: "Media"}],
            default: [],
            refAllowlist: MediaSimpleSnippet,
        },
        videoUrls: {type: [SchemaTypes.String], default: []},
        documents: {
            type: [{type: SchemaTypes.ObjectId, ref: "Media"}],
            default: [],
            refAllowlist: MediaSimpleSnippet,
        },
        // Variants / options
        variantOptions: {
            type: [{type: SchemaTypes.ObjectId, ref: "ProductAttribute"}],
            default: [],
            refAllowlist: ProductAttributeSimpleSnippet,
        },
        hasVariants: {type: SchemaTypes.Boolean, default: false},
        defaultVariant: {
            type: SchemaTypes.ObjectId,
            ref: "ProductVariant",
            refAllowlist: ProductVariantSimpleSnippet,
        },
        // Merchandising
        relatedProducts: {
            type: [{type: SchemaTypes.ObjectId, ref: "Product"}],
            default: [],
            refAllowlist: ProductSimpleSnippet,
        },
        upsells: {
            type: [{type: SchemaTypes.ObjectId, ref: "Product"}],
            default: [],
            refAllowlist: ProductSimpleSnippet,
        },
        crossSells: {
            type: [{type: SchemaTypes.ObjectId, ref: "Product"}],
            default: [],
            refAllowlist: ProductSimpleSnippet,
        },
        frequentlyBoughtTogether: {
            type: [{type: SchemaTypes.ObjectId, ref: "Product"}],
            default: [],
            refAllowlist: ProductSimpleSnippet,
        },
        featured: {type: SchemaTypes.Boolean, default: false},
        badges: {type: [SchemaTypes.String], default: []},
        // Ratings (system-computed)
        ratingAverage: {type: SchemaTypes.Number, min: 0, max: 5, default: 0},
        ratingCount: {type: SchemaTypes.Number, min: 0, default: 0},
        reviewCount: {type: SchemaTypes.Number, min: 0, default: 0},
        // Publishing
        status: {
            type: SchemaTypes.String,
            enum: ["draft", "active", "archived"],
            default: "draft",
            required: true,
        },
        publishedAt: {type: SchemaTypes.Date},
        // Legacy attributes / specifications
        attributes: {
            type: [
                {
                    name: {type: SchemaTypes.String, required: true},
                    values: {type: [SchemaTypes.String], default: []},
                    _id: false,
                },
            ],
            default: [],
        },
        specifications: {
            type: [
                {
                    label: {type: SchemaTypes.String, required: true},
                    value: {type: SchemaTypes.String, required: true},
                    _id: false,
                },
            ],
            default: [],
        },
        seo: {type: SeoSubSchema},
    },
    {accessMode: "loose"},
);

ownershipPlugin(ProductSchema);
auditPlugin(ProductSchema);
softDeletePlugin(ProductSchema);
applyProductIndexes(ProductSchema);
const Product = model<IProduct>("Product", ProductSchema);
normalizeSchemaPermissions(Product);
export default Product;

addModelData(Product, productViews);
validateSchemaDefAgainstMongoose(ProductSchema, ProductSchemaDef, "Product");
