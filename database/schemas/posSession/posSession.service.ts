import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import PosSession, {IPosSession} from "@eCommerceModule/database/schemas/posSession/posSession";

export class PosSessionService extends BaseCrudService<IPosSession, typeof PosSession> {
    constructor() {
        super(PosSession, "PosSession");
    }
}

export const posSessionService = new PosSessionService();
