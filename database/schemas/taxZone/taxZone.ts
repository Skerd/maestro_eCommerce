import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {CountrySimpleSnippet} from "@coreModule/database/schemas/country/country.snippets";
import {StateSimpleSnippet} from "@coreModule/database/schemas/state/state.snippets";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {TaxZoneSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/taxZone/taxZone.schema-def";
import {applyTaxZoneIndexes} from "./taxZone.indexes";
import {taxZoneViews} from "./taxZone.views";

export interface ITaxZone extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    name: string;
    country: Schema.Types.ObjectId;
    states?: Schema.Types.ObjectId[];
    postalCodePatterns?: string[];
    rates: {name: string; rate: number; isCompound: boolean; appliesTo: "all" | "physical" | "digital"}[];
    priority: number;
    isActive: boolean;
    company: ICompany;
}

const TaxZoneSchema = new Schema<ITaxZone>(
    {
        name: {type: SchemaTypes.String, required: true, trim: true},
        country: {type: SchemaTypes.ObjectId, ref: "Country", required: true, refAllowlist: CountrySimpleSnippet},
        states: {type: [{type: SchemaTypes.ObjectId, ref: "State", refAllowlist: StateSimpleSnippet}], default: []},
        postalCodePatterns: {type: [SchemaTypes.String], default: []},
        rates: {
            type: [
                {
                    name: {type: SchemaTypes.String, required: true},
                    rate: {type: SchemaTypes.Number, required: true, min: 0, max: 100},
                    isCompound: {type: SchemaTypes.Boolean, default: false},
                    appliesTo: {type: SchemaTypes.String, enum: ["all", "physical", "digital"], default: "all"},
                    _id: false,
                },
            ],
            default: [],
        },
        priority: {type: SchemaTypes.Number, default: 0},
        isActive: {type: SchemaTypes.Boolean, default: true},
    },
    {accessMode: "loose"},
);

ownershipPlugin(TaxZoneSchema);
auditPlugin(TaxZoneSchema);
softDeletePlugin(TaxZoneSchema);
applyTaxZoneIndexes(TaxZoneSchema);
const TaxZone = model<ITaxZone>("TaxZone", TaxZoneSchema);
normalizeSchemaPermissions(TaxZone);
export default TaxZone;

addModelData(TaxZone, taxZoneViews);
validateSchemaDefAgainstMongoose(TaxZoneSchema, TaxZoneSchemaDef, "TaxZone");
