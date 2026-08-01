import {Document, model, Schema, SchemaTypes} from "mongoose";
import {IUser} from "@coreModule/database/schemas/user/user";
import {ICurrency} from "@coreModule/database/schemas/currency/currency";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {
    ILifeCyclePluginFields,
    IOwnershipPluginFields,
    ISoftDeletePluginFields
} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {CountrySimpleSnippet} from "@coreModule/database/schemas/country/country.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";
import {applyProductOrderIndexes} from "./productOrder.indexes";
import {productOrderViews} from "./productOrder.views";
import {IProduct} from "@eCommerceModule/database/schemas/product/product";
import {IProductVariant} from "@eCommerceModule/database/schemas/productVariant/productVariant";
import { ICountry } from "@coreModule/database/schemas/country/country";
import {IDiscount} from "@eCommerceModule/database/schemas/discount/discount";
import {IGiftCard} from "@financeModule/database/schemas/giftCard/giftCard";
import {COLUMN_TYPE} from "armonia/src/modules/core/database/filter/typeOperators";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";

const HideFromTable = {hideColumn: true} as const;
export type ProductOrderPaymentStatus = "unpaid" | "authorized" | "paid" | "partially_refunded" | "refunded" | "voided";
export type ProductOrderFulfillmentStatus = "unfulfilled" | "partially_fulfilled" | "fulfilled" | "returned";
export type ProductOrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

export interface IProductOrderAddress {
    firstName?: string;
    lastName?: string;
    phone?: string;
    street?: string;
    city?: string;
    state?: string;
    postalCode?: string;
    country?: ICountry;
}

export interface IProductOrderItem {
    product: IProduct;
    variant?: IProductVariant;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    snapshot?: {
        title?: string;
        sku?: string;
        imageUrl?: string
    };
    _id: Schema.Types.ObjectId;
}

export interface IProductOrderTimelineEntry {
    event: string;
    timestamp?: Date;
    userId?: IUser;
    note?: string;
}

export interface IProductOrder extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    orderNumber: string;
    customer: IUser;
    email?: string;
    phone?: string;
    items: IProductOrderItem[];
    subtotal: number;
    discountTotal: number;
    shippingTotal: number;
    taxTotal: number;
    grandTotal: number;
    currency: ICurrency;
    shippingAddress: IProductOrderAddress;
    billingAddress?: IProductOrderAddress;
    paymentStatus: ProductOrderPaymentStatus;
    fulfillmentStatus: ProductOrderFulfillmentStatus;
    status: ProductOrderStatus;
    appliedDiscounts?: {
        discount: IDiscount;
        code?: string;
        amount: number
    }[];
    taxBreakdown?: {
        name: string;
        rate: number;
        amount: number
    }[];
    shippingRate?: {
        name: string;
        carrier?: string;
        price: number
    };
    notes?: string;
    internalNotes?: string;
    timeline?: IProductOrderTimelineEntry[];
    stripePaymentIntentId?: string;
    idempotencyKey: string;
    /** Store credit redeemed against this order. */
    giftCard?: {
        giftCard: IGiftCard;
        code?: string;
        amount: number
    };
}

const NoWritePermission = {
    self: {
        write: "no-permission",
    },
    others: {
        write: "no-permission",
    }
};

const ProductOrderSchema = new Schema<IProductOrder>(
    {
        orderNumber: {
            type: SchemaTypes.String,
            required: true,
            permissions: NoWritePermission
        },
        customer: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            required: true,
            refAllowlist: SimpleUserSnippet,
            permissions: NoWritePermission
        },
        email: {
            type: SchemaTypes.String,
            trim: true,
            permissions: NoWritePermission
        },
        phone: {
            type: SchemaTypes.String,
            trim: true,
            permissions: NoWritePermission
        },
        items: {
            type: [{
                product: {
                    type: SchemaTypes.ObjectId,
                    ref: "Product",
                    required: true,
                    refAllowlist: ProductSimpleSnippet,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                variant: {
                    type: SchemaTypes.ObjectId,
                    ref: "ProductVariant",
                    refAllowlist: ProductVariantSimpleSnippet,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                quantity: {
                    type: SchemaTypes.Number,
                    required: true,
                    min: 1,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                unitPrice: {
                    type: SchemaTypes.Number,
                    required: true,
                    min: 0,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                totalPrice: {
                    type: SchemaTypes.Number,
                    required: true,
                    min: 0,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                snapshot: {
                    type: {
                        title: {
                            type: SchemaTypes.String,
                            permissions: NoWritePermission,
                            dynamicTableConfiguration: HideFromTable,
                        },
                        sku: {
                            type: SchemaTypes.String,
                            permissions: NoWritePermission,
                            dynamicTableConfiguration: HideFromTable,
                        },
                        imageUrl: {
                            type: SchemaTypes.String,
                            permissions: NoWritePermission,
                            dynamicTableConfiguration: HideFromTable,
                        }
                    },
                },
            }],
            default: [],
            permissions: NoWritePermission,
            /** objectId cell → badges; label from each line item via refDisplayKey. */
            dynamicTableConfiguration: {
                cellType: COLUMN_TYPE.OBJECT_ID,
                refDisplayKey: ["quantity", "!x ", "snapshot.title"],
                maxInlineItems: 1,
                filterable: false,
                sortable: false,
            },
        },
        subtotal: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission
        },
        discountTotal: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission
        },
        shippingTotal: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission
        },
        taxTotal: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission
        },
        grandTotal: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission
        },
        currency: {
            type: SchemaTypes.ObjectId,
            ref: "Currency",
            required: true,
            refAllowlist: CurrencySimpleSnippet,
            permissions: NoWritePermission
        },
        shippingAddress: {
            type: {
                firstName: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                lastName: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                phone: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                street: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                city: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                state: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission
                },
                postalCode: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                country: {
                    type: SchemaTypes.ObjectId,
                    ref: "Country",
                    refAllowlist: CountrySimpleSnippet,
                    permissions: NoWritePermission,
                },
            },
            required: true,
            permissions: NoWritePermission
        },
        billingAddress: {
            type: {
                firstName: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                lastName: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                phone: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                street: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                city: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                state: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                postalCode: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                country: {
                    type: SchemaTypes.ObjectId,
                    ref: "Country",
                    refAllowlist: CountrySimpleSnippet,
                    permissions: NoWritePermission,
                },
            },
        },
        paymentStatus: {
            type: SchemaTypes.String,
            enum: ["unpaid", "authorized", "paid", "partially_refunded", "refunded", "voided"],
            default: "unpaid",
            permissions: NoWritePermission
        },
        fulfillmentStatus: {
            type: SchemaTypes.String,
            enum: ["unfulfilled", "partially_fulfilled", "fulfilled", "returned"],
            default: "unfulfilled",
            permissions: NoWritePermission
        },
        status: {
            type: SchemaTypes.String,
            enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"],
            default: "pending",
            permissions: NoWritePermission
        },
        appliedDiscounts: {
            type: [{
                discount: {
                    type: SchemaTypes.ObjectId,
                    ref: "Discount",
                    permissions: NoWritePermission,
                },
                code: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                amount: {
                    type: SchemaTypes.Number,
                    min: 0,
                    permissions: NoWritePermission,
                }
            }],
            default: [],
            permissions: NoWritePermission
        },
        taxBreakdown: {
            type: [{
                name: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                rate: {
                    type: SchemaTypes.Number,
                    permissions: NoWritePermission,
                },
                amount: {
                    type: SchemaTypes.Number,
                    permissions: NoWritePermission,
                },
            }],
            permissions: NoWritePermission,
            default: [],
        },
        shippingRate: {
            type: {
                name: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                carrier: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                price: {
                    type: SchemaTypes.Number,
                    permissions: NoWritePermission,
                }
            }
        },
        notes: {
            type: SchemaTypes.String,
            permissions: NoWritePermission
        },
        internalNotes: {
            type: SchemaTypes.String,
            permissions: NoWritePermission
        },
        timeline: {
            type: [{
                event: {
                    type: SchemaTypes.String,
                    required: true,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                timestamp: {
                    type: SchemaTypes.Date,
                    default: Date.now,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                userId: {
                    type: SchemaTypes.ObjectId,
                    ref: "User",
                    refAllowlist: SimpleUserSnippet,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                note: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
            }],
            default: [],
            permissions: NoWritePermission,
            dynamicTableConfiguration: HideFromTable,
        },
        stripePaymentIntentId: {
            type: SchemaTypes.String,
            permissions: NoWritePermission
        },
        idempotencyKey: {
            type: SchemaTypes.String,
            required: true,
            permissions: NoWritePermission
        },
        giftCard: {
            type: {
                giftCard: {
                    type: SchemaTypes.ObjectId,
                    ref: "GiftCard",
                    permissions: NoWritePermission,
                },
                code: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                },
                amount: {
                    type: SchemaTypes.Number,
                    min: 0,
                    permissions: NoWritePermission,
                },
            },
        },
    },
    {
        accessMode: "loose",
        permissions: {
            self: {
                create: "no-permission",
            },
            others: {
                create: "no-permission",
            }
        },
        timestamps: true
    },
);

ownershipPlugin(ProductOrderSchema);
auditPlugin(ProductOrderSchema);
softDeletePlugin(ProductOrderSchema);
lifeCyclePlugin(ProductOrderSchema);
applyProductOrderIndexes(ProductOrderSchema);
const ProductOrder = model<IProductOrder>("ProductOrder", ProductOrderSchema);
normalizeSchemaPermissions(ProductOrder);
export default ProductOrder;

addModelData(ProductOrder, productOrderViews);
