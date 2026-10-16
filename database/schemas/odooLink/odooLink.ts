import {Document, model, Schema, SchemaTypes, Types} from "mongoose";
import {normalizeSchemaPermissions} from "@coreModule/database/utilities";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {
    ILifeCyclePluginFields,
    IOwnershipPluginFields,
    ISoftDeletePluginFields,
} from "@coreModule/database/types/plugin-fields";
import {addModelData} from "@coreModule/database/collections";
import {applyOdooLinkIndexes} from "./odooLink.indexes";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {
    LOCAL_MODEL_MAX,
    ODOO_MODEL_MAX,
    OdooLinkSchemaDef,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/odooLink/odooLink.schema-def";

export interface IOdooLink extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    odooModel: string;
    odooId: number;
    localModel: string;
    localId: Types.ObjectId;
}

const OdooLinkSchema = new Schema<IOdooLink>(
    {
        odooModel: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: ODOO_MODEL_MAX,
        },
        odooId: {
            type: SchemaTypes.Number,
            required: true,
            min: 1,
        },
        localModel: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: LOCAL_MODEL_MAX,
        },
        localId: {
            type: SchemaTypes.ObjectId,
            required: true,
        },
    },
    {
        accessMode: "loose",
        collection: "odoolinks",
    },
);

ownershipPlugin(OdooLinkSchema);
auditPlugin(OdooLinkSchema);
softDeletePlugin(OdooLinkSchema);
applyOdooLinkIndexes(OdooLinkSchema);
lifeCyclePlugin(OdooLinkSchema);
const OdooLink = model<IOdooLink>("OdooLink", OdooLinkSchema);
normalizeSchemaPermissions(OdooLink);
export default OdooLink;

addModelData(OdooLink);
validateSchemaDefAgainstMongoose(OdooLinkSchema, OdooLinkSchemaDef, "OdooLink");
