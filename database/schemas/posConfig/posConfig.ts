import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {ICurrency} from "@coreModule/database/schemas/currency/currency";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {PosConfigSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/posConfig/posConfig.schema-def";
import {CurrencySimpleSnippet} from "@coreModule/database/schemas/currency/currency.snippets";
import {WarehouseSimpleSnippet} from "@eCommerceModule/database/schemas/warehouse/warehouse.snippets";
import {PosPaymentMethodSimpleSnippet} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod.snippets";
import {IWarehouse} from "@eCommerceModule/database/schemas/warehouse/warehouse";
import {IPosPaymentMethod} from "@eCommerceModule/database/schemas/posPaymentMethod/posPaymentMethod";
import {applyPosConfigIndexes} from "./posConfig.indexes";
import {posConfigViews} from "./posConfig.views";

export interface IPosConfig extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    name: string;
    paymentMethods?: IPosPaymentMethod[];
    warehouse: IWarehouse;
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
    /** bcrypt hash — never expose in DTOs. */
    managerPinHash?: string;
    isActive: boolean;
    company: ICompany;
}

const PosConfigSchema = new Schema<IPosConfig>(
    {
        name: {type: SchemaTypes.String, required: true, trim: true},
        paymentMethods: {
            type: [{type: SchemaTypes.ObjectId, ref: "PosPaymentMethod", refAllowlist: PosPaymentMethodSimpleSnippet}],
            default: [],
        },
        warehouse: {type: SchemaTypes.ObjectId, ref: "Warehouse", required: true, refAllowlist: WarehouseSimpleSnippet},
        currency: {type: SchemaTypes.ObjectId, ref: "Currency", refAllowlist: CurrencySimpleSnippet},
        receiptHeader: {type: SchemaTypes.String},
        receiptFooter: {type: SchemaTypes.String},
        ifaceBarcodeScanner: {type: SchemaTypes.Boolean, default: true},
        ifaceCashControl: {type: SchemaTypes.Boolean, default: true},
        allowDiscount: {type: SchemaTypes.Boolean, default: true},
        allowQuantityChange: {type: SchemaTypes.Boolean, default: true},
        allowOversell: {type: SchemaTypes.Boolean, default: false},
        pinForDiscount: {type: SchemaTypes.Boolean, default: false},
        pinForCashOut: {type: SchemaTypes.Boolean, default: false},
        pinForRefund: {type: SchemaTypes.Boolean, default: false},
        /** Write-only form field — stripped before persist; use managerPinHash. */
        managerPin: {type: SchemaTypes.String, select: false},
        /** Write-only form field — clears managerPinHash when true. */
        clearManagerPin: {type: SchemaTypes.Boolean, select: false},
        managerPinHash: {type: SchemaTypes.String},
        isActive: {type: SchemaTypes.Boolean, default: true},
    },
    {accessMode: "loose"},
);

ownershipPlugin(PosConfigSchema);
auditPlugin(PosConfigSchema);
softDeletePlugin(PosConfigSchema);
applyPosConfigIndexes(PosConfigSchema);
const PosConfig = model<IPosConfig>("PosConfig", PosConfigSchema);
normalizeSchemaPermissions(PosConfig);
export default PosConfig;

addModelData(PosConfig, posConfigViews);
validateSchemaDefAgainstMongoose(PosConfigSchema, PosConfigSchemaDef, "PosConfig", ["managerPinHash"]);
