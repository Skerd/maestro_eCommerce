/**
 * eCommerce sheets as hubs (UX-03): a product's orders, newest first. The list is read the way its own list route
 * reads it: only when the caller's role can read that model, and with the caller's field grants (SEC-09).
 */

import type {ObjectId} from "mongodb";
import type {Model} from "mongoose";
import {getModelCollectedData} from "@coreModule/database/collections";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import type {UserContext} from "@coreModule/utilities/types/types";
import type {Product} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.dto";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {productOrdersToDTO} from "@eCommerceModule/utilities/mappers/productOrder/productOrderMapper.dto";

/** The newest records of each kind; the full history stays on each list page. */
const HUB_LIMIT = 20;

type HubCtx = {companyId: ObjectId; actionUserCtx: UserContext; languageCode: string};
export type ProductHub = Pick<Product, "orders">;

/** The populate and projection the caller's role allows on a model, or null when it allows nothing (no access to that list). */
function readableFetch(model: Model<any>, collectionName: string, ctx: HubCtx): ReturnType<typeof SchemaGuard.generatePopulate> | null {
    const collected = getModelCollectedData(collectionName).readFields;
    if (!collected) return null;
    try {
        const readFields = SchemaGuard.sanitizeFields(model, collected, "read", ctx.actionUserCtx, ctx.languageCode);
        return Object.keys(readFields).length ? SchemaGuard.generatePopulate(readFields, model.schema) : null;
    } catch {
        // sanitizeFields refuses a role with no readable field: that list is simply not shown.
        return null;
    }
}

/** The shop orders that have this product on a line. */
export async function productHub(productId: ObjectId, ctx: HubCtx): Promise<ProductHub> {
    const ordersFetch = readableFetch(ProductOrder, "productorders", ctx);
    if (!ordersFetch) return {};
    const filter = {company: ctx.companyId, deletedAt: null, "items.product": productId};
    const orders = await productOrderService.find(filter, {}, ordersFetch.populate, ordersFetch.select, {createdAt: -1}, HUB_LIMIT);
    return {orders: productOrdersToDTO(orders)};
}
