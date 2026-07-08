import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import ProductCollection, {ICollection} from "@eCommerceModule/database/schemas/collection/collection";

export class CollectionService extends BaseCrudService<ICollection, typeof ProductCollection> {
    constructor() {
        super(ProductCollection, "ProductCollection");
    }
}

export const collectionService = new CollectionService();
