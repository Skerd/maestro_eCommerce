import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {
    ILifeCyclePluginFields,
    IOwnershipPluginFields,
    ISoftDeletePluginFields,
} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {
    POS_PAYMENT_METHOD_CASH_QUICK_AMOUNTS_MAX,
    POS_PAYMENT_METHOD_NAME_MAX,
    POS_PAYMENT_METHOD_TERMINAL_HOST_MAX,
    POS_PAYMENT_METHOD_TERMINAL_ID_MAX,
    POS_PAYMENT_METHOD_TERMINAL_PATH_MAX,
    PosPaymentMethodSchemaDef,
    posPaymentMethodTypes,
    type PosPaymentMethodType,
    type PosTerminalProtocol,
    type PosTerminalProvider,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/posPaymentMethod/posPaymentMethod.schema-def";
import {applyPosPaymentMethodIndexes} from "./posPaymentMethod.indexes";
import {posPaymentMethodViews} from "./posPaymentMethod.views";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";

export type {PosPaymentMethodType, PosTerminalProtocol, PosTerminalProvider};

export interface IPosPaymentMethod extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    name: string;
    type: PosPaymentMethodType;
    isActive: boolean;
    sequence: number;
    cashQuickAmounts?: string;
    terminalEnabled?: boolean;
    terminalProvider?: PosTerminalProvider;
    terminalProtocol?: PosTerminalProtocol;
    terminalHost?: string;
    terminalPort?: number;
    terminalId?: string;
    terminalPath?: string;
    company: ICompany;
}

const PosPaymentMethodSchema = new Schema<IPosPaymentMethod>(
    {
        name: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: POS_PAYMENT_METHOD_NAME_MAX,
        },
        type: {
            type: SchemaTypes.String,
            enum: [...posPaymentMethodTypes],
            required: true,
        },
        isActive: {
            type: SchemaTypes.Boolean,
            default: true
        },
        sequence: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0
        },
        cashQuickAmounts: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: POS_PAYMENT_METHOD_CASH_QUICK_AMOUNTS_MAX,
        },
        terminalEnabled: {
            type: SchemaTypes.Boolean,
            default: false
        },
        terminalProvider: {
            type: SchemaTypes.String,
            enum: ["manual", "local_http"],
            default: "manual",
        },
        terminalProtocol: {
            type: SchemaTypes.String,
            enum: ["http", "https"],
            default: "http",
        },
        terminalHost: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: POS_PAYMENT_METHOD_TERMINAL_HOST_MAX,
        },
        terminalPort: {
            type: SchemaTypes.Number,
            min: 1,
            max: 65535
        },
        terminalId: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: POS_PAYMENT_METHOD_TERMINAL_ID_MAX,
        },
        terminalPath: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: POS_PAYMENT_METHOD_TERMINAL_PATH_MAX,
            default: "/payment"
        },
    },
    {accessMode: "loose"},
);

/** Type is the source of truth: card enables the terminal, every other type turns it off. */
PosPaymentMethodSchema.pre("save", function () {
    this.terminalEnabled = this.type === "card";
});

// CRUD updates may use updateOne / findOneAndUpdate ($set), which bypass document save hooks.
PosPaymentMethodSchema.pre(["updateOne", "findOneAndUpdate"], async function () {
    const update = this.getUpdate() as Record<string, any> | null;
    if (!update) return;

    const $set = update.$set
        ?? (Object.keys(update).some((key) => key.startsWith("$")) ? null : update);
    if (!$set || ($set.type === undefined && $set.terminalEnabled === undefined)) return;

    const type =
        $set.type
        ?? (await this.model.findOne(this.getQuery()).select("type").lean())?.type;
    $set.terminalEnabled = type === "card";
});

ownershipPlugin(PosPaymentMethodSchema);
auditPlugin(PosPaymentMethodSchema);
softDeletePlugin(PosPaymentMethodSchema);
applyPosPaymentMethodIndexes(PosPaymentMethodSchema);
lifeCyclePlugin(PosPaymentMethodSchema);
const PosPaymentMethod = model<IPosPaymentMethod>("PosPaymentMethod", PosPaymentMethodSchema);
normalizeSchemaPermissions(PosPaymentMethod);
export default PosPaymentMethod;

addModelData(PosPaymentMethod, posPaymentMethodViews);
validateSchemaDefAgainstMongoose(PosPaymentMethodSchema, PosPaymentMethodSchemaDef, "PosPaymentMethod");
