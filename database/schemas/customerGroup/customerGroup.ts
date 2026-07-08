import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import {IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {applyCustomerGroupIndexes} from "./customerGroup.indexes";
import {customerGroupViews} from "./customerGroup.views";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {CustomerGroupSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/customerGroup/customerGroup.schema-def";

export interface ICustomerGroup extends Document, IOwnershipPluginFields, ISoftDeletePluginFields {
    name: string;
    description?: string;
    memberCount: number;
    isDefault: boolean;
    company: ICompany;
}

const CustomerGroupSchema = new Schema<ICustomerGroup>(
    {
        name: {type: SchemaTypes.String, required: true, trim: true},
        description: {type: SchemaTypes.String, trim: true},
        memberCount: {type: SchemaTypes.Number, default: 0, min: 0},
        isDefault: {type: SchemaTypes.Boolean, default: false},
    },
    {accessMode: "loose"},
);

ownershipPlugin(CustomerGroupSchema);
auditPlugin(CustomerGroupSchema);
softDeletePlugin(CustomerGroupSchema);
applyCustomerGroupIndexes(CustomerGroupSchema);
const CustomerGroup = model<ICustomerGroup>("CustomerGroup", CustomerGroupSchema);
normalizeSchemaPermissions(CustomerGroup);
export default CustomerGroup;

addModelData(CustomerGroup, customerGroupViews);
// excludePaths: memberCount (system-managed counter, not user-settable)
validateSchemaDefAgainstMongoose(CustomerGroupSchema, CustomerGroupSchemaDef, "CustomerGroup", ["memberCount"]);
