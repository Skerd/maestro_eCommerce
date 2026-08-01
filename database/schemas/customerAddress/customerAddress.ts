import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {IUser} from "@coreModule/database/schemas/user/user";
import {ICountry} from "@coreModule/database/schemas/country/country";
import {IState} from "@coreModule/database/schemas/state/state";
import {ICity} from "@coreModule/database/schemas/city/city";
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
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {CustomerAddressSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/customerAddress.schema-def";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import {CountrySimpleSnippet} from "@coreModule/database/schemas/country/country.snippets";
import {StateSimpleSnippet} from "@coreModule/database/schemas/state/state.snippets";
import {CitySimpleSnippet} from "@coreModule/database/schemas/city/city.snippets";
import {applyCustomerAddressIndexes} from "./customerAddress.indexes";
import {customerAddressViews} from "./customerAddress.views";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";

export interface ICustomerAddress extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    customer: IUser;
    firstName: string;
    lastName: string;
    phone?: string;
    street: string;
    city: ICity;
    state?: IState;
    postalCode?: string;
    country: ICountry;
    latitude: number;
    longitude: number;
    isDefault: boolean;
    label?: string;
    company: ICompany;
}

const CustomerAddressSchema = new Schema<ICustomerAddress>(
    {
        customer: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            required: true,
            refAllowlist: SimpleUserSnippet,
        },
        firstName: {
            type: SchemaTypes.String, 
            required: true, 
            trim: true
        },
        lastName: {
            type: SchemaTypes.String, 
            required: true, 
            trim: true
        },
        phone: {
            type: SchemaTypes.String, 
            trim: true
        },
        street: {
            type: SchemaTypes.String, 
            required: true, 
            trim: true
        },
        city: {
            type: SchemaTypes.ObjectId, 
            ref: "City", 
            required: true, 
            refAllowlist: CitySimpleSnippet
        },
        state: {
            type: SchemaTypes.ObjectId, 
            ref: "State", 
            refAllowlist: StateSimpleSnippet
        },
        postalCode: {
            type: SchemaTypes.String, 
            trim: true
        },
        country: {
            type: SchemaTypes.ObjectId, 
            ref: "Country", 
            required: true, 
            refAllowlist: CountrySimpleSnippet
        },
        latitude: {
            type: SchemaTypes.Number, 
            required: true
        },
        longitude: {
            type: SchemaTypes.Number, 
            required: true
        },
        isDefault: {
            type: SchemaTypes.Boolean, 
            default: false
        },
        label: {
            type: SchemaTypes.String, 
            trim: true
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(CustomerAddressSchema);
auditPlugin(CustomerAddressSchema);
softDeletePlugin(CustomerAddressSchema);
lifeCyclePlugin(CustomerAddressSchema);
applyCustomerAddressIndexes(CustomerAddressSchema);
const CustomerAddress = model<ICustomerAddress>("CustomerAddress", CustomerAddressSchema);
normalizeSchemaPermissions(CustomerAddress);
export default CustomerAddress;

addModelData(CustomerAddress, customerAddressViews);
validateSchemaDefAgainstMongoose(CustomerAddressSchema, CustomerAddressSchemaDef, "CustomerAddress");
