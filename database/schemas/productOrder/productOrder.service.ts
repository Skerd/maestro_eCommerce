import type {Types} from "mongoose";
import {BaseCrudService} from "@coreModule/database/services/baseCrudService";
import ProductOrder, {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";

export class ProductOrderService extends BaseCrudService<IProductOrder, typeof ProductOrder> {
    constructor() {
        super(ProductOrder, "ProductOrder");
    }

    /** The people who have ordered from a company: its buyers, whose address books its staff may read (D163). */
    async buyersOf(companyId: Types.ObjectId): Promise<Types.ObjectId[]> {
        return this.model.distinct("customer", {company: companyId});
    }
}

export const productOrderService = new ProductOrderService();
