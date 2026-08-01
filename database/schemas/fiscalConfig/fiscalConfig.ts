import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {
    ILifeCyclePluginFields,
    IOwnershipPluginFields,
    ISoftDeletePluginFields,
} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {FiscalConfigSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/fiscalConfig/fiscalConfig.schema-def";
import {applyFiscalConfigIndexes} from "./fiscalConfig.indexes";
import {fiscalConfigViews} from "./fiscalConfig.views";

export interface IFiscalConfig extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    name: string;
    nipt?: string;
    softCode: string;
    maintainerCode?: string;
    businessUnitCode: string;
    operatorCode: string;
    tcrCode?: string;
    tcrIntId?: string;
    tcrType?: "REGULAR" | "VENDING";
    fiscalizationUrl: string;
    einvoiceUrl: string;
    selfcareUrl: string;
    proxyUrl?: string;
    sellerName?: string;
    sellerAddress?: string;
    sellerTown?: string;
    sellerCountry?: string;
    isVatRegistered: boolean;
    autoFiscalizePos: boolean;
    autoEinvoice: boolean;
    environment: "test" | "production";
    certificateBase64?: string;
    certificatePassword?: string;
    hasCertificate: boolean;
    clearCertificate?: boolean;
    isActive: boolean;
    company: ICompany;
}

const FiscalConfigSchema = new Schema<IFiscalConfig>(
    {
        name: {
            type: SchemaTypes.String, 
            required: true, 
            trim: true
        },
        nipt: {
            type: SchemaTypes.String, 
            trim: true
        },
        softCode: {
            type: SchemaTypes.String, 
            required: true, 
            trim: true
        },
        maintainerCode: {
            type: SchemaTypes.String, 
            trim: true
        },
        businessUnitCode: {
            type: SchemaTypes.String, 
            required: true, 
            trim: true
        },
        operatorCode: {
            type: SchemaTypes.String,
            required: true,
            trim: true
        },
        tcrCode: {
            type: SchemaTypes.String,
            trim: true
        },
        tcrIntId: {
            type: SchemaTypes.String,
            trim: true
        },
        tcrType: {
            type: SchemaTypes.String,
            enum: ["REGULAR", "VENDING"],
            default: "REGULAR"
        },
        fiscalizationUrl: {
            type: SchemaTypes.String,
            required: true,
            trim: true
        },
        einvoiceUrl: {
            type: SchemaTypes.String,
            required: true,
            trim: true
        },
        selfcareUrl: {
            type: SchemaTypes.String,
            required: true,
            trim: true
        },
        proxyUrl: {
            type: SchemaTypes.String,
            trim: true
        },
        sellerName: {
            type: SchemaTypes.String,
            trim: true
        },
        sellerAddress: {
            type: SchemaTypes.String,
            trim: true
        },
        sellerTown: {
            type: SchemaTypes.String,
            trim: true
        },
        sellerCountry: {
            type: SchemaTypes.String,
            trim: true,
            default: "ALB"
        },
        isVatRegistered: {
            type: SchemaTypes.Boolean,
            default: true
        },
        autoFiscalizePos: {
            type: SchemaTypes.Boolean,
            default: false
        },
        autoEinvoice: {
            type: SchemaTypes.Boolean,
            default: false
        },
        environment: {
            type: SchemaTypes.String,
            enum: ["test", "production"],
            default: "test"
        },
        certificateBase64: {
            type: SchemaTypes.String,
            select: false
        },
        certificatePassword: {
            type: SchemaTypes.String,
            select: false
        },
        hasCertificate: {
            type: SchemaTypes.Boolean,
            default: false
        },
        clearCertificate: {
            type: SchemaTypes.Boolean,
            select: false
        },
        isActive: {
            type: SchemaTypes.Boolean,
            default: true
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(FiscalConfigSchema);
auditPlugin(FiscalConfigSchema);
softDeletePlugin(FiscalConfigSchema);
applyFiscalConfigIndexes(FiscalConfigSchema);
lifeCyclePlugin(FiscalConfigSchema);
const FiscalConfig = model<IFiscalConfig>("FiscalConfig", FiscalConfigSchema);
normalizeSchemaPermissions(FiscalConfig);
export default FiscalConfig;

addModelData(FiscalConfig, fiscalConfigViews);
// hasCertificate is server-managed (set when cert is uploaded); not a form SchemaDef field.
validateSchemaDefAgainstMongoose(FiscalConfigSchema, FiscalConfigSchemaDef, "FiscalConfig", ["hasCertificate"]);
