import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import OdooLink, {IOdooLink} from "./odooLink";

export class OdooLinkService extends BaseCrudService<IOdooLink, typeof OdooLink> {
    constructor() {
        super(OdooLink, "OdooLink");
    }
}

export const odooLinkService = new OdooLinkService();
