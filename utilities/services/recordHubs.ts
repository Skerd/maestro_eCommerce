/**
 * eCommerce sheets as hubs (UX-03): a product's orders, newest first. The list is read the way its own list route
 * reads it: only when the caller's role can read that model, and with the caller's field grants (SEC-09).
 */

import type {ObjectId} from "mongodb";
import {readableListFetch} from "@coreModule/database/security/readableListFetch";
import type {UserContext} from "@coreModule/utilities/types/types";
import type {Product} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.dto";
import ProductOrder from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {productOrdersToDTO} from "@eCommerceModule/utilities/mappers/productOrder/productOrderMapper.dto";

/** The newest records of each kind; the full history stays on each list page. */
const HUB_LIMIT = 20;

type HubCtx = {companyId: ObjectId; actionUserCtx: UserContext; languageCode: string};
export type ProductHub = Pick<Product, "orders">;

/** The shop orders that have this product on a line. */
export async function productHub(productId: ObjectId, ctx: HubCtx): Promise<ProductHub> {
    const ordersFetch = readableListFetch(ProductOrder, ctx);
    if (!ordersFetch) return {};
    const filter = {company: ctx.companyId, deletedAt: null, "items.product": productId};
    const orders = await productOrderService.find(filter, {}, ordersFetch.populate, ordersFetch.select, {createdAt: -1}, HUB_LIMIT);
    return {orders: productOrdersToDTO(orders)};
}
