import type {ICollection} from "@eCommerceModule/database/schemas/collection/collection";
import type {ApiSelectDatum} from "armonia/src/modules/core/types/shared.types";

export function collectionToSelect(collection: ICollection): ApiSelectDatum {
    return {
        value: collection._id.toString(),
        label: collection.name
    };
}

export function collectionsToSelect(collections: ICollection[]): ApiSelectDatum[] {
    return collections.map(collectionToSelect);
}
