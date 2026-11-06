import type {ClientSession, Types} from "mongoose";
import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import PosCompanyPosLock, {type IPosCompanyPosLock} from "@eCommerceModule/database/schemas/posCompanyPosLock/posCompanyPosLock";

export class PosCompanyPosLockService extends BaseCrudService<IPosCompanyPosLock, typeof PosCompanyPosLock> {
    constructor() {
        super(PosCompanyPosLock, "PosCompanyPosLock");
    }

    /** The company's till kill switch, if it was ever set. */
    findForCompany(companyId: Types.ObjectId | string, session?: ClientSession | null) {
        return PosCompanyPosLock.findOne({company: companyId}).session(session ?? null);
    }

    /** Sets (or clears) the company's till kill switch, creating its row on first use. */
    setForCompany(
        companyId: Types.ObjectId | string,
        fields: {pausedAt: Date | null; pausedBy: Types.ObjectId | null; pauseReason: string | null},
        session?: ClientSession | null,
    ) {
        return PosCompanyPosLock.findOneAndUpdate(
            {company: companyId},
            {$set: {company: companyId, pausedAt: fields.pausedAt, pausedBy: fields.pausedBy, pauseReason: fields.pauseReason}},
            {upsert: true, new: true, session: session ?? undefined},
        );
    }
}

export const posCompanyPosLockService = new PosCompanyPosLockService();
