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
    PosPaymentMethodSchemaDef,
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
            trim: true
        },
        type: {
            type: SchemaTypes.String,
            enum: ["cash", "card", "bank", "customer_account", "other"],
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
            trim: true
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
            trim: true
        },
        terminalPort: {
            type: SchemaTypes.Number,
            min: 1,
            max: 65535
        },
        terminalId: {
            type: SchemaTypes.String,
            trim: true
        },
        terminalPath: {
            type: SchemaTypes.String,
            trim: true,
            default: "/payment"
        },
    },
    {accessMode: "loose"},
);

/** Terminal on → card; off + card → cash. */
PosPaymentMethodSchema.pre("save", function () {
    if (this.terminalEnabled) {
        this.type = "card";
    } else if (this.type === "card") {
        this.type = "cash";
    }
});

// CRUD updates may use updateOne / findOneAndUpdate ($set), which bypass document save hooks.
PosPaymentMethodSchema.pre(["updateOne", "findOneAndUpdate"], async function () {
    const update = this.getUpdate() as Record<string, any> | null;
    if (!update) return;

    const $set = update.$set
        ?? (Object.keys(update).some((key) => key.startsWith("$")) ? null : update);
    if (!$set || $set.terminalEnabled === undefined) return;

    if ($set.terminalEnabled) {
        $set.type = "card";
        return;
    }

    const type =
        $set.type
        ?? (await this.model.findOne(this.getQuery()).select("type").lean())?.type;
    if (type === "card") $set.type = "cash";
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
