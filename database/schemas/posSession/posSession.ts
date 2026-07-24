import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {IUser} from "@coreModule/database/schemas/user/user";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {PosSessionSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/posSession/posSession.schema-def";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {PosConfigSimpleSnippet} from "@eCommerceModule/database/schemas/posConfig/posConfig.snippets";
import {IPosConfig} from "@eCommerceModule/database/schemas/posConfig/posConfig";
import {applyPosSessionIndexes} from "./posSession.indexes";
import {posSessionViews} from "./posSession.views";

export type PosSessionState = "opening_control" | "opened" | "closing_control" | "closed";
export type PosCashMoveType = "in" | "out";

const CashMoveSubSchema = new Schema(
    {
        type: {type: SchemaTypes.String, enum: ["in", "out"], required: true},
        amount: {type: SchemaTypes.Number, required: true, min: 0},
        reason: {type: SchemaTypes.String},
        at: {type: SchemaTypes.Date, default: Date.now},
        by: {type: SchemaTypes.ObjectId, ref: "User", refAllowlist: SimpleUserSnippet},
    },
    {_id: false},
);

export interface IPosSession extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    name: string;
    config: IPosConfig;
    state: PosSessionState;
    openedBy?: IUser;
    closedBy?: IUser;
    openedAt?: Date;
    closedAt?: Date;
    openingBalance: number;
    closingBalance?: number;
    expectedCash: number;
    cashRegisterBalance: number;
    cashMoves: typeof CashMoveSubSchema[];
    orderCount: number;
    totalSales: number;
    totalCash: number;
    totalCard: number;
    notes?: string;
    company: ICompany;
}

const PosSessionSchema = new Schema<IPosSession>(
    {
        name: {type: SchemaTypes.String, required: true, trim: true},
        config: {type: SchemaTypes.ObjectId, ref: "PosConfig", required: true, refAllowlist: PosConfigSimpleSnippet},
        state: {
            type: SchemaTypes.String,
            enum: ["opening_control", "opened", "closing_control", "closed"],
            default: "opening_control",
        },
        openedBy: {type: SchemaTypes.ObjectId, ref: "User", refAllowlist: SimpleUserSnippet},
        closedBy: {type: SchemaTypes.ObjectId, ref: "User", refAllowlist: SimpleUserSnippet},
        openedAt: {type: SchemaTypes.Date},
        closedAt: {type: SchemaTypes.Date},
        openingBalance: {type: SchemaTypes.Number, default: 0, min: 0},
        closingBalance: {type: SchemaTypes.Number, min: 0},
        expectedCash: {type: SchemaTypes.Number, default: 0, min: 0},
        cashRegisterBalance: {type: SchemaTypes.Number, default: 0, min: 0},
        cashMoves: {type: [CashMoveSubSchema], default: []},
        orderCount: {type: SchemaTypes.Number, default: 0, min: 0},
        totalSales: {type: SchemaTypes.Number, default: 0, min: 0},
        totalCash: {type: SchemaTypes.Number, default: 0, min: 0},
        totalCard: {type: SchemaTypes.Number, default: 0, min: 0},
        notes: {type: SchemaTypes.String},
    },
    {accessMode: "loose", timestamps: true},
);

ownershipPlugin(PosSessionSchema);
auditPlugin(PosSessionSchema);
softDeletePlugin(PosSessionSchema);
applyPosSessionIndexes(PosSessionSchema);
const PosSession = model<IPosSession>("PosSession", PosSessionSchema);
normalizeSchemaPermissions(PosSession);
export default PosSession;

addModelData(PosSession, posSessionViews);
validateSchemaDefAgainstMongoose(PosSessionSchema, PosSessionSchemaDef, "PosSession", [
    "name",
    "state",
    "openedBy",
    "closedBy",
    "openedAt",
    "closedAt",
    "closingBalance",
    "expectedCash",
    "cashRegisterBalance",
    "cashMoves",
    "orderCount",
    "totalSales",
    "totalCash",
    "totalCard",
]);
