import type {Model} from "mongoose";
import ListingCategory from "@eCommerceModule/database/schemas/category/category";
import OrderMilestone from "@eCommerceModule/database/schemas/orderMilestone/orderMilestone";
import OrderDelivery from "@eCommerceModule/database/schemas/orderDelivery/orderDelivery";
import OrderRevision from "@eCommerceModule/database/schemas/orderRevision/orderRevision";
import EscrowTransaction from "@eCommerceModule/database/schemas/escrowTransaction/escrowTransaction";
import SavedSearch from "@eCommerceModule/database/schemas/savedSearch/savedSearch";

export const eCommerceModels: Model<any>[] = [
    ListingCategory,
    OrderMilestone,
    OrderDelivery,
    OrderRevision,
    EscrowTransaction,
    SavedSearch,
];

export async function dropECommerceCollections(): Promise<void> {
    for (const model of eCommerceModels) {
        await model.collection.drop();
    }
}
