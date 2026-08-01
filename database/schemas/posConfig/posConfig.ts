import {Document, model, Schema, SchemaTypes, Types} from "mongoose";
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
    ISoftDeletePluginFields,
} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {PosConfigSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/posConfig.schema-def";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {WarehouseSimpleSnippet} from "@eCommerceModule/database/schemas/warehouse/warehouse.snippets";
import {PosPaymentMethodSimpleSnippet} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod.snippets";
import {IWarehouse} from "@eCommerceModule/database/schemas/warehouse/warehouse";
import {IPosPaymentMethod} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod";
import {applyPosConfigIndexes} from "./posConfig.indexes";
import {posConfigViews} from "./posConfig.views";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";

export type IPosManagerPinReset = {
    code?: string;
    date?: Date;
    opened?: boolean;
};

/** Per-manager credentials — never expose pinHash in DTOs. Stored as ObjectId (not populated). */
export type IPosManagerPin = {
    user: Types.ObjectId;
    pinHash?: string;
    pinReset?: IPosManagerPinReset;
};

export interface IPosConfig extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    name: string;
    paymentMethods?: IPosPaymentMethod[];
    /** Users assigned as managers for this till. */
    managers?: IUser[];
    /** PIN credentials keyed by manager user (server-only). */
    managerPins?: IPosManagerPin[];
    /** Warehouses this till can sell from (stock is aggregated / allocated across them). */
    warehouses?: IWarehouse[];
    currency?: ICurrency;
    receiptHeader?: string;
    receiptFooter?: string;
    ifaceBarcodeScanner: boolean;
    ifaceCashControl: boolean;
    allowDiscount: boolean;
    allowQuantityChange: boolean;
    /** Allow selling below available stock. */
    allowOversell: boolean;
    /** Require manager PIN for order/line discounts. */
    pinForDiscount: boolean;
    /** Require manager PIN for cash-out moves. */
    pinForCashOut: boolean;
    /** Require manager PIN for refunds. */
    pinForRefund: boolean;
    isActive: boolean;
    /** Set when this till is emergency-paused (actions only — not SchemaDef). */
    pausedAt?: Date | null;
    pausedBy?: IUser | null;
    pauseReason?: string | null;
    company: ICompany;
}

const PosConfigSchema = new Schema<IPosConfig>(
    {
        name: {
            type: SchemaTypes.String,
            required: true,
            trim: true
        },
        paymentMethods: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "PosPaymentMethod",
                refAllowlist: PosPaymentMethodSimpleSnippet
            }],
            default: [],
        },
        managers: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "User",
                refAllowlist: SimpleUserSnippet
            }],
            default: [],
        },
        managerPins: [{
            type: {
                user: {
                    type: SchemaTypes.ObjectId,
                    ref: "User",
                    required: true
                },
                pinHash: {
                    type: SchemaTypes.String
                },
                pinReset: {
                    type: {
                        code: {
                            type: SchemaTypes.String
                        },
                        date: {
                            type: SchemaTypes.Date
                        },
                        opened: {
                            type: SchemaTypes.Boolean
                        },
                    },
                    _id: false,
                },
            },
            _id: false,
            default: [],
        }],
        warehouses: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "Warehouse",
                refAllowlist: WarehouseSimpleSnippet
            }],
            default: [],
            validate: {
                validator: (v: unknown[]) => Array.isArray(v) && v.length > 0,
                message: "At least one warehouse is required",
            },
        },
        currency: {
            type: SchemaTypes.ObjectId,
            ref: "Currency",
            refAllowlist: CurrencySimpleSnippet
        },
        receiptHeader: {
            type: SchemaTypes.String
        },
        receiptFooter: {
            type: SchemaTypes.String
        },
        ifaceBarcodeScanner: {
            type: SchemaTypes.Boolean,
            default: true
        },
        ifaceCashControl: {
            type: SchemaTypes.Boolean,
            default: true
        },
        allowDiscount: {
            type: SchemaTypes.Boolean,
            default: true
        },
        allowQuantityChange: {
            type: SchemaTypes.Boolean,
            default: true
        },
        allowOversell: {
            type: SchemaTypes.Boolean,
            default: false
        },
        pinForDiscount: {
            type: SchemaTypes.Boolean,
            default: false
        },
        pinForCashOut: {
            type: SchemaTypes.Boolean,
            default: false
        },
        pinForRefund: {
            type: SchemaTypes.Boolean,
            default: false
        },
        isActive: {
            type: SchemaTypes.Boolean,
            default: true
        },
        pausedAt: {
            type: SchemaTypes.Date,
            default: null,
        },
        pausedBy: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            refAllowlist: SimpleUserSnippet,
            default: null,
        },
        pauseReason: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: 500,
            default: null,
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(PosConfigSchema);
auditPlugin(PosConfigSchema);
softDeletePlugin(PosConfigSchema);
applyPosConfigIndexes(PosConfigSchema);
lifeCyclePlugin(PosConfigSchema);
const PosConfig = model<IPosConfig>("PosConfig", PosConfigSchema);
normalizeSchemaPermissions(PosConfig);
export default PosConfig;

addModelData(PosConfig, posConfigViews);
validateSchemaDefAgainstMongoose(PosConfigSchema, PosConfigSchemaDef, "PosConfig", [
    "managerPins",
    "pausedAt",
    "pausedBy",
    "pauseReason",
    "isActive",
]);
