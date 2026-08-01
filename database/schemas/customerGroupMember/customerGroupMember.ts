import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {IUser} from "@coreModule/database/schemas/user/user";
import {SimpleUserSnippet} from "@coreModule/database/schemas/user/user.snippets";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {
    ILifeCyclePluginFields,
    IOwnershipPluginFields,
    ISoftDeletePluginFields,
} from "@coreModule/database/types/plugin-fields";
import type {ICustomerGroup} from "@eCommerceModule/database/schemas/customerGroup/customerGroup";
import {CustomerGroupSimpleSnippet} from "@eCommerceModule/database/schemas/customerGroup/customerGroup.snippets";
import {applyCustomerGroupMemberIndexes} from "./customerGroupMember.indexes";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";

export interface ICustomerGroupMember extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    user: IUser;
    customerGroup: ICustomerGroup;
    company: ICompany;
}

const CustomerGroupMemberSchema = new Schema<ICustomerGroupMember>(
    {
        user: {
            type: SchemaTypes.ObjectId, 
            ref: "User", 
            required: true, 
            refAllowlist: SimpleUserSnippet
        },
        customerGroup: {
            type: SchemaTypes.ObjectId,
            ref: "CustomerGroup",
            required: true,
            refAllowlist: CustomerGroupSimpleSnippet,
        },
    },
    {accessMode: "loose"},
);

ownershipPlugin(CustomerGroupMemberSchema);
auditPlugin(CustomerGroupMemberSchema);
softDeletePlugin(CustomerGroupMemberSchema);
applyCustomerGroupMemberIndexes(CustomerGroupMemberSchema);
lifeCyclePlugin(CustomerGroupMemberSchema);
const CustomerGroupMember = model<ICustomerGroupMember>("CustomerGroupMember", CustomerGroupMemberSchema);
export default CustomerGroupMember;
