import {Document, model, Schema, SchemaTypes} from "mongoose";
import {IUser} from "@coreModule/database/schemas/user/user";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {ICurrency} from "@coreModule/database/schemas/currency/currency";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import {addModelData} from "@coreModule/database/collections";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {CompanyBlankSnippet} from "@coreModule/database/schemas/company/company.snippets";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";
import {applyCartIndexes} from "./cart.indexes";
import {cartViews} from "./cart.views";

export interface ICartItem {
    product: Schema.Types.ObjectId;
    variant?: Schema.Types.ObjectId;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    snapshot: {title: string; sku?: string; imageUrl?: string};
}

export interface ICart extends Document {
    sessionId?: string;
    user?: IUser;
    company: ICompany;
    items: ICartItem[];
    currency?: ICurrency;
    appliedDiscounts?: {discount: Schema.Types.ObjectId; code?: string; amount: number}[];
    subtotal: number;
    discountTotal: number;
    estimatedTotal: number;
    expiresAt: Date;
    mergedFrom?: Schema.Types.ObjectId;
}

const CartItemSubSchema = new Schema<ICartItem>(
    {
        product: {type: SchemaTypes.ObjectId, ref: "Product", required: true, refAllowlist: ProductSimpleSnippet},
        variant: {type: SchemaTypes.ObjectId, ref: "ProductVariant", refAllowlist: ProductVariantSimpleSnippet},
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
    {_id: true},
);

const CartSchema = new Schema<ICart>(
    {
        sessionId: {type: SchemaTypes.String, index: true},
        user: {type: SchemaTypes.ObjectId, ref: "User", refAllowlist: SimpleUserSnippet},
        company: {type: SchemaTypes.ObjectId, ref: "Company", required: true, refAllowlist: CompanyBlankSnippet},
        items: {type: [CartItemSubSchema], default: []},
        currency: {type: SchemaTypes.ObjectId, ref: "Currency", refAllowlist: CurrencySimpleSnippet},
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
        subtotal: {type: SchemaTypes.Number, default: 0, min: 0},
        discountTotal: {type: SchemaTypes.Number, default: 0, min: 0},
        estimatedTotal: {type: SchemaTypes.Number, default: 0, min: 0},
        expiresAt: {type: SchemaTypes.Date, required: true},
        mergedFrom: {type: SchemaTypes.ObjectId, ref: "Cart"},
    },
    {accessMode: "loose", timestamps: true},
);

applyCartIndexes(CartSchema);

const Cart = model<ICart>("Cart", CartSchema);
normalizeSchemaPermissions(Cart);
export default Cart;

addModelData(Cart, cartViews);
