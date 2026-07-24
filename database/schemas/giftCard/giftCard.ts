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
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {CompanyBlankSnippet} from "@coreModule/database/schemas/company/company.snippets";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {giftCardViews} from "./giftCard.views";

export type GiftCardStatus = "active" | "depleted" | "disabled";

/**
 * System-issued store credit: created when a paid order contains a gift_card
 * product (one card per unit, balance = unit price), redeemed at cart /
 * checkout. Balance mutations are atomic decrements — never CRUD writes.
 */
export interface IGiftCard extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    code: string;
    initialBalance: number;
    balance: number;
    currency?: ICurrency;
    purchasedBy?: IUser;
    /** Source ProductOrder the card was issued from. */
    order?: Schema.Types.ObjectId;
    status: GiftCardStatus;
    expiresAt?: Date;
    company: ICompany;
}

const GiftCardSchema = new Schema<IGiftCard>(
    {
        code: {type: SchemaTypes.String, required: true, trim: true, uppercase: true},
        initialBalance: {type: SchemaTypes.Number, required: true, min: 0},
        balance: {type: SchemaTypes.Number, required: true, min: 0},
        currency: {type: SchemaTypes.ObjectId, ref: "Currency", refAllowlist: CurrencySimpleSnippet},
        purchasedBy: {type: SchemaTypes.ObjectId, ref: "User", refAllowlist: SimpleUserSnippet},
        order: {type: SchemaTypes.ObjectId, ref: "ProductOrder"},
        status: {
            type: SchemaTypes.String,
            enum: ["active", "depleted", "disabled"],
            default: "active",
        },
        expiresAt: {type: SchemaTypes.Date},
    },
    {accessMode: "loose", timestamps: true},
);

GiftCardSchema.index({company: 1, code: 1}, {unique: true});
GiftCardSchema.index({company: 1, status: 1});

ownershipPlugin(GiftCardSchema);
auditPlugin(GiftCardSchema);
softDeletePlugin(GiftCardSchema);
const GiftCard = model<IGiftCard>("GiftCard", GiftCardSchema);
normalizeSchemaPermissions(GiftCard);
export default GiftCard;

addModelData(GiftCard, giftCardViews);
