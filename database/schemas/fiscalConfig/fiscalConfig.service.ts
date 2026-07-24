import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import FiscalConfig, {IFiscalConfig} from "@eCommerceModule/database/schemas/fiscalConfig/fiscalConfig";

export class FiscalConfigService extends BaseCrudService<IFiscalConfig, typeof FiscalConfig> {
    constructor() {
        super(FiscalConfig, "FiscalConfig");
    }
}

export const fiscalConfigService = new FiscalConfigService();
