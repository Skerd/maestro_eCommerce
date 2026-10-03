import {Document, model, Schema, SchemaTypes, Types} from "mongoose";
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
export type CheckoutReservationState = "reserved" | "consumed" | "released";

export interface ICheckoutItem {
    product: Schema.Types.ObjectId;
    variant?: Schema.Types.ObjectId;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    snapshot?: {title?: string; sku?: string; imageUrl?: string};
}

/**
 * Inventory reservation created when the buyer picks a payment method (before
 * any charge). Consumed (sale) once the order is paid, released on payment
 * reset / cancel / expiry. One entry per reserved stock line.
 */
export interface ICheckoutReservation {
    product: Types.ObjectId;
    variant?: Types.ObjectId;
    warehouse: Types.ObjectId;
    quantity: number;
    state: CheckoutReservationState;
}

export interface ICheckoutAddress {
    firstName: string;
    lastName: string;
    phone?: string;
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country?: Schema.Types.ObjectId;
}

export interface ICheckout extends Document {
    cart: ICart;
    user?: IUser;
    sessionId?: string;
    company: ICompany;
    items: ICheckoutItem[];
    appliedDiscounts?: {discount: Schema.Types.ObjectId; code?: string; amount: number}[];
    shippingAddress?: ICheckoutAddress;
    billingAddress?: ICheckoutAddress;
    availableShippingRates?: {name: string; carrier?: string; price: number; estimatedDeliveryDays?: number}[];
    selectedShippingRate?: {name: string; carrier?: string; price: number; estimatedDeliveryDays?: number};
    taxBreakdown?: {name: string; rate: number; amount: number}[];
    reservations?: ICheckoutReservation[];
    /** Store credit applied to this checkout; redeemed atomically at confirm. */
    giftCard?: {giftCard: Schema.Types.ObjectId; code: string; amount: number};
    subtotal: number;
    discountTotal: number;
    shippingTotal: number;
    taxTotal: number;
    grandTotal: number;
    currency: ICurrency;
    paymentMethod?: CheckoutPaymentMethod;
    stripePaymentIntentId?: string;
    stripeClientSecret?: string;
    /** Bumped each time the payment step is reset, so gateway idempotency keys differ per attempt. */
    paymentAttempt: number;
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
        items: [{
            type: {
                product: {type: SchemaTypes.ObjectId, ref: "Product", required: true},
                variant: {type: SchemaTypes.ObjectId, ref: "ProductVariant"},
                quantity: {type: SchemaTypes.Number, required: true, min: 1},
                unitPrice: {type: SchemaTypes.Number, required: true, min: 0},
                totalPrice: {type: SchemaTypes.Number, required: true, min: 0},
                snapshot: {
                    type: {
                        title: {type: SchemaTypes.String},
                        sku: {type: SchemaTypes.String},
                        imageUrl: {type: SchemaTypes.String},
                    },
                    _id: false,
                },
            },
            default: [],
        }],
        appliedDiscounts: {
            type: [
                {
                    discount: {type: SchemaTypes.ObjectId, ref: "Discount"},
                    code: {type: SchemaTypes.String},
                    amount: {type: SchemaTypes.Number, min: 0},
                    _id: false,
                },
            ],
            default: [],
        },
        shippingAddress: {
            type: {
                firstName: {type: SchemaTypes.String, required: true},
                lastName: {type: SchemaTypes.String, required: true},
                phone: {type: SchemaTypes.String},
                street: {type: SchemaTypes.String, required: true},
                city: {type: SchemaTypes.String, required: true},
                state: {type: SchemaTypes.String},
                postalCode: {type: SchemaTypes.String},
                country: {type: SchemaTypes.ObjectId, ref: "Country", refAllowlist: CountrySimpleSnippet},
            },
            _id: false,
        },
        billingAddress: {
            type: {
                firstName: {type: SchemaTypes.String, required: true},
                lastName: {type: SchemaTypes.String, required: true},
                phone: {type: SchemaTypes.String},
                street: {type: SchemaTypes.String, required: true},
                city: {type: SchemaTypes.String, required: true},
                state: {type: SchemaTypes.String},
                postalCode: {type: SchemaTypes.String},
                country: {type: SchemaTypes.ObjectId, ref: "Country", refAllowlist: CountrySimpleSnippet},
            },
            _id: false,
        },
        availableShippingRates: {
            type: [
                {
                    name: {type: SchemaTypes.String},
                    carrier: {type: SchemaTypes.String},
                    price: {type: SchemaTypes.Number, min: 0},
                    estimatedDeliveryDays: {type: SchemaTypes.Number},
                    _id: false,
                },
            ],
            default: [],
        },
        reservations: {
            type: [
                {
                    product: {type: SchemaTypes.ObjectId, ref: "Product", required: true},
                    variant: {type: SchemaTypes.ObjectId, ref: "ProductVariant"},
                    warehouse: {type: SchemaTypes.ObjectId, ref: "Warehouse", required: true},
                    quantity: {type: SchemaTypes.Number, required: true, min: 1},
                    state: {type: SchemaTypes.String, enum: ["reserved", "consumed", "released"], default: "reserved",
                        dynamicTableConfiguration: {
                            enumTones: {
                                reserved:   "warning",
                                consumed:   "neutral",
                                released:   "success",
                            },
                        },
                    },
                    _id: false,
                },
            ],
            default: [],
            dynamicTableConfiguration: {
                enumTones: {
                    reserved:   "warning",
                    consumed:   "neutral",
                    released:   "success",
                },
            },
        },
        selectedShippingRate: {
            type: {
                name: {type: SchemaTypes.String},
                carrier: {type: SchemaTypes.String},
                price: {type: SchemaTypes.Number, min: 0},
                estimatedDeliveryDays: {type: SchemaTypes.Number},
            },
            _id: false,
        },
        giftCard: {
            type: {
                giftCard: {type: SchemaTypes.ObjectId, ref: "GiftCard"},
                code: {type: SchemaTypes.String},
                amount: {type: SchemaTypes.Number, min: 0},
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
        paymentAttempt: {type: SchemaTypes.Number, default: 0, min: 0},
        status: {
            type: SchemaTypes.String,
            enum: ["pending", "payment_processing", "confirmed", "failed", "expired"],
            default: "pending",
            dynamicTableConfiguration: {
                enumTones: {
                    pending:              "warning",
                    payment_processing:   "warning",
                    confirmed:            "success",
                    failed:               "danger",
                    expired:              "danger",
                },
            },
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
