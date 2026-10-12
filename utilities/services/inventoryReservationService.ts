import {ObjectId} from "mongodb";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import Product, {type IProduct} from "@eCommerceModule/database/schemas/product/product";
import ProductVariant, {type IProductVariant} from "@eCommerceModule/database/schemas/productVariant/productVariant";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import type {ICheckoutReservation} from "@eCommerceModule/database/schemas/checkout/checkout";
import type {CrudOptions} from "@coreModule/database/services/baseCrudService";

type ReservationCtx = CrudOptions & {auditUserId?: ObjectId | string};

function refId(value: unknown): ObjectId {
    const id = nestedEntityToRef(value);
    if (id) return id;
    return new ObjectId(String(value));
}

export class OutOfStockError extends Error {
    constructor(public readonly productId: string, public readonly quantity: number) {
        super("out_of_stock");
    }
}

/**
 * Bundle lines don't hold stock themselves: each bundle line becomes its
 * components' quantities (component qty × line qty), merged with any direct
 * lines for the same product. Non-bundle lines pass through unchanged.
 */
export async function explodeBundleLines(
    items: {product: ObjectId; variant?: ObjectId; quantity: number}[],
    companyId: ObjectId,
    ctx: ReservationCtx,
): Promise<{product: ObjectId; variant?: ObjectId; quantity: number}[]> {
    const productIds = items.map(item => item.product);
    const bundles = await Product.find(
        {_id: {$in: productIds}, company: companyId, type: "bundle"},
        {bundleComponents: 1},
        {session: ctx.session},
    ).noDeleted();
    if (bundles.length === 0) return items;

    const bundleMap = new Map(
        bundles.map(bundle => [bundle._id.toString(), bundle.bundleComponents ?? []]),
    );

    const exploded: {product: ObjectId; variant?: ObjectId; quantity: number}[] = [];
    for (const item of items) {
        const components = bundleMap.get(item.product.toString());
        if (!components) {
            exploded.push(item);
            continue;
        }
        for (const component of components) {
            const componentId = nestedEntityToRef(component.product);
            if (!componentId) continue;
            exploded.push({
                product: componentId,
                quantity: (component.quantity ?? 1) * item.quantity,
            });
        }
    }

    // Merge duplicate product/variant pairs so availability is checked once
    const merged = new Map<string, {product: ObjectId; variant?: ObjectId; quantity: number}>();
    for (const item of exploded) {
        const key = `${item.product.toString()}::${item.variant?.toString() ?? ""}`;
        const existing = merged.get(key);
        if (existing) existing.quantity += item.quantity;
        else merged.set(key, {...item});
    }
    return [...merged.values()];
}

/** Product types that never hold stock: bundles are exploded into their components instead. */
const UNTRACKED_TYPES = new Set(["digital", "service", "gift_card", "bundle"]);

/**
 * The single stock-tracking rule for online checkout, the storefront and POS:
 * physical / variable products are tracked unless the product or the variant
 * opts out with `trackInventory: false`.
 */
export function isStockTracked(
    product: Pick<IProduct, "type" | "trackInventory">,
    variant?: Pick<IProductVariant, "trackInventory"> | null,
): boolean {
    if (UNTRACKED_TYPES.has(product.type)) return false;
    return product.trackInventory !== false && variant?.trackInventory !== false;
}

type StockLine = {product: ObjectId; variant?: ObjectId; quantity: number};

/**
 * The lines that move stock: bundles exploded into their components, then
 * every line that isStockTracked. A product that no longer exists counts as
 * tracked, so it can only sell from stock that is actually there.
 */
export async function trackedStockLines(
    rawItems: StockLine[],
    companyId: ObjectId,
    ctx: ReservationCtx,
): Promise<StockLine[]> {
    const items = await explodeBundleLines(rawItems, companyId, ctx);

    const variantIds = items.flatMap(item => (item.variant ? [item.variant] : []));
    const [products, variants] = await Promise.all([
        Product.find({_id: {$in: items.map(item => item.product)}, company: companyId}, {type: 1, trackInventory: 1})
            .noDeleted().session(ctx.session ?? null),
        ProductVariant.find({_id: {$in: variantIds}, company: companyId}, {trackInventory: 1})
            .noDeleted().session(ctx.session ?? null),
    ]);
    const productMap = new Map(products.map(product => [product._id.toString(), product]));
    const variantMap = new Map(variants.map(variant => [variant._id.toString(), variant]));

    return items.filter(item => {
        const product = productMap.get(item.product.toString());
        const variant = item.variant ? variantMap.get(item.variant.toString()) : null;
        return !product || isStockTracked(product, variant);
    });
}

/**
 * Holds stock for every stock-tracked line (trackedStockLines) inside the
 * caller's transaction. Only active warehouses count. Per line: one warehouse
 * that covers it all (the default one first), otherwise the line is split
 * across warehouses (default first). Throws OutOfStockError when the active
 * warehouses together can't cover a tracked line, after releasing the holds
 * this call already made.
 */
export async function reserveCheckoutStock(
    rawItems: StockLine[],
    companyId: ObjectId,
    ctx: ReservationCtx,
): Promise<ICheckoutReservation[]> {
    const items = await trackedStockLines(rawItems, companyId, ctx);

    const warehouses = await Warehouse.find({company: companyId, isActive: true}, {_id: 1, isDefault: 1})
        .noDeleted().session(ctx.session ?? null);
    const warehouseIds = warehouses.map(warehouse => warehouse._id);
    const defaultWarehouseId = warehouses.find(warehouse => warehouse.isDefault)?._id.toString();

    const reservations: ICheckoutReservation[] = [];
    const hold = async (item: StockLine, warehouseId: ObjectId, quantity: number): Promise<boolean> => {
        if (!(await inventoryService.reserveStock(item.product, item.variant, warehouseId, quantity, ctx))) return false;
        reservations.push({product: item.product, variant: item.variant, warehouse: warehouseId, quantity, state: "reserved"});
        return true;
    };

    for (const item of items) {
        const rows = await Inventory.find(
            {product: item.product, company: companyId, variant: item.variant ?? null, warehouse: {$in: warehouseIds}},
            {warehouse: 1, quantityOnHand: 1, quantityReserved: 1},
            {session: ctx.session},
        ).noDeleted();

        const ordered = defaultWarehouseId
            ? [...rows].sort((a, b) =>
                  nestedEntityToRef(a.warehouse)?.toString() === defaultWarehouseId ? -1
                  : nestedEntityToRef(b.warehouse)?.toString() === defaultWarehouseId ? 1 : 0)
            : rows;

        // One warehouse for the whole line when possible: fewer parcels
        let covered = false;
        for (const row of ordered) {
            if (await hold(item, refId(row.warehouse), item.quantity)) {
                covered = true;
                break;
            }
        }

        // Otherwise split it: take what each warehouse has, default first
        let remaining = covered ? 0 : item.quantity;
        for (const row of covered ? [] : ordered) {
            const take = Math.min(remaining, Math.max(0, row.quantityOnHand - row.quantityReserved));
            if (take > 0 && await hold(item, refId(row.warehouse), take)) remaining -= take;
            if (remaining <= 0) break;
        }

        if (remaining > 0) {
            // Undo this call's holds so callers that catch the error (and keep
            // their transaction) never commit a partial reservation.
            for (const held of reservations) {
                await inventoryService.releaseReservation(held.product, held.variant, held.warehouse, held.quantity, ctx);
            }
            throw new OutOfStockError(item.product.toString(), item.quantity);
        }
    }

    return reservations;
}

/** A Checkout or ProductOrder: anything that holds stock reservations. */
type ReservationHolder = {
    reservations?: ICheckoutReservation[];
    markModified(path: string): void;
    save(options?: {session?: ReservationCtx["session"]}): Promise<unknown>;
};

/**
 * Releases every "reserved" hold on a checkout or order (payment reset,
 * expiry, cancel, full refund). Idempotent — only "reserved" entries are
 * released; consumed (shipped) ones stay as they are.
 */
export async function releaseReservations(holder: ReservationHolder, ctx: ReservationCtx): Promise<void> {
    for (const reservation of holder.reservations ?? []) {
        if (reservation.state !== "reserved") continue;

        const productId = nestedEntityToRef(reservation.product);
        const variantId = nestedEntityToRef(reservation.variant);
        const warehouseId = nestedEntityToRef(reservation.warehouse);
        if (!productId || !warehouseId) continue;

        await inventoryService.releaseReservation(productId, variantId, warehouseId, reservation.quantity, ctx);
        reservation.state = "released";
    }

    holder.markModified("reservations");
    await holder.save({session: ctx.session});
}
