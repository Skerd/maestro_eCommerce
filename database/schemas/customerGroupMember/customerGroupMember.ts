import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {IUser} from "@coreModule/database/schemas/user/user";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {CustomerGroupMemberSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroupMember/customerGroupMember.schema-def";
import {applyCustomerGroupMemberIndexes} from "./customerGroupMember.indexes";

export interface ICustomerGroupMember extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    user: IUser;
    customerGroup: Schema.Types.ObjectId;
    company: ICompany;
}

const CustomerGroupMemberSchema = new Schema<ICustomerGroupMember>(
    {
        user: {type: SchemaTypes.ObjectId, ref: "User", required: true},
        customerGroup: {type: SchemaTypes.ObjectId, ref: "CustomerGroup", required: true},
    },
    {accessMode: "loose"},
);

ownershipPlugin(CustomerGroupMemberSchema);
auditPlugin(CustomerGroupMemberSchema);
softDeletePlugin(CustomerGroupMemberSchema);
applyCustomerGroupMemberIndexes(CustomerGroupMemberSchema);
const CustomerGroupMember = model<ICustomerGroupMember>("CustomerGroupMember", CustomerGroupMemberSchema);
normalizeSchemaPermissions(CustomerGroupMember);

validateSchemaDefAgainstMongoose(CustomerGroupMemberSchema, CustomerGroupMemberSchemaDef, "CustomerGroupMember");

export default CustomerGroupMember;
