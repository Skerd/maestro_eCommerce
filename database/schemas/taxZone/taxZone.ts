import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {ICountry} from "@coreModule/database/schemas/country/country";
import {IState} from "@coreModule/database/schemas/state/state";
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
import {CountrySimpleSnippet} from "@coreModule/database/schemas/country/country.snippets";
import {StateSimpleSnippet} from "@coreModule/database/schemas/state/state.snippets";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {
    TAX_ZONE_NAME_MAX,
    TAX_ZONE_POSTAL_CODE_PATTERN_MAX,
    TAX_ZONE_POSTAL_CODE_PATTERNS_MAX_ITEMS,
    TAX_ZONE_RATE_NAME_MAX,
    TaxZoneSchemaDef,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/taxZone/taxZone.schema-def";
import {applyTaxZoneIndexes} from "./taxZone.indexes";
import {taxZoneViews} from "./taxZone.views";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";

export interface ITaxZone extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    name: string;
    country: ICountry;
    states?: IState[];
    postalCodePatterns?: string[];
    rates: {
        name: string; 
        rate: number; 
        isCompound: boolean; 
        appliesTo: "all" | "physical" | "digital"
    }[];
    priority: number;
    isActive: boolean;
}

const TaxZoneSchema = new Schema<ITaxZone>(
    {
        name: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: TAX_ZONE_NAME_MAX,
        },
        country: {
            type: SchemaTypes.ObjectId, 
            ref: "Country", 
            required: true, 
            refAllowlist: CountrySimpleSnippet
        },
        states: {
            type: [{
                type: SchemaTypes.ObjectId, 
                ref: "State", 
                refAllowlist: StateSimpleSnippet
            }], 
            default: []
        },
        postalCodePatterns: {
            type: [{
                type: SchemaTypes.String,
                trim: true,
                maxlength: TAX_ZONE_POSTAL_CODE_PATTERN_MAX,
            }],
            default: [],
            validate: {
                validator(value: string[]) {
                    return !value || value.length <= TAX_ZONE_POSTAL_CODE_PATTERNS_MAX_ITEMS;
                },
                message: `Cannot have more than ${TAX_ZONE_POSTAL_CODE_PATTERNS_MAX_ITEMS} postal code patterns`,
            },
        },
        rates: {
            type: [
                {
                    name: {
                        type: SchemaTypes.String,
                        required: true,
                        trim: true,
                        maxlength: TAX_ZONE_RATE_NAME_MAX,
                    },
                    rate: {
                        type: SchemaTypes.Number, 
                        required: true, 
                        min: 0, 
                        max: 100
                    },
                    isCompound: {
                        type: SchemaTypes.Boolean, 
                        default: false
                    },
                    appliesTo: {
                        type: SchemaTypes.String, 
                        enum: ["all", "physical", "digital"], 
                        default: "all"
                    },
                    _id: false,
                },
            ],
            default: [],
        },
        priority: {
            type: SchemaTypes.Number, 
            default: 0
        },
        isActive: {
            type: SchemaTypes.Boolean, 
            default: true
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(TaxZoneSchema);
auditPlugin(TaxZoneSchema);
softDeletePlugin(TaxZoneSchema);
applyTaxZoneIndexes(TaxZoneSchema);
lifeCyclePlugin(TaxZoneSchema);
const TaxZone = model<ITaxZone>("TaxZone", TaxZoneSchema);
normalizeSchemaPermissions(TaxZone);
export default TaxZone;

addModelData(TaxZone, taxZoneViews);
validateSchemaDefAgainstMongoose(TaxZoneSchema, TaxZoneSchemaDef, "TaxZone");
