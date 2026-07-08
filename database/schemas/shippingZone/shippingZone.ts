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
import {ShippingZoneSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/shippingZone/shippingZone.schema-def";
import {applyShippingZoneIndexes} from "./shippingZone.indexes";
import {shippingZoneViews} from "./shippingZone.views";

export interface IShippingZone extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    name: string;
    countries?: Schema.Types.ObjectId[];
    states?: Schema.Types.ObjectId[];
    postalCodePatterns?: string[];
    rates: {
        name: string;
        type: "flat" | "weight" | "price" | "quantity" | "free";
        price?: number;
        carrier?: string;
        estimatedDeliveryDays?: number;
        conditions?: {minWeight?: number; maxWeight?: number; minOrderAmount?: number; maxOrderAmount?: number};
    }[];
    isActive: boolean;
    company: ICompany;
}

const ShippingZoneSchema = new Schema<IShippingZone>(
    {
        name: {type: SchemaTypes.String, required: true, trim: true},
        countries: {type: [{type: SchemaTypes.ObjectId, ref: "Country", refAllowlist: CountrySimpleSnippet}], default: []},
        states: {type: [{type: SchemaTypes.ObjectId, ref: "State", refAllowlist: StateSimpleSnippet}], default: []},
        postalCodePatterns: {type: [SchemaTypes.String], default: []},
        rates: {
            type: [
                {
                    name: {type: SchemaTypes.String, required: true},
                    type: {type: SchemaTypes.String, enum: ["flat", "weight", "price", "quantity", "free"], required: true},
                    price: {type: SchemaTypes.Number, min: 0},
                    carrier: {type: SchemaTypes.String},
                    estimatedDeliveryDays: {type: SchemaTypes.Number, min: 0},
                    conditions: {
                        type: {
                            minWeight: SchemaTypes.Number,
                            maxWeight: SchemaTypes.Number,
                            minOrderAmount: SchemaTypes.Number,
                            maxOrderAmount: SchemaTypes.Number,
                        },
                        _id: false,
                    },
                    _id: false,
                },
            ],
            default: [],
        },
        isActive: {type: SchemaTypes.Boolean, default: true},
    },
    {accessMode: "loose"},
);

ownershipPlugin(ShippingZoneSchema);
auditPlugin(ShippingZoneSchema);
softDeletePlugin(ShippingZoneSchema);
applyShippingZoneIndexes(ShippingZoneSchema);
const ShippingZone = model<IShippingZone>("ShippingZone", ShippingZoneSchema);
normalizeSchemaPermissions(ShippingZone);
export default ShippingZone;

addModelData(ShippingZone, shippingZoneViews);
validateSchemaDefAgainstMongoose(ShippingZoneSchema, ShippingZoneSchemaDef, "ShippingZone");
