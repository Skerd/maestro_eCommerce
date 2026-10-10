import {Document, model, Schema, SchemaTypes} from "mongoose";
import {IMedia} from "@coreModule/database/schemas/media/media";
import {ICurrency} from "@coreModule/database/schemas/currency/currency";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import {COLUMN_TYPE} from "armonia/src/modules/core/database/filter/typeOperators";
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
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {MediaSimpleSnippet} from "@coreModule/database/schemas/media/media.snippets";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {
    ProductSchemaDef,
    PRODUCT_TITLE_MAX,
    PRODUCT_SLUG_MAX,
    PRODUCT_DESCRIPTION_MAX,
    PRODUCT_SKU_MAX,
    PRODUCT_CODE_MAX,
    PRODUCT_URL_MAX,
    PRODUCT_META_TITLE_MAX,
    PRODUCT_META_DESCRIPTION_MAX,
    ProductTwitterCard
} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.schema-def";
import {ProductSimpleSnippet} from "./product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";
import {ProductAttributeSimpleSnippet} from "@eCommerceModule/database/schemas/productAttribute/productAttribute.snippets";
import {CategorySimpleSnippet} from "@eCommerceModule/database/schemas/category/category.snippets";
import {CollectionSimpleSnippet} from "@eCommerceModule/database/schemas/collection/collection.snippets";
import {InventorySimpleSnippet} from "@eCommerceModule/database/schemas/inventory/inventory.snippets";
import {ProductReviewSimpleSnippet} from "@eCommerceModule/database/schemas/productReview/productReview.snippets";
import {applyProductIndexes} from "./product.indexes";
import {productViews} from "./product.views";
import {IProductCategory} from "@eCommerceModule/database/schemas/category/category";
import {ICollection} from "@eCommerceModule/database/schemas/collection/collection";
import {IProductAttribute} from "@eCommerceModule/database/schemas/productAttribute/productAttribute";
import {IProductVariant} from "@eCommerceModule/database/schemas/productVariant/productVariant";
import type {IInventory} from "@eCommerceModule/database/schemas/inventory/inventory";
import type {IProductReview} from "@eCommerceModule/database/schemas/productReview/productReview";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {generateUniqueSlug} from "@eCommerceModule/utilities/services/slugGenerationService";
import {apiValidationException, DEFAULT_EXCEPTION_LANGUAGE} from "armonia/src/modules/core/helpers/exceptions";

export type ProductType = "physical" | "digital" | "service" | "variable" | "bundle" | "gift_card";
export type ProductStatus = "draft" | "active" | "archived";

export interface IProduct extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    type: ProductType;
    title: string;
    slug: string;
    description?: string;
    shortDescription?: string;
    highlights?: string[];
    careInstructions?: string;
    warranty?: string;
    faqs?: {
        question: string;
        answer: string
    }[];
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
    categories?: IProductCategory[];
    collections?: ICollection[];
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
    dimensions?: {
        length?: number;
        width?: number;
        height?: number
    };
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
    variantOptions?: IProductAttribute[];
    hasVariants?: boolean;
    defaultVariant?: IProductVariant;
    variants?: IProductVariant[];
    inventories?: IInventory[];
    reviews?: IProductReview[];
    variantCount?: number;
    // Bundles (type "bundle")
    bundleComponents?: {
        product: IProduct;
        quantity: number
    }[];
    // Digital delivery (type "digital")
    downloadLimit?: number;
    downloadExpiryDays?: number;
    // Merchandising
    relatedProducts?: IProduct[];
    upsells?: IProduct[];
    crossSells?: IProduct[];
    frequentlyBoughtTogether?: IProduct[];
    featured?: boolean;
    badges?: string[];
    // Ratings (system-computed, denormalized)
    ratingAverage?: number;
    ratingCount?: number;
    reviewCount?: number;
    // Publishing
    status: ProductStatus;
    publishedAt?: Date;
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
        twitterCard?: ProductTwitterCard;
        structuredDataType?: string;
        sitemapInclude?: boolean;
        sitemapPriority?: number;
        noIndex?: boolean;
    };
}

const ProductSchema = new Schema<IProduct>(
    {
        type: {
            type: SchemaTypes.String,
            enum: ["physical", "digital", "service", "variable", "bundle", "gift_card"],
            required: true,
        },
        title: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: PRODUCT_TITLE_MAX,
        },
        slug: {
            type: SchemaTypes.String,
            required: false,
            trim: true,
            lowercase: true,
            maxlength: PRODUCT_SLUG_MAX,
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
            type: SchemaTypes.String,
            maxlength: PRODUCT_DESCRIPTION_MAX,
        },
        shortDescription: {
            type: SchemaTypes.String,
            maxlength: PRODUCT_DESCRIPTION_MAX,
        },
        highlights: {
            type: [SchemaTypes.String],
        },
        careInstructions: {
            type: SchemaTypes.String,
            maxlength: PRODUCT_DESCRIPTION_MAX,
        },
        warranty: {
            type: SchemaTypes.String,
            maxlength: PRODUCT_DESCRIPTION_MAX,
        },
        faqs: [{
            type: {
                question: {type: SchemaTypes.String, required: true, maxlength: PRODUCT_TITLE_MAX},
                answer: {type: SchemaTypes.String, required: true, maxlength: PRODUCT_DESCRIPTION_MAX},
            },
            default: [],
        }],
        // Identifiers
        sku: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_SKU_MAX,
        },
        barcode: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_CODE_MAX,
        },
        gtin: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_CODE_MAX,
        },
        upc: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_CODE_MAX,
        },
        ean: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_CODE_MAX,
        },
        isbn: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_CODE_MAX,
        },
        mpn: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_CODE_MAX,
        },
        hsCode: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_CODE_MAX,
        },
        countryOfOrigin: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_TITLE_MAX,
        },
        // Organization
        brand: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_TITLE_MAX,
        },
        vendor: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_TITLE_MAX,
        },
        tags: {
            type: [SchemaTypes.String],
            default: []
        },
        categories: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "ProductCategory"
            }],
            default: [],
            refAllowlist: CategorySimpleSnippet,
        },
        collections: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "ProductCollection"
            }],
            default: [],
            refAllowlist: CollectionSimpleSnippet,
        },
        // Pricing
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
        msrp: {
            type: SchemaTypes.Number,
            min: 0
        },
        saleStartsAt: {
            type: SchemaTypes.Date,
            dynamicTableConfiguration: {cellType: COLUMN_TYPE.DATETIME},
        },
        saleEndsAt: {
            type: SchemaTypes.Date,
            dynamicTableConfiguration: {cellType: COLUMN_TYPE.DATETIME},
        },
        taxable: {
            type: SchemaTypes.Boolean,
            default: true
        },
        taxClass: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_CODE_MAX,
        },
        minOrderQty: {
            type: SchemaTypes.Number,
            min: 0
        },
        maxOrderQty: {
            type: SchemaTypes.Number,
            min: 0
        },
        stepQty: {
            type: SchemaTypes.Number,
            min: 0
        },
        currency: {
            type: SchemaTypes.ObjectId,
            ref: "Currency",
            refAllowlist: CurrencySimpleSnippet,
        },
        // Shipping / physical
        weight: {
            type: SchemaTypes.Number,
            min: 0
        },
        weightUnit: {
            type: SchemaTypes.String,
            enum: ["kg", "lb", "g", "oz"],
            default: "kg"
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
            }
        },
        dimensionUnit: {
            type: SchemaTypes.String,
            enum: ["cm", "in"],
            default: "cm"
        },
        volumetricWeight: {
            type: SchemaTypes.Number,
            min: 0
        },
        shippingClass: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: PRODUCT_CODE_MAX,
        },
        isHazmat: {
            type: SchemaTypes.Boolean,
            default: false
        },
        requiresShipping: {
            type: SchemaTypes.Boolean,
            default: true
        },
        // Inventory hints
        trackInventory: {
            type: SchemaTypes.Boolean,
            default: true
        },
        allowBackorder: {
            type: SchemaTypes.Boolean,
            default: false
        },
        lowStockThreshold: {
            type: SchemaTypes.Number,
            min: 0
        },
        safetyStock: {
            type: SchemaTypes.Number,
            min: 0
        },
        backorderLimit: {
            type: SchemaTypes.Number,
            min: 0
        },
        preorderEnabled: {
            type: SchemaTypes.Boolean,
            default: false
        },
        preorderAvailableAt: {
            type: SchemaTypes.Date,
            dynamicTableConfiguration: {cellType: COLUMN_TYPE.DATETIME},
        },
        availableForSale: {
            type: SchemaTypes.Boolean,
            default: true
        },
        // Media
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
        gallery: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "Media"
            }],
            default: [],
            refAllowlist: MediaSimpleSnippet,
        },
        videoUrls: {type: [SchemaTypes.String], default: []},
        documents: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "Media"
            }],
            default: [],
            refAllowlist: MediaSimpleSnippet,
        },
        // Variants / options
        variantOptions: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "ProductAttribute"
            }],
            default: [],
            refAllowlist: ProductAttributeSimpleSnippet,
        },
        hasVariants: {
            type: SchemaTypes.Boolean,
            default: false
        },
        defaultVariant: {
            type: SchemaTypes.ObjectId,
            ref: "ProductVariant",
            refAllowlist: ProductVariantSimpleSnippet,
        },
        variants: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "ProductVariant",
            }],
            required: false,
            default: [],
            refAllowlist: ProductVariantSimpleSnippet,
            dynamicTableConfiguration: {
                refDisplayKey: ["sku"],
                hideColumn: true,
            },
        },
        inventories: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "Inventory",
            }],
            required: false,
            default: [],
            refAllowlist: InventorySimpleSnippet,
            dynamicTableConfiguration: {
                refDisplayKey: ["quantityOnHand"],
                hideColumn: true,
            },
        },
        reviews: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "ProductReview",
            }],
            required: false,
            default: [],
            refAllowlist: ProductReviewSimpleSnippet,
            dynamicTableConfiguration: {
                refDisplayKey: ["title"],
                hideColumn: true,
            },
        },
        variantCount: {
            type: SchemaTypes.Number,
            min: 0,
            default: 0,
        },
        // Bundles (type "bundle")
        bundleComponents: {
            type: [
                {
                    product: {
                        type: SchemaTypes.ObjectId,
                        ref: "Product",
                        required: true,
                        refAllowlist: ProductSimpleSnippet
                    },
                    quantity: {
                        type: SchemaTypes.Number,
                        required: true,
                        min: 1
                    }
                },
            ],
            default: [],
        },
        // Digital delivery (type "digital")
        downloadLimit: {
            type: SchemaTypes.Number,
            min: 1
        },
        downloadExpiryDays: {
            type: SchemaTypes.Number,
            min: 1
        },
        // Merchandising
        relatedProducts: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "Product"
            }],
            default: [],
            refAllowlist: ProductSimpleSnippet,
        },
        upsells: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "Product"
            }],
            default: [],
            refAllowlist: ProductSimpleSnippet,
        },
        crossSells: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "Product"
            }],
            default: [],
            refAllowlist: ProductSimpleSnippet,
        },
        frequentlyBoughtTogether: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "Product"
            }],
            default: [],
            refAllowlist: ProductSimpleSnippet,
        },
        featured: {
            type: SchemaTypes.Boolean,
            default: false
        },
        badges: {
            type: [SchemaTypes.String],
            default: []
        },
        // Ratings (system-computed)
        ratingAverage: {
            type: SchemaTypes.Number,
            min: 0,
            max: 5,
            default: 0
        },
        ratingCount: {
            type: SchemaTypes.Number,
            min: 0,
            default: 0
        },
        reviewCount: {
            type: SchemaTypes.Number,
            min: 0,
            default: 0
        },
        // Publishing
        status: {
            type: SchemaTypes.String,
            enum: ["draft", "active", "archived"],
            default: "draft",
            required: true,
            dynamicTableConfiguration: {
                enumTones: {
                    draft:      "neutral",
                    active:     "success",
                    archived:   "neutral",
                },
            },
        },
        publishedAt: {
            type: SchemaTypes.Date,
            dynamicTableConfiguration: {cellType: COLUMN_TYPE.DATETIME},
        },
        // Legacy attributes / specifications
        attributes: {
            type: [
                {
                    name: {
                        type: SchemaTypes.String,
                        required: true,
                        maxlength: PRODUCT_TITLE_MAX,
                    },
                    values: {
                        type: [SchemaTypes.String],
                        default: []
                    }
                },
            ],
            default: [],
        },
        specifications: {
            type: [
                {
                    label: {
                        type: SchemaTypes.String,
                        required: true,
                        maxlength: PRODUCT_TITLE_MAX,
                    },
                    value: {
                        type: SchemaTypes.String,
                        required: true,
                        maxlength: PRODUCT_TITLE_MAX,
                    }
                },
            ],
            default: [],
        },
        seo: {
            type: {
                metaTitle: {
                    type: SchemaTypes.String,
                    maxlength: PRODUCT_META_TITLE_MAX,
                },
                metaDescription: {
                    type: SchemaTypes.String,
                    maxlength: PRODUCT_META_DESCRIPTION_MAX,
                },
                metaKeywords: {
                    type: [SchemaTypes.String],
                    default: []
                },
                canonicalUrl: {
                    type: SchemaTypes.String,
                    maxlength: PRODUCT_URL_MAX,
                },
                openGraphTitle: {
                    type: SchemaTypes.String,
                    maxlength: PRODUCT_META_TITLE_MAX,
                },
                openGraphDescription: {
                    type: SchemaTypes.String,
                    maxlength: PRODUCT_META_DESCRIPTION_MAX,
                },
                openGraphImage: {
                    type: SchemaTypes.ObjectId,
                    ref: "Media",
                    refAllowlist: MediaSimpleSnippet
                },
                twitterCard: {
                    type: SchemaTypes.String,
                    enum: ["summary", "summary_large_image"],
                    default: "summary_large_image"
                },
                structuredDataType: {
                    type: SchemaTypes.String,
                    maxlength: PRODUCT_CODE_MAX,
                },
                sitemapInclude: {
                    type: SchemaTypes.Boolean,
                    default: true
                },
                sitemapPriority: {
                    type: SchemaTypes.Number,
                    min: 0,
                    max: 1
                },
                noIndex: {
                    type: SchemaTypes.Boolean,
                    default: false
                }
            }
        },
    },
    {
        accessMode: "loose"
    },
);

ProductSchema.pre("save", async function () {
    if (!this.isNew || this.slug) return;
    if (!this.title) {
        throw apiValidationException("product_title_required_for_slug", "title", null, DEFAULT_EXCEPTION_LANGUAGE);
    }
    const companyId = nestedEntityToRef(this.company);
    if (!companyId) {
        throw apiValidationException("product_company_required_for_slug", "company", null, DEFAULT_EXCEPTION_LANGUAGE);
    }
    this.slug = await generateUniqueSlug(this.title, this.constructor, companyId);
});

ownershipPlugin(ProductSchema);
publicMediaPlugin(ProductSchema, {schemaDef: ProductSchemaDef});
auditPlugin(ProductSchema);
softDeletePlugin(ProductSchema);
lifeCyclePlugin(ProductSchema);
applyProductIndexes(ProductSchema);
const Product = model<IProduct>("Product", ProductSchema);
normalizeSchemaPermissions(Product);
export default Product;

addModelData(Product, productViews);
validateSchemaDefAgainstMongoose(ProductSchema, ProductSchemaDef, "Product");
