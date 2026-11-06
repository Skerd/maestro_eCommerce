import type {FilterQuery} from "mongoose";
import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import FiscalConfig, {IFiscalConfig} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig";

export class FiscalConfigService extends BaseCrudService<IFiscalConfig, typeof FiscalConfig> {
    constructor() {
        super(FiscalConfig, "FiscalConfig");
    }

    /** The most recently updated live config matching `filter`, with its certificate password (hidden by default). */
    findLatestWithPassword(filter: FilterQuery<IFiscalConfig>) {
        return FiscalConfig.findOne(filter).noDeleted()
            .select("+certificatePassword")
            .sort({updatedAt: -1});
    }
}

export const fiscalConfigService = new FiscalConfigService();
