import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {ICurrency} from "@coreModule/database/schemas/currency/currency";
import {IUser} from "@coreModule/database/schemas/user/user";
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
import {COLUMN_TYPE} from "armonia/src/modules/core/database/filter/typeOperators";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {PosConfigSimpleSnippet} from "@eCommerceModule/database/schemas/posConfig/posConfig.snippets";
import {IPosConfig} from "@eCommerceModule/database/schemas/posConfig/posConfig";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {PosSessionSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/posSession.schema-def";
import {applyPosSessionIndexes} from "./posSession.indexes";
import {posSessionViews} from "./posSession.views";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";

export type PosSessionState = "opening_control" | "opened" | "closing_control" | "closed";
export type PosCashMoveType = "in" | "out";

export interface IPosCashMove {
    type: PosCashMoveType;
    amount: number;
    reason?: string;
    at?: Date;
    by?: IUser;
}

export interface IPosSession extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    name: string;
    config: IPosConfig;
    currency?: ICurrency;
    state: PosSessionState;
    openedBy?: IUser;
    closedBy?: IUser;
    openedAt?: Date;
    closedAt?: Date;
    openingBalance: number;
    closingBalance?: number;
    expectedCash: number;
    cashRegisterBalance: number;
    cashMoves: IPosCashMove[];
    orderCount: number;
    totalSales: number;
    totalCash: number;
    totalCard: number;
    notes?: string;
    company: ICompany;
}

const NoWritePermission = {
    self: {
        write: "no-permission",
    },
    others: {
        write: "no-permission",
    },
};

const HideFromTable = {hideColumn: true} as const;

/** Required paths the server sets: the session name, currency, state, who opened it and when, and its totals. */
const POS_SESSION_SERVER_OWNED = ["name"];

const PosSessionSchema = new Schema<IPosSession>(
    {
        name: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            permissions: NoWritePermission,
        },
        config: {
            type: SchemaTypes.ObjectId,
            ref: "PosConfig",
            required: true,
            refAllowlist: PosConfigSimpleSnippet,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {
                refDisplayKey: ["name"],
            },
        },
        currency: {
            type: SchemaTypes.ObjectId,
            ref: "Currency",
            refAllowlist: CurrencySimpleSnippet,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {
                refDisplayKey: ["symbol", "abbreviation"],
            },
        },
        state: {
            type: SchemaTypes.String,
            enum: ["opening_control", "opened", "closing_control", "closed"],
            default: "opening_control",
            dynamicTableConfiguration: {
                enumTones: {
                    opening_control:   "warning",
                    opened:            "info",
                    closing_control:   "warning",
                    closed:            "neutral",
                },
            },
        },
        openedBy: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            refAllowlist: SimpleUserSnippet,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {
                refDisplayKey: ["name", "surname"],
            },
        },
        closedBy: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            refAllowlist: SimpleUserSnippet,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {
                refDisplayKey: ["name", "surname"],
            },
        },
        openedAt: {
            type: SchemaTypes.Date,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {cellType: COLUMN_TYPE.DATETIME},
        },
        closedAt: {
            type: SchemaTypes.Date,
            permissions: NoWritePermission,
            dynamicTableConfiguration: {cellType: COLUMN_TYPE.DATETIME},
        },
        openingBalance: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission,
        },
        closingBalance: {
            type: SchemaTypes.Number,
            min: 0,
            permissions: NoWritePermission,
        },
        expectedCash: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission,
        },
        cashRegisterBalance: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission,
        },
        cashMoves: {
            type: [{
                // Declared inline, without the `{type: {...}, _id: false}` wrapper: the move's own field is called `type`, so the
                // wrapper made Mongoose read the whole move as one nested path `type` and every cash move failed validation.
                type: {
                    type: SchemaTypes.String,
                    enum: ["in", "out"],
                    required: true,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                amount: {
                    type: SchemaTypes.Number,
                    required: true,
                    min: 0,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                reason: {
                    type: SchemaTypes.String,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                at: {
                    type: SchemaTypes.Date,
                    default: Date.now,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
                by: {
                    type: SchemaTypes.ObjectId,
                    ref: "User",
                    refAllowlist: SimpleUserSnippet,
                    permissions: NoWritePermission,
                    dynamicTableConfiguration: HideFromTable,
                },
            }],
            default: [],
            dynamicTableConfiguration: HideFromTable,
        },
        orderCount: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission,
        },
        totalSales: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission,
        },
        totalCash: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission,
        },
        totalCard: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            permissions: NoWritePermission,
        },
        notes: {
            type: SchemaTypes.String,
            permissions: NoWritePermission,
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
            },
        },
        timestamps: true,
    },
);

ownershipPlugin(PosSessionSchema);
auditPlugin(PosSessionSchema);
softDeletePlugin(PosSessionSchema);
lifeCyclePlugin(PosSessionSchema);
validateSchemaDefAgainstMongoose(PosSessionSchema, PosSessionSchemaDef, "PosSession", POS_SESSION_SERVER_OWNED);
applyPosSessionIndexes(PosSessionSchema);
const PosSession = model<IPosSession>("PosSession", PosSessionSchema);
normalizeSchemaPermissions(PosSession);
export default PosSession;

addModelData(PosSession, posSessionViews);
