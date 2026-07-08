import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import ReturnRequest, {IReturnRequest} from "@eCommerceModule/database/schemas/returnRequest/returnRequest";

export class ReturnRequestService extends BaseCrudService<IReturnRequest, typeof ReturnRequest> {
    constructor() {
        super(ReturnRequest, "ReturnRequest");
    }
}

export const returnRequestService = new ReturnRequestService();
