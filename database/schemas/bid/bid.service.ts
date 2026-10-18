import Bid, {IBid} from "@eCommerceModule/database/schemas/bid/bid";
import {BaseCrudService} from "@coreModule/database/services/baseCrudService";

export class BidService extends BaseCrudService<IBid, typeof Bid> {
    constructor() {
        super(Bid, "MarketplaceBid");
    }
}

export const bidService = new BidService();
