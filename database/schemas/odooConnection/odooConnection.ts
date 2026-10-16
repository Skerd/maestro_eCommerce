import {Document, model, Schema, SchemaTypes} from "mongoose";
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
import {applyOdooConnectionIndexes} from "./odooConnection.indexes";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {
    ODOO_API_KEY_MAX,
    ODOO_DATABASE_MAX,
    ODOO_URL_MAX,
    ODOO_USERNAME_MAX,
    OdooConnectionSchemaDef,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/odooConnection/odooConnection.schema-def";

export interface IOdooConnection extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    url: string;
    database: string;
    username: string;
    apiKeyEncrypted?: string;
}

const OdooConnectionSchema = new Schema<IOdooConnection>(
    {
        url: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: ODOO_URL_MAX,
        },
        database: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: ODOO_DATABASE_MAX,
        },
        username: {
            type: SchemaTypes.String,
            required: true,
            trim: true,
            maxlength: ODOO_USERNAME_MAX,
        },
        apiKeyEncrypted: {
            type: SchemaTypes.String,
            required: false,
            maxlength: ODOO_API_KEY_MAX,
            permissions: {
                self: {
                    read: "no-permission",
                },
                others: {
                    read: "no-permission",
                },
            },
        },
    },
    {
        accessMode: "loose",
        collection: "odooconnections",
    },
);

ownershipPlugin(OdooConnectionSchema);
auditPlugin(OdooConnectionSchema);
softDeletePlugin(OdooConnectionSchema);
applyOdooConnectionIndexes(OdooConnectionSchema);
lifeCyclePlugin(OdooConnectionSchema);
const OdooConnection = model<IOdooConnection>("OdooConnection", OdooConnectionSchema);
normalizeSchemaPermissions(OdooConnection);
export default OdooConnection;

addModelData(OdooConnection);
validateSchemaDefAgainstMongoose(OdooConnectionSchema, OdooConnectionSchemaDef, "OdooConnection");
