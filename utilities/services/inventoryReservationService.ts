import {ObjectId} from "mongodb";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {inventoryMovementService} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.service";
import Product from "@eCommerceModule/database/schemas/product/product";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import type {ICheckout, ICheckoutReservation} from "@eCommerceModule/database/schemas/checkout/checkout";
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
    );
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

/**
 * Reserves stock for every stock-tracked checkout line inside the caller's
 * transaction. Bundle lines are exploded into their components first. Lines
 * with no Inventory record at all are treated as untracked (digital / service
 * products) and skipped. Warehouse choice: the company's default warehouse
 * when it holds the item, otherwise the first inventory row with enough
 * available stock. Throws OutOfStockError when no warehouse can cover a
 * tracked line, after releasing the holds this call already made.
 */
export async function reserveCheckoutStock(
    rawItems: {product: ObjectId; variant?: ObjectId; quantity: number}[],
    companyId: ObjectId,
    ctx: ReservationCtx,
): Promise<ICheckoutReservation[]> {
    const items = await explodeBundleLines(rawItems, companyId, ctx);

    const defaultWarehouse = await Warehouse.findOne(
        {company: companyId, isDefault: true, isActive: true},
        {_id: 1},
        {session: ctx.session},
    );

    const reservations: ICheckoutReservation[] = [];

    for (const item of items) {
        const filter: Record<string, unknown> = {
            product: item.product,
            company: companyId,
            variant: item.variant ?? null,
        };

        const rows = await Inventory.find(filter, {warehouse: 1, quantityOnHand: 1, quantityReserved: 1}, {session: ctx.session});
        if (rows.length === 0) continue; // untracked line (digital/service)

        const ordered = defaultWarehouse
            ? [...rows].sort((a, b) =>
                  nestedEntityToRef(a.warehouse)?.toString() === defaultWarehouse._id.toString() ? -1
                  : nestedEntityToRef(b.warehouse)?.toString() === defaultWarehouse._id.toString() ? 1 : 0)
            : rows;

        let reserved = false;
        for (const row of ordered) {
            const warehouseId = refId(row.warehouse);
            const result = await inventoryService.reserveStock(
                item.product,
                item.variant,
                warehouseId,
                item.quantity,
                ctx,
            );
            if (result) {
                reservations.push({
                    product: item.product,
                    variant: item.variant,
                    warehouse: warehouseId,
                    quantity: item.quantity,
                    state: "reserved",
                });
                reserved = true;
                break;
            }
        }

        if (!reserved) {
            // Undo this call's partial holds so callers that catch the error (and
            // keep their transaction) never commit untracked reservations.
            for (const held of reservations) {
                await inventoryService.releaseReservation(held.product, held.variant, held.warehouse, held.quantity, ctx);
            }
            throw new OutOfStockError(item.product.toString(), item.quantity);
        }
    }

    return reservations;
}

/**
 * Converts a checkout's "reserved" reservations into sales: decrements stock,
 * writes InventoryMovement rows, and flips reservation state to "consumed".
 * Idempotent — already-consumed/released entries are skipped.
 */
export async function consumeCheckoutReservations(checkout: ICheckout, ctx: ReservationCtx): Promise<void> {
    const companyId = nestedEntityToRef(checkout.company);
    if (!companyId) return;

    for (const reservation of checkout.reservations ?? []) {
        if (reservation.state !== "reserved") continue;

        const productId = nestedEntityToRef(reservation.product);
        const variantId = nestedEntityToRef(reservation.variant);
        const warehouseId = nestedEntityToRef(reservation.warehouse);
        if (!productId || !warehouseId) continue;

        const before = await Inventory.findOne(
            {product: productId, warehouse: warehouseId, company: companyId, variant: variantId ?? null},
            {quantityOnHand: 1},
            {session: ctx.session},
        );

        await inventoryService.confirmSale(productId, variantId, warehouseId, reservation.quantity, ctx);

        const quantityBefore = before?.quantityOnHand ?? 0;
        await inventoryMovementService.create(
            {
                inventory: before?._id,
                product: productId,
                variant: variantId,
                warehouse: warehouseId,
                quantity: -reservation.quantity,
                reason: "sale",
                quantityBefore,
                quantityAfter: quantityBefore - reservation.quantity,
                performedBy: ctx.auditUserId,
                referenceType: "Checkout",
                referenceId: checkout._id,
                company: companyId,
            },
            ctx,
        );

        reservation.state = "consumed";
    }

    checkout.markModified("reservations");
    await checkout.save({session: ctx.session});
}

/**
 * Releases every "reserved" reservation on a checkout (cancel / expiry).
 * Idempotent — only "reserved" entries are released.
 */
export async function releaseCheckoutReservations(checkout: ICheckout, ctx: ReservationCtx): Promise<void> {
    for (const reservation of checkout.reservations ?? []) {
        if (reservation.state !== "reserved") continue;

        const productId = nestedEntityToRef(reservation.product);
        const variantId = nestedEntityToRef(reservation.variant);
        const warehouseId = nestedEntityToRef(reservation.warehouse);
        if (!productId || !warehouseId) continue;

        await inventoryService.releaseReservation(productId, variantId, warehouseId, reservation.quantity, ctx);
        reservation.state = "released";
    }

    checkout.markModified("reservations");
    await checkout.save({session: ctx.session});
}

/**
 * Puts sold stock back (full refund of an order that never shipped): every
 * "consumed" reservation is returned to its warehouse with a `return`
 * movement and flipped to "released", so a second call is a no-op.
 * Returns the number of lines restocked.
 */
export async function restockConsumedReservations(checkout: ICheckout, ctx: ReservationCtx & {referenceId?: ObjectId}): Promise<number> {
    const companyId = nestedEntityToRef(checkout.company);
    if (!companyId) return 0;
    let restocked = 0;

    for (const reservation of checkout.reservations ?? []) {
        if (reservation.state !== "consumed") continue;

        const productId = nestedEntityToRef(reservation.product);
        const variantId = nestedEntityToRef(reservation.variant);
        const warehouseId = nestedEntityToRef(reservation.warehouse);
        if (!productId || !warehouseId) continue;

        const updated = await inventoryService.adjust(productId, variantId, warehouseId, reservation.quantity, ctx);
        if (!updated) continue; // inventory row deleted since the sale — nothing to return to

        await inventoryMovementService.create(
            {
                inventory: updated._id,
                product: productId,
                variant: variantId,
                warehouse: warehouseId,
                quantity: reservation.quantity,
                reason: "return",
                quantityBefore: updated.quantityOnHand - reservation.quantity,
                quantityAfter: updated.quantityOnHand,
                performedBy: ctx.auditUserId,
                referenceType: ctx.referenceId ? "ProductOrder" : "Checkout",
                referenceId: ctx.referenceId ?? checkout._id,
                company: companyId,
            },
            ctx,
        );

        reservation.state = "released";
        restocked += 1;
    }

    checkout.markModified("reservations");
    await checkout.save({session: ctx.session});
    return restocked;
}
