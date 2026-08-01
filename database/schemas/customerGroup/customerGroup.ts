import {ObjectId} from "mongodb";
import {ClientSession, Document, model, Model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
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
import {applyCustomerGroupIndexes} from "./customerGroup.indexes";
import {customerGroupViews} from "./customerGroup.views";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {CustomerGroupSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroup/customerGroup.schema-def";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";

export interface ICustomerGroup extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    name: string;
    description?: string;
    memberCount: number;
    isDefault: boolean;
    company: ICompany;
}

export interface ICustomerGroupModel extends Model<ICustomerGroup> {
    syncMemberCount(customerGroupId: ObjectId, companyId: ObjectId, session?: ClientSession | null): Promise<void>;
}

const CustomerGroupSchema = new Schema<ICustomerGroup, ICustomerGroupModel>(
    {
        name: {
            type: SchemaTypes.String,
            required: true,
            trim: true
        },
        description: {
            type: SchemaTypes.String,
            trim: true
        },
        memberCount: {
            type: SchemaTypes.Number,
            default: 0,
            min: 0,
            immutable: true
        },
        isDefault: {
            type: SchemaTypes.Boolean,
            default: false
        },
    },
    {accessMode: "loose"},
);

CustomerGroupSchema.statics.syncMemberCount = async function (
    customerGroupId: ObjectId,
    companyId: ObjectId,
    session?: ClientSession | null,
): Promise<void> {
    // Resolve by model name to avoid a circular import with CustomerGroupMember.
    const Member = model("CustomerGroupMember");
    const countQuery = Member.countDocuments({
        customerGroup: customerGroupId,
        company: companyId,
        deletedAt: null,
    });
    if (session) countQuery.session(session);
    const count = await countQuery;

    const opts: {session?: ClientSession} = {};
    if (session) opts.session = session;
    await this.collection.updateOne(
        {_id: customerGroupId, company: companyId},
        {$set: {memberCount: count}},
        opts,
    );
};

ownershipPlugin(CustomerGroupSchema);
auditPlugin(CustomerGroupSchema);
softDeletePlugin(CustomerGroupSchema);
applyCustomerGroupIndexes(CustomerGroupSchema);
lifeCyclePlugin(CustomerGroupSchema);
const CustomerGroup = model<ICustomerGroup, ICustomerGroupModel>("CustomerGroup", CustomerGroupSchema);
normalizeSchemaPermissions(CustomerGroup);
export default CustomerGroup;

addModelData(CustomerGroup, customerGroupViews);
validateSchemaDefAgainstMongoose(CustomerGroupSchema, CustomerGroupSchemaDef, "CustomerGroup");
