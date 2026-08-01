import {Document, model, Schema, SchemaTypes} from "mongoose";
import {ICompany} from "@coreModule/database/schemas/company/company";
import {IUser} from "@coreModule/database/schemas/user/user";

/**
 * One document per company. Active company-wide POS kill-switch when `pausedAt` is set.
 * Not exposed via CRUD — managed by PosConfig pauseAll / resumeAll actions.
 */
export interface IPosCompanyPosLock extends Document {
    company: ICompany;
    pausedAt?: Date | null;
    pausedBy?: IUser | null;
    pauseReason?: string | null;
}

const PosCompanyPosLockSchema = new Schema<IPosCompanyPosLock>(
    {
        company: {
            type: SchemaTypes.ObjectId,
            ref: "Company",
            required: true,
            unique: true,
        },
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
            maxlength: 500,
            default: null,
        },
    },
    {accessMode: "loose"},
);

const PosCompanyPosLock = model<IPosCompanyPosLock>("PosCompanyPosLock", PosCompanyPosLockSchema);
export default PosCompanyPosLock;
