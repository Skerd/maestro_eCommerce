import { BaseCrudService } from "@coreModule/database/services/baseCrudService";
import Listing, { IListing } from "@eCommerceModule/database/schemas/listing/listing";

export class ListingService extends BaseCrudService<IListing, typeof Listing> {
    constructor() {
        super(Listing, "Listing");
    }
}

export const listingService = new ListingService();
