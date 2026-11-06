import {Document, model, Schema, SchemaTypes, Types} from "mongoose";
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
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {ILifeCyclePluginFields, IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {CartSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/cart/cart.schema-def";
import {applyCartIndexes} from "./cart.indexes";
import {cartViews} from "./cart.views";

export interface ICartItem {
    product: Types.ObjectId;
    variant?: Types.ObjectId;
    /** Seller tenant for the line (product.company). Required for platform multi-seller carts. */
    sellerCompany?: Types.ObjectId | ICompany;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    snapshot: {title: string; sku?: string; imageUrl?: string};
}

export interface ICart extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    sessionId?: string;
    user?: IUser;
    company: ICompany;
    items: ICartItem[];
    currency?: ICurrency;
    appliedDiscounts?: {discount: Types.ObjectId; code?: string; amount: number}[];
    subtotal: number;
    discountTotal: number;
    estimatedTotal: number;
    expiresAt: Date;
    mergedFrom?: Types.ObjectId;
    /** Set once the abandoned-cart reminder fired; cleared on new activity. */
    abandonedNotifiedAt?: Date;
    /** Store credit applied at cart; consumed atomically at checkout confirmation. */
    appliedGiftCard?: {giftCard: Types.ObjectId; code: string; amount: number};
}

const CartItemSubSchema = new Schema<ICartItem>(
    {
        product: {type: SchemaTypes.ObjectId, ref: "Product", required: true, refAllowlist: ProductSimpleSnippet},
        variant: {type: SchemaTypes.ObjectId, ref: "ProductVariant", refAllowlist: ProductVariantSimpleSnippet},
        sellerCompany: {type: SchemaTypes.ObjectId, ref: "Company", refAllowlist: CompanyBlankSnippet},
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

/** Required paths the server sets: repricing totals and the cart's expiry. */
const CART_SERVER_OWNED = ["expiresAt"];

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
        abandonedNotifiedAt: {type: SchemaTypes.Date},
        appliedGiftCard: {
            type: {
                giftCard: {type: SchemaTypes.ObjectId, ref: "GiftCard"},
                code: {type: SchemaTypes.String},
                amount: {type: SchemaTypes.Number, min: 0},
            },
            _id: false,
        },
    },
    {accessMode: "loose", timestamps: true},
);

// `company` is the shop of the request (the platform company on the portal apex); sellers are per line (TD-B11).
ownershipPlugin(CartSchema);
auditPlugin(CartSchema);
softDeletePlugin(CartSchema);
lifeCyclePlugin(CartSchema);
applyCartIndexes(CartSchema);
validateSchemaDefAgainstMongoose(CartSchema, CartSchemaDef, "Cart", CART_SERVER_OWNED);

const Cart = model<ICart>("Cart", CartSchema);
normalizeSchemaPermissions(Cart);
export default Cart;

addModelData(Cart, cartViews);
