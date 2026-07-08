import {Document, model, Schema, SchemaTypes} from "mongoose";
import {IUser} from "@coreModule/database/schemas/user/user";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {ICurrency} from "@coreModule/database/schemas/currency/currency";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {ProductOrderSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/productOrder/productOrder.schema-def";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {CountrySimpleSnippet} from "@coreModule/database/schemas/country/country.snippets";
import {CompanyBlankSnippet} from "@coreModule/database/schemas/company/company.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";
import {applyProductOrderIndexes} from "./productOrder.indexes";
import {productOrderViews} from "./productOrder.views";

export type ProductOrderPaymentStatus = "unpaid" | "authorized" | "paid" | "partially_refunded" | "refunded" | "voided";
export type ProductOrderFulfillmentStatus = "unfulfilled" | "partially_fulfilled" | "fulfilled" | "returned";
export type ProductOrderStatus = "pending" | "confirmed" | "processing" | "shipped" | "delivered" | "cancelled" | "refunded";

const AddressSubSchema = new Schema(
    {
        firstName: {type: SchemaTypes.String},
        lastName: {type: SchemaTypes.String},
        phone: {type: SchemaTypes.String},
        street: {type: SchemaTypes.String},
        city: {type: SchemaTypes.String},
        state: {type: SchemaTypes.String},
        postalCode: {type: SchemaTypes.String},
        country: {type: SchemaTypes.ObjectId, ref: "Country", refAllowlist: CountrySimpleSnippet},
    },
    {_id: false},
);

const OrderItemSubSchema = new Schema(
    {
        product: {type: SchemaTypes.ObjectId, ref: "Product", required: true, refAllowlist: ProductSimpleSnippet},
        variant: {type: SchemaTypes.ObjectId, ref: "ProductVariant", refAllowlist: ProductVariantSimpleSnippet},
        quantity: {type: SchemaTypes.Number, required: true, min: 1},
        unitPrice: {type: SchemaTypes.Number, required: true, min: 0},
        totalPrice: {type: SchemaTypes.Number, required: true, min: 0},
        snapshot: {
            type: {title: SchemaTypes.String, sku: SchemaTypes.String, imageUrl: SchemaTypes.String},
            _id: false,
        },
    },
    {_id: true},
);

const TimelineEntrySubSchema = new Schema(
    {
        event: {type: SchemaTypes.String, required: true},
        timestamp: {type: SchemaTypes.Date, default: Date.now},
        userId: {type: SchemaTypes.ObjectId, ref: "User"},
        note: {type: SchemaTypes.String},
    },
    {_id: false},
);

export interface IProductOrder extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    orderNumber: string;
    customer: IUser;
    company: ICompany;
    items: typeof OrderItemSubSchema[];
    subtotal: number;
    discountTotal: number;
    shippingTotal: number;
    taxTotal: number;
    grandTotal: number;
    currency: ICurrency;
    shippingAddress: typeof AddressSubSchema;
    billingAddress?: typeof AddressSubSchema;
    paymentStatus: ProductOrderPaymentStatus;
    fulfillmentStatus: ProductOrderFulfillmentStatus;
    status: ProductOrderStatus;
    appliedDiscounts?: {discount: Schema.Types.ObjectId; code?: string; amount: number}[];
    taxBreakdown?: {name: string; rate: number; amount: number}[];
    shippingRate?: {name: string; carrier?: string; price: number};
    notes?: string;
    internalNotes?: string;
    timeline?: typeof TimelineEntrySubSchema[];
    stripePaymentIntentId?: string;
    idempotencyKey: string;
}

const ProductOrderSchema = new Schema<IProductOrder>(
    {
        orderNumber: {type: SchemaTypes.String, required: true},
        customer: {type: SchemaTypes.ObjectId, ref: "User", required: true, refAllowlist: SimpleUserSnippet},
        company: {type: SchemaTypes.ObjectId, ref: "Company", required: true, refAllowlist: CompanyBlankSnippet},
        items: {type: [OrderItemSubSchema], default: []},
        subtotal: {type: SchemaTypes.Number, default: 0, min: 0},
        discountTotal: {type: SchemaTypes.Number, default: 0, min: 0},
        shippingTotal: {type: SchemaTypes.Number, default: 0, min: 0},
        taxTotal: {type: SchemaTypes.Number, default: 0, min: 0},
        grandTotal: {type: SchemaTypes.Number, default: 0, min: 0},
        currency: {type: SchemaTypes.ObjectId, ref: "Currency", required: true, refAllowlist: CurrencySimpleSnippet},
        shippingAddress: {type: AddressSubSchema, required: true},
        billingAddress: {type: AddressSubSchema},
        paymentStatus: {
            type: SchemaTypes.String,
            enum: ["unpaid", "authorized", "paid", "partially_refunded", "refunded", "voided"],
            default: "unpaid",
        },
        fulfillmentStatus: {
            type: SchemaTypes.String,
            enum: ["unfulfilled", "partially_fulfilled", "fulfilled", "returned"],
            default: "unfulfilled",
        },
        status: {
            type: SchemaTypes.String,
            enum: ["pending", "confirmed", "processing", "shipped", "delivered", "cancelled", "refunded"],
            default: "pending",
        },
        appliedDiscounts: {
            type: [{discount: SchemaTypes.ObjectId, code: SchemaTypes.String, amount: SchemaTypes.Number, _id: false}],
            default: [],
        },
        taxBreakdown: {
            type: [{name: SchemaTypes.String, rate: SchemaTypes.Number, amount: SchemaTypes.Number, _id: false}],
            default: [],
        },
        shippingRate: {
            type: {name: SchemaTypes.String, carrier: SchemaTypes.String, price: SchemaTypes.Number},
            _id: false,
        },
        notes: {type: SchemaTypes.String},
        internalNotes: {type: SchemaTypes.String},
        timeline: {type: [TimelineEntrySubSchema], default: []},
        stripePaymentIntentId: {type: SchemaTypes.String},
        idempotencyKey: {type: SchemaTypes.String, required: true},
    },
    {accessMode: "loose", timestamps: true},
);

ownershipPlugin(ProductOrderSchema);
auditPlugin(ProductOrderSchema);
softDeletePlugin(ProductOrderSchema);
applyProductOrderIndexes(ProductOrderSchema);
const ProductOrder = model<IProductOrder>("ProductOrder", ProductOrderSchema);
normalizeSchemaPermissions(ProductOrder);
export default ProductOrder;

addModelData(ProductOrder, productOrderViews);
// SchemaDef is intentionally empty — ProductOrders are system-generated by the checkout flow.
// excludePaths: all required/complex fields (enums, objectIds, sub-schemas, Date fields)
validateSchemaDefAgainstMongoose(ProductOrderSchema, ProductOrderSchemaDef, "ProductOrder", [
    "orderNumber", "customer", "currency", "shippingAddress", "billingAddress",
    "items", "status", "paymentStatus", "fulfillmentStatus", "idempotencyKey",
    "timeline", "paidAt", "confirmedAt", "shippedAt", "deliveredAt", "cancelledAt", "refundedAt",
    "stripePaymentIntentId",
]);
