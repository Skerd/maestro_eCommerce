import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {IUser} from "@coreModule/database/schemas/user/user";
import ownershipPlugin from "@coreModule/database/plugins/ownershipPlugin";
import auditPlugin from "@coreModule/database/plugins/auditPlugin";
import softDeletePlugin from "@coreModule/database/plugins/softDeletePlugin";
import lifeCyclePlugin from "@coreModule/database/plugins/lifeCyclePlugin";
import {ILifeCyclePluginFields, IOwnershipPluginFields, ISoftDeletePluginFields} from "@coreModule/database/types/plugin-fields";
import {validateSchemaDefAgainstMongoose} from "@coreModule/database/utilities/validateSchemaDefAgainstMongoose";
import {
    POS_PAUSE_REASON_MAX,
    PosCompanyPosLockSchemaDef,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/posCompanyPosLock/posCompanyPosLock.schema-def";

/**
 * One document per company. Active company-wide POS kill-switch when `pausedAt` is set.
 * Not exposed via CRUD — managed by PosConfig pauseAll / resumeAll actions.
 */
export interface IPosCompanyPosLock extends Document, IOwnershipPluginFields, ISoftDeletePluginFields, ILifeCyclePluginFields {
    company: ICompany;
    pausedAt?: Date | null;
    pausedBy?: IUser | null;
    pauseReason?: string | null;
}

const PosCompanyPosLockSchema = new Schema<IPosCompanyPosLock>(
    {
        pausedAt: {
            type: SchemaTypes.Date,
            default: null,
        },
        pausedBy: {
            type: SchemaTypes.ObjectId,
            ref: "User",
            default: null,
        },
        pauseReason: {
            type: SchemaTypes.String,
            trim: true,
            maxlength: POS_PAUSE_REASON_MAX,
            default: null,
        },
    },
    {accessMode: "loose"},
);

// A company's own row: `company` comes from the ownership plugin and stays unique.
ownershipPlugin(PosCompanyPosLockSchema);
auditPlugin(PosCompanyPosLockSchema);
softDeletePlugin(PosCompanyPosLockSchema);
lifeCyclePlugin(PosCompanyPosLockSchema);
PosCompanyPosLockSchema.index({company: 1}, {unique: true});
validateSchemaDefAgainstMongoose(PosCompanyPosLockSchema, PosCompanyPosLockSchemaDef, "PosCompanyPosLock");

const PosCompanyPosLock = model<IPosCompanyPosLock>("PosCompanyPosLock", PosCompanyPosLockSchema);
export default PosCompanyPosLock;
