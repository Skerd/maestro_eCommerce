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
import {CustomerAddressSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerAddress/customerAddress.schema-def";
import {applyCustomerAddressIndexes} from "./customerAddress.indexes";
import {customerAddressViews} from "./customerAddress.views";

export interface ICustomerAddress extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    user: IUser;
    firstName: string;
    lastName: string;
    phone?: string;
    street: string;
    city: string;
    state?: string;
    postalCode?: string;
    country: Schema.Types.ObjectId;
    isDefault: boolean;
    label?: string;
    company: ICompany;
}

const CustomerAddressSchema = new Schema<ICustomerAddress>(
    {
        user: {type: SchemaTypes.ObjectId, ref: "User", required: true},
        firstName: {type: SchemaTypes.String, required: true, trim: true},
        lastName: {type: SchemaTypes.String, required: true, trim: true},
        phone: {type: SchemaTypes.String, trim: true},
        street: {type: SchemaTypes.String, required: true, trim: true},
        city: {type: SchemaTypes.String, required: true, trim: true},
        state: {type: SchemaTypes.String, trim: true},
        postalCode: {type: SchemaTypes.String, trim: true},
        country: {type: SchemaTypes.ObjectId, ref: "Country", required: true},
        isDefault: {type: SchemaTypes.Boolean, default: false},
        label: {type: SchemaTypes.String, trim: true},
    },
    {accessMode: "loose"},
);

ownershipPlugin(CustomerAddressSchema);
auditPlugin(CustomerAddressSchema);
softDeletePlugin(CustomerAddressSchema);
applyCustomerAddressIndexes(CustomerAddressSchema);
const CustomerAddress = model<ICustomerAddress>("CustomerAddress", CustomerAddressSchema);
normalizeSchemaPermissions(CustomerAddress);
export default CustomerAddress;

addModelData(CustomerAddress, customerAddressViews);
validateSchemaDefAgainstMongoose(CustomerAddressSchema, CustomerAddressSchemaDef, "CustomerAddress", ["user"]);
