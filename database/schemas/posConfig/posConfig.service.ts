import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import PosConfig, {IPosConfig} from "@eCommerceModule/database/schemas/posConfig/posConfig";

export class PosConfigService extends BaseCrudService<IPosConfig, typeof PosConfig> {
    constructor() {
        super(PosConfig, "PosConfig");
    }
}

export const posConfigService = new PosConfigService();
