import {ObjectId} from "mongodb";
import type {IProductOrder, IProductOrderItem} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import type {CrudOptions} from "@coreModule/database/services/baseCrudService";
import {mapSnippet, nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {lineSnapshotImageUrl} from "@eCommerceModule/utilities/mappers/productOrder/productOrderMapper.dto";
import type {ProductSimple} from "armonia/src/modules/eCommerce/dto/product.dto";
import type {ProductVariantSimple} from "armonia/src/modules/eCommerce/dto/productVariant.dto";
import {ProductSimpleSnippet} from "@eCommerceModule/database/schemas/product/product.snippets";
import {ProductVariantSimpleSnippet} from "@eCommerceModule/database/schemas/productVariant/productVariant.snippets";

/** Sale-time copy of a line, plus the catalog product it was sold from. */
export type OrderLineProductCopy = {
    product?: ProductSimple;
    variant?: ProductVariantSimple;
    snapshot?: {
        title?: string;
        sku?: string;
        imageUrl?: string;
        variantLabel?: string;
        productType?: string;
    };
};

const linePopulate = [
    {path: "items.product", populate: {path: "currency"}},
    {path: "items.variant"},
];

function copyOfLine(line: IProductOrderItem | undefined): OrderLineProductCopy {
    if (!line) return {};
    const product = mapSnippet<ProductSimple>()(line.product, ProductSimpleSnippet);
    const variant = mapSnippet<ProductVariantSimple>()(line.variant, ProductVariantSimpleSnippet);
    const snapshot = {
        title: line.snapshot?.title ?? product?.title,
        sku: line.snapshot?.sku ?? product?.sku,
        imageUrl: lineSnapshotImageUrl(line),
        variantLabel: line.snapshot?.variantLabel,
        productType: line.snapshot?.productType ?? product?.type,
    };
    const hasSnapshot = Object.values(snapshot).some((value) => value != null && value !== "");
    return {
        ...(product?.title ? {product} : {}),
        ...(variant?.sku ? {variant} : {}),
        ...(hasSnapshot ? {snapshot} : {}),
    };
}

/** Attach each stored `orderItemId` to that order line's product and sale snapshot. */
export function attachOrderLineProductCopy<T extends {orderItemId: string}>(
    items: T[],
    order: IProductOrder | null | undefined,
): (T & OrderLineProductCopy)[] {
    const byId = new Map((order?.items ?? []).map((line) => [line._id.toString(), line]));
    return items.map((item) => ({
        ...item,
        ...copyOfLine(byId.get(item.orderItemId)),
    }));
}

type RowWithLines = {
    order: unknown;
    items: {orderItemId: string}[];
};

/**
 * One order query for a page of fulfillments or returns. The sheet opens from
 * the list row, which otherwise only has the line id.
 */
export async function withOrderLineProductCopies<T extends RowWithLines>(
    rows: T[],
    companyId: unknown,
    opts: CrudOptions,
): Promise<T[]> {
    const orderIds = [...new Set(
        rows
            .map((row) => nestedEntityToRef(row.order)?.toString())
            .filter((id): id is string => !!id),
    )];
    if (orderIds.length === 0) return rows;

    const orders = await productOrderService.find(
        {_id: {$in: orderIds.map((id) => new ObjectId(id))}, company: companyId},
        {...opts, withDeleted: true},
        linePopulate,
        "items",
    );
    const byId = new Map(orders.map((order) => [order._id.toString(), order]));
    return rows.map((row) => {
        const orderId = nestedEntityToRef(row.order)?.toString();
        return {
            ...row,
            items: attachOrderLineProductCopy(row.items, orderId ? byId.get(orderId) : undefined),
        };
    });
}
