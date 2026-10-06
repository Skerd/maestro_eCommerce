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
import type {IMedia} from "@coreModule/database/schemas/media/media";
import {MediaSimpleSnippet} from "@coreModule/database/schemas/media/media.snippets";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {COLUMN_TYPE} from "armonia/src/modules/core/database/filter/typeOperators";
import {
    FISCAL_CONFIG_CERTIFICATE_PASSWORD_MAX,
    FISCAL_CONFIG_CIS_CODE_MAX,
    FISCAL_CONFIG_NAME_MAX,
    FISCAL_CONFIG_NIPT_MAX,
    FISCAL_CONFIG_SELLER_ADDRESS_MAX,
    FISCAL_CONFIG_SELLER_COUNTRY_MAX,
    FISCAL_CONFIG_SELLER_NAME_MAX,
    FISCAL_CONFIG_SELLER_TOWN_MAX,
    FISCAL_CONFIG_TCR_INT_ID_MAX,
    FISCAL_CONFIG_URL_MAX,
    FiscalConfigSchemaDef,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/fiscalConfig/fiscalConfig.schema-def";
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
    environment: "test" | "production";
    certificate: IMedia[];
    certificatePassword?: string;
    isActive: boolean;
    company: ICompany;
}

const FiscalConfigSchema = new Schema<IFiscalConfig>(
    {
        name: {
            type: SchemaTypes.String, 
            required: true, 
            trim: true,
            maxlength: FISCAL_CONFIG_NAME_MAX,
        },
        nipt: {
            type: SchemaTypes.String, 
            trim: true,
            maxlength: FISCAL_CONFIG_NIPT_MAX,
        },
        softCode: {
            type: SchemaTypes.String, 
            required: true, 
            trim: true,
            maxlength: FISCAL_CONFIG_CIS_CODE_MAX,
        },
        maintainerCode: {
            type: SchemaTypes.String, 
            trim: true,
            maxlength: FISCAL_CONFIG_CIS_CODE_MAX,
        },
        businessUnitCode: {
            type: SchemaTypes.String, 
            required: true, 
            trim: true,
            maxlength: FISCAL_CONFIG_CIS_CODE_MAX,
        },
        operatorCode: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: FISCAL_CONFIG_CIS_CODE_MAX,
        },
        tcrCode: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: FISCAL_CONFIG_CIS_CODE_MAX,
        },
        tcrIntId: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: FISCAL_CONFIG_TCR_INT_ID_MAX,
        },
        tcrType: {
            type: SchemaTypes.String,
            enum: ["REGULAR", "VENDING"],
            default: "REGULAR"
        },
        fiscalizationUrl: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: FISCAL_CONFIG_URL_MAX,
        },
        einvoiceUrl: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: FISCAL_CONFIG_URL_MAX,
        },
        selfcareUrl: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: FISCAL_CONFIG_URL_MAX,
        },
        proxyUrl: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: FISCAL_CONFIG_URL_MAX,
        },
        sellerName: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: FISCAL_CONFIG_SELLER_NAME_MAX,
        },
        sellerAddress: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: FISCAL_CONFIG_SELLER_ADDRESS_MAX,
        },
        sellerTown: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: FISCAL_CONFIG_SELLER_TOWN_MAX,
        },
        sellerCountry: {
            type: SchemaTypes.String,
            trim: true,
            default: "ALB",
            maxlength: FISCAL_CONFIG_SELLER_COUNTRY_MAX,
        },
        isVatRegistered: {
            type: SchemaTypes.Boolean,
            default: true
        },
        environment: {
            type: SchemaTypes.String,
            enum: ["test", "production"],
            default: "test"
        },
        certificate: {
            type: [{type: SchemaTypes.ObjectId, ref: "Media"}],
            default: [],
            refAllowlist: MediaSimpleSnippet,
            dynamicTableConfiguration: {hideColumn: true},
        },
        certificatePassword: {
            type: SchemaTypes.String,
            select: false,
            maxlength: FISCAL_CONFIG_CERTIFICATE_PASSWORD_MAX,
            /** DTO maps presence to boolean — never expose the plaintext in the table. */
            dynamicTableConfiguration: {
                cellType: COLUMN_TYPE.BOOLEAN,
                filterable: false,
                sortable: false,
            },
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
validateSchemaDefAgainstMongoose(FiscalConfigSchema, FiscalConfigSchemaDef, "FiscalConfig");
