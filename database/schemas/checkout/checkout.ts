import {Document, model, Schema, SchemaTypes} from "mongoose";
import {IUser} from "@coreModule/database/schemas/user/user";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {ICurrency} from "@coreModule/database/schemas/currency/currency";
import {ICart} from "@eCommerceModule/database/schemas/cart/cart";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import {addModelData} from "@coreModule/database/collections";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {CompanyBlankSnippet} from "@coreModule/database/schemas/company/company.snippets";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {CountrySimpleSnippet} from "@coreModule/database/schemas/country/country.snippets";
import {applyCheckoutIndexes} from "./checkout.indexes";
import {checkoutViews} from "./checkout.views";

export type CheckoutStatus = "pending" | "payment_processing" | "confirmed" | "failed" | "expired";
export type CheckoutPaymentMethod = "stripe" | "paypal" | "cod" | "bank_transfer";

const AddressSubSchema = new Schema(
    {
        firstName: {type: SchemaTypes.String, required: true},
        lastName: {type: SchemaTypes.String, required: true},
        phone: {type: SchemaTypes.String},
        street: {type: SchemaTypes.String, required: true},
        city: {type: SchemaTypes.String, required: true},
        state: {type: SchemaTypes.String},
        postalCode: {type: SchemaTypes.String},
        country: {type: SchemaTypes.ObjectId, ref: "Country", refAllowlist: CountrySimpleSnippet},
    },
    {_id: false},
);

export interface ICheckout extends Document {
    cart: ICart;
    user?: IUser;
    sessionId?: string;
    company: ICompany;
    shippingAddress?: typeof AddressSubSchema;
    billingAddress?: typeof AddressSubSchema;
    selectedShippingRate?: {name: string; carrier?: string; price: number; estimatedDeliveryDays?: number};
    taxBreakdown?: {name: string; rate: number; amount: number}[];
    subtotal: number;
    discountTotal: number;
    shippingTotal: number;
    taxTotal: number;
    grandTotal: number;
    currency: ICurrency;
    paymentMethod?: CheckoutPaymentMethod;
    stripePaymentIntentId?: string;
    stripeClientSecret?: string;
    status: CheckoutStatus;
    idempotencyKey: string;
    expiresAt: Date;
}

const CheckoutSchema = new Schema<ICheckout>(
    {
        cart: {type: SchemaTypes.ObjectId, ref: "Cart", required: true},
        user: {type: SchemaTypes.ObjectId, ref: "User", refAllowlist: SimpleUserSnippet},
        sessionId: {type: SchemaTypes.String},
        company: {type: SchemaTypes.ObjectId, ref: "Company", required: true, refAllowlist: CompanyBlankSnippet},
        shippingAddress: {type: AddressSubSchema},
        billingAddress: {type: AddressSubSchema},
        selectedShippingRate: {
            type: {
                name: {type: SchemaTypes.String},
                carrier: {type: SchemaTypes.String},
                price: {type: SchemaTypes.Number, min: 0},
                estimatedDeliveryDays: {type: SchemaTypes.Number},
            },
            _id: false,
        },
        taxBreakdown: {
            type: [{name: SchemaTypes.String, rate: SchemaTypes.Number, amount: SchemaTypes.Number, _id: false}],
            default: [],
        },
        subtotal: {type: SchemaTypes.Number, default: 0, min: 0},
        discountTotal: {type: SchemaTypes.Number, default: 0, min: 0},
        shippingTotal: {type: SchemaTypes.Number, default: 0, min: 0},
        taxTotal: {type: SchemaTypes.Number, default: 0, min: 0},
        grandTotal: {type: SchemaTypes.Number, default: 0, min: 0},
        currency: {type: SchemaTypes.ObjectId, ref: "Currency", required: true, refAllowlist: CurrencySimpleSnippet},
        paymentMethod: {type: SchemaTypes.String, enum: ["stripe", "paypal", "cod", "bank_transfer"]},
        stripePaymentIntentId: {type: SchemaTypes.String},
        stripeClientSecret: {type: SchemaTypes.String},
        status: {
            type: SchemaTypes.String,
            enum: ["pending", "payment_processing", "confirmed", "failed", "expired"],
            default: "pending",
        },
        idempotencyKey: {type: SchemaTypes.String, required: true, unique: true},
        expiresAt: {type: SchemaTypes.Date, required: true},
    },
    {accessMode: "loose", timestamps: true},
);

applyCheckoutIndexes(CheckoutSchema);

const Checkout = model<ICheckout>("Checkout", CheckoutSchema);
normalizeSchemaPermissions(Checkout);
export default Checkout;

addModelData(Checkout, checkoutViews);
