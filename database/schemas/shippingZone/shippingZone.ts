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
    SHIPPING_ZONE_CARRIER_MAX,
    SHIPPING_ZONE_NAME_MAX,
    SHIPPING_ZONE_POSTAL_CODE_PATTERN_MAX,
    SHIPPING_ZONE_POSTAL_CODE_PATTERNS_MAX_ITEMS,
    SHIPPING_ZONE_RATE_NAME_MAX,
    ShippingZoneSchemaDef,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/shippingZone/shippingZone.schema-def";
import {applyShippingZoneIndexes} from "./shippingZone.indexes";
import {shippingZoneViews} from "./shippingZone.views";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";

export interface IShippingZone extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    name: string;
    countries?: ICountry[];
    states?: IState[];
    postalCodePatterns?: string[];
    rates: {
        name: string;
        type: "flat" | "weight" | "price" | "quantity" | "free";
        price?: number;
        carrier?: string;
        estimatedDeliveryDays?: number;
        conditions?: {
            minWeight?: number;
            maxWeight?: number;
            minOrderAmount?: number;
            maxOrderAmount?: number;
        };
    }[];
    isActive: boolean;
}

const ShippingZoneSchema = new Schema<IShippingZone>(
    {
        name: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: SHIPPING_ZONE_NAME_MAX,
        },
        countries: {
            type: [{
                type: SchemaTypes.ObjectId,
                ref: "Country",
                refAllowlist: CountrySimpleSnippet
            }],
            default: []
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
                maxlength: SHIPPING_ZONE_POSTAL_CODE_PATTERN_MAX,
            }],
            default: [],
            validate: {
                validator(value: string[]) {
                    return !value || value.length <= SHIPPING_ZONE_POSTAL_CODE_PATTERNS_MAX_ITEMS;
                },
                message: `Cannot have more than ${SHIPPING_ZONE_POSTAL_CODE_PATTERNS_MAX_ITEMS} postal code patterns`,
            },
        },
        rates: {
            type: [
                {
                    name: {
                        type: SchemaTypes.String,
                        required: true,
                        trim: true,
                        maxlength: SHIPPING_ZONE_RATE_NAME_MAX,
                    },
                    type: {
                        type: SchemaTypes.String,
                        enum: ["flat", "weight", "price", "quantity", "free"],
                        required: true
                    },
                    price: {
                        type: SchemaTypes.Number,
                        min: 0
                    },
                    carrier: {
                        type: SchemaTypes.String,
                        trim: true,
                        maxlength: SHIPPING_ZONE_CARRIER_MAX,
                    },
                    estimatedDeliveryDays: {
                        type: SchemaTypes.Number,
                        min: 0
                    },
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
        } as any,
        isActive: {type: SchemaTypes.Boolean, default: true},
    },
    {accessMode: "loose"},
);

ownershipPlugin(ShippingZoneSchema);
auditPlugin(ShippingZoneSchema);
softDeletePlugin(ShippingZoneSchema);
applyShippingZoneIndexes(ShippingZoneSchema);
lifeCyclePlugin(ShippingZoneSchema);
const ShippingZone = model<IShippingZone>("ShippingZone", ShippingZoneSchema);
normalizeSchemaPermissions(ShippingZone);
export default ShippingZone;

addModelData(ShippingZone, shippingZoneViews);
validateSchemaDefAgainstMongoose(ShippingZoneSchema, ShippingZoneSchemaDef, "ShippingZone");
