import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import OdooConnection, {IOdooConnection} from "./odooConnection";

export class OdooConnectionService extends BaseCrudService<IOdooConnection, typeof OdooConnection> {
    constructor() {
        super(OdooConnection, "OdooConnection");
    }
}

export const odooConnectionService = new OdooConnectionService();
