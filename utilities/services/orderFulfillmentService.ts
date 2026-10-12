import {ObjectId} from "mongodb";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import type {CrudOptions} from "@coreModule/database/services/baseCrudService";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import type {ICheckoutReservation} from "@eCommerceModule/database/schemas/checkout/checkout";
import type {IProductOrder} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import type {ProductOrderFulfillmentStatus, ProductOrderStatus} from "@eCommerceModule/database/schemas/productOrder/productOrder";
import {productOrderService} from "@eCommerceModule/database/schemas/productOrder/productOrder.service";
import {fulfillmentService} from "@eCommerceModule/database/schemas/fulfillment/fulfillment.service";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {inventoryMovementService} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.service";
import {
    OutOfStockError,
    reserveCheckoutStock,
    trackedStockLines,
} from "@eCommerceModule/utilities/services/inventoryReservationService";

type FulfillmentCtx = CrudOptions & {languageCode: string; auditUserId?: ObjectId | string};
type StockKey = {product: ObjectId; variant?: ObjectId};

/** Order statuses a shipment or delivery moves forward; pending / cancelled / refunded orders stay put. */
const ADVANCING: ProductOrderStatus[] = ["confirmed", "processing", "shipped"];

function sameKey(hold: ICheckoutReservation, line: StockKey): boolean {
    return nestedEntityToRef(hold.product)?.equals(line.product) === true
        && String(nestedEntityToRef(hold.variant) ?? "") === String(line.variant ?? "");
}

function companyOf(order: IProductOrder, languageCode: string): ObjectId {
    const companyId = nestedEntityToRef(order.company);
    if (!companyId) throw apiValidationException("order_not_found", "", null, languageCode);
    return companyId;
}

function performer(ctx: FulfillmentCtx): ObjectId | undefined {
    return typeof ctx.auditUserId === "string" ? new ObjectId(ctx.auditUserId) : ctx.auditUserId;
}

/** Takes held units off the shelf for a shipment, with a `sale` movement referencing it. */
async function sellHeld(
    line: StockKey,
    warehouseId: ObjectId,
    quantity: number,
    refs: {fulfillmentId: ObjectId; companyId: ObjectId},
    ctx: FulfillmentCtx,
): Promise<void> {
    const sold = await inventoryService.confirmSale(line.product, line.variant, warehouseId, quantity, ctx);
    if (!sold) throw apiValidationException("inventory_not_found", "items", null, ctx.languageCode);
    await inventoryMovementService.create(
        {
            inventory: sold._id,
            product: line.product,
            variant: line.variant,
            warehouse: warehouseId,
            quantity: -quantity,
            reason: "sale",
            quantityBefore: sold.quantityOnHand + quantity,
            quantityAfter: sold.quantityOnHand,
            performedBy: performer(ctx),
            referenceType: "Fulfillment",
            referenceId: refs.fulfillmentId,
            company: refs.companyId,
        },
        ctx,
    );
}

/**
 * Stock leaves when goods ship. For the shipped order lines (bundles as their
 * tracked components) this consumes the order's holds — splitting a hold when
 * only part of it ships — and links them to the shipment. Units that aren't
 * held (an order paid while out of stock, or placed before holds moved onto
 * orders) are reserved on the spot; if that fails the shipment is refused
 * with `out_of_stock`. Saves the order.
 */
export async function consumeForShipment(
    order: IProductOrder,
    items: {orderItemId: unknown; quantity: number}[],
    fulfillmentId: ObjectId,
    ctx: FulfillmentCtx,
): Promise<void> {
    const companyId = companyOf(order, ctx.languageCode);
    const refs = {fulfillmentId, companyId};

    const lines = items.flatMap(item => {
        const line = order.items.find(orderLine => orderLine._id.toString() === String(nestedEntityToRef(item.orderItemId)));
        const productId = nestedEntityToRef(line?.product);
        return productId ? [{product: productId, variant: nestedEntityToRef(line?.variant), quantity: item.quantity}] : [];
    });
    const shipped = await trackedStockLines(lines, companyId, ctx);

    const holds = order.reservations ?? [];
    const consumedParts: ICheckoutReservation[] = [];
    for (const line of shipped) {
        let remaining = line.quantity;
        for (const hold of holds) {
            if (remaining <= 0) break;
            if (hold.state !== "reserved" || !sameKey(hold, line)) continue;

            const take = Math.min(hold.quantity, remaining);
            const warehouseId = nestedEntityToRef(hold.warehouse);
            if (!warehouseId) continue;
            await sellHeld(line, warehouseId, take, refs, ctx);
            if (take === hold.quantity) {
                hold.state = "consumed";
                hold.fulfillment = fulfillmentId;
            } else {
                hold.quantity -= take;
                consumedParts.push({product: line.product, variant: line.variant, warehouse: warehouseId, quantity: take, state: "consumed", fulfillment: fulfillmentId});
            }
            remaining -= take;
        }

        if (remaining > 0) {
            let fresh: ICheckoutReservation[];
            try {
                fresh = await reserveCheckoutStock([{product: line.product, variant: line.variant, quantity: remaining}], companyId, ctx);
            } catch (error) {
                if (error instanceof OutOfStockError) {
                    throw apiValidationException("out_of_stock", "items", null, ctx.languageCode);
                }
                throw error;
            }
            for (const hold of fresh) {
                await sellHeld(line, hold.warehouse, hold.quantity, refs, ctx);
                consumedParts.push({...hold, state: "consumed", fulfillment: fulfillmentId});
            }
        }
    }

    order.reservations = [...holds, ...consumedParts];
    order.markModified("reservations");
    await order.save({session: ctx.session});
}

/**
 * A shipment that failed after leaving (returned to sender): its units go back
 * on hand and are held for the order again, so a new shipment can take them.
 * Saves the order.
 */
export async function reverseShipment(order: IProductOrder, fulfillmentId: ObjectId, ctx: FulfillmentCtx): Promise<void> {
    const companyId = companyOf(order, ctx.languageCode);
    for (const hold of order.reservations ?? []) {
        if (hold.state !== "consumed" || !nestedEntityToRef(hold.fulfillment)?.equals(fulfillmentId)) continue;

        const productId = nestedEntityToRef(hold.product);
        const warehouseId = nestedEntityToRef(hold.warehouse);
        if (!productId || !warehouseId) continue;
        const variantId = nestedEntityToRef(hold.variant);

        const back = await inventoryService.reverseSale(productId, variantId, warehouseId, hold.quantity, ctx);
        if (!back) throw apiValidationException("inventory_not_found", "", null, ctx.languageCode);
        await inventoryMovementService.create(
            {
                inventory: back._id,
                product: productId,
                variant: variantId,
                warehouse: warehouseId,
                quantity: hold.quantity,
                reason: "return",
                quantityBefore: back.quantityOnHand - hold.quantity,
                quantityAfter: back.quantityOnHand,
                performedBy: performer(ctx),
                referenceType: "Fulfillment",
                referenceId: fulfillmentId,
                company: companyId,
            },
            ctx,
        );
        hold.state = "reserved";
        hold.fulfillment = undefined;
    }
    order.markModified("reservations");
    await order.save({session: ctx.session});
}

/**
 * Derives the order's fulfillment status from its shipments — every line
 * shipped: `fulfilled`, some: `partially_fulfilled` — and moves the order to
 * `shipped` when everything left, or `delivered` once every non-failed
 * shipment is delivered (a fully shipped order whose shipment failed goes back
 * to `processing`). Writes the result with a timeline entry — `order_<status>`
 * when the status changed, otherwise the caller's event — and returns it.
 */
export async function syncOrderFulfillment(
    order: IProductOrder,
    event: {event: string; userId?: string; note?: string},
    ctx: FulfillmentCtx,
): Promise<{status: ProductOrderStatus; fulfillmentStatus: ProductOrderFulfillmentStatus}> {
    const fulfillments = await fulfillmentService.find(
        {order: order._id, company: companyOf(order, ctx.languageCode), status: {$ne: "failed"}},
        {...ctx, withDeleted: false},
    );
    const shipped = new Map<string, number>();
    for (const fulfillment of fulfillments) {
        if (fulfillment.status !== "shipped" && fulfillment.status !== "delivered") continue;
        for (const item of fulfillment.items) {
            const key = item.orderItemId.toString();
            shipped.set(key, (shipped.get(key) ?? 0) + item.quantity);
        }
    }

    const fully = order.items.length > 0 && order.items.every(item => (shipped.get(item._id.toString()) ?? 0) >= item.quantity);
    const some = [...shipped.values()].some(quantity => quantity > 0);
    const fulfillmentStatus: ProductOrderFulfillmentStatus = fully ? "fulfilled" : some ? "partially_fulfilled" : "unfulfilled";
    const allDelivered = fully && fulfillments.every(fulfillment => fulfillment.status === "delivered");

    let status = order.status;
    if (ADVANCING.includes(order.status)) {
        status = allDelivered ? "delivered" : fully ? "shipped" : order.status === "shipped" ? "processing" : order.status;
    }

    await productOrderService.updateByIdOrThrow(
        order._id,
        {
            $set: {status, fulfillmentStatus},
            $push: {
                timeline: {
                    ...event,
                    event: status !== order.status ? `order_${status}` : event.event,
                    timestamp: new Date(),
                },
            },
        },
        ctx,
    );
    return {status, fulfillmentStatus};
}
