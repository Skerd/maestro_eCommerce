import type {InventoryMovementReason} from "armonia/src/modules/eCommerce/api/eCommerce/private/inventoryMovement/inventoryMovement.schema-def";

export type OdooCategoryRow = {
    id: number;
    name: string;
    parentId: number | null;
    sequence: number;
};

export type OdooQuantKey = {
    productId: number;
    warehouseId: number;
};

export function odooMany2oneId(value: unknown): number | null {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
    if (Array.isArray(value) && typeof value[0] === "number" && value[0] > 0) return value[0];
    return null;
}

export function odooMany2oneName(value: unknown): string {
    if (typeof value === "string") return value;
    if (Array.isArray(value) && typeof value[1] === "string") return value[1];
    return "";
}

export function odooNumber(value: unknown): number | undefined {
    return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

export function odooIntegerId(value: unknown): number | null {
    if (typeof value === "number" && Number.isInteger(value) && value > 0) return value;
    return null;
}

export function truncateOdooText(value: string, max: number): string {
    const trimmed = value.trim();
    if (trimmed.length <= max) return trimmed;
    return trimmed.slice(0, max);
}

export function sortCategoriesParentsFirst(rows: OdooCategoryRow[]): OdooCategoryRow[] {
    const byId = new Map(rows.map((row) => [row.id, row]));
    const ordered: OdooCategoryRow[] = [];
    const visiting = new Set<number>();
    const visited = new Set<number>();

    function visit(row: OdooCategoryRow): void {
        if (visited.has(row.id) || visiting.has(row.id)) return;
        visiting.add(row.id);
        const parent = row.parentId != null ? byId.get(row.parentId) : undefined;
        if (parent) visit(parent);
        visiting.delete(row.id);
        visited.add(row.id);
        ordered.push(row);
    }

    for (const row of rows) visit(row);
    return ordered;
}

export function parseCategoryRow(row: Record<string, unknown>): OdooCategoryRow | null {
    const id = odooIntegerId(row.id);
    if (id == null) return null;
    const name = typeof row.name === "string" ? row.name.trim() : "";
    if (!name) return null;
    return {
        id,
        name,
        parentId: odooMany2oneId(row.parent_id),
        sequence: typeof row.sequence === "number" ? row.sequence : 0,
    };
}

export function quantKey(productId: number, warehouseId: number): string {
    return `${productId}|${warehouseId}`;
}

export function sumQuantQuantities(rows: {productId: number; warehouseId: number; quantity: number}[]): Map<string, number> {
    const totals = new Map<string, number>();
    for (const row of rows) {
        if (row.quantity === 0) continue;
        const key = quantKey(row.productId, row.warehouseId);
        totals.set(key, (totals.get(key) ?? 0) + row.quantity);
    }
    return totals;
}

export function mapMoveReason(sourceUsage: string, destUsage: string): InventoryMovementReason {
    if (destUsage === "customer") return "sale";
    if (sourceUsage === "customer" && destUsage === "internal") return "return";
    if (sourceUsage === "supplier" && destUsage === "internal") return "restock";
    if (sourceUsage === "internal" && destUsage === "internal") return "transfer_in";
    if (sourceUsage === "internal" && destUsage !== "internal") return "transfer_out";
    return "adjustment";
}

export function signedMoveQuantity(reason: InventoryMovementReason, qty: number): number {
    const amount = Math.abs(qty);
    if (reason === "sale" || reason === "transfer_out" || reason === "write_off") return -amount;
    return amount;
}

export function movementQuantities(
    reason: InventoryMovementReason,
    qty: number,
    quantityBefore: number,
): {
    quantity: number;
    quantityBefore: number;
    quantityAfter: number;
} {
    const quantity = signedMoveQuantity(reason, qty);
    return {
        quantity,
        quantityBefore,
        quantityAfter: quantityBefore + quantity,
    };
}

export function odooMoveTime(row: Record<string, unknown>): number {
    if (typeof row.date !== "string") return 0;
    const value = Date.parse(row.date);
    return Number.isNaN(value) ? 0 : value;
}

export function sortMovesChronologically(rows: Record<string, unknown>[]): Record<string, unknown>[] {
    return [...rows].sort((left, right) => {
        const byDate = odooMoveTime(left) - odooMoveTime(right);
        if (byDate !== 0) return byDate;
        return (odooIntegerId(left.id) ?? 0) - (odooIntegerId(right.id) ?? 0);
    });
}

export function isInternalOdooUser(row: Record<string, unknown>): boolean {
    return row.share !== true && row.active !== false;
}

export function odooUserEmail(row: Record<string, unknown>): string | null {
    const email = typeof row.email === "string" ? row.email.trim().toLowerCase() : "";
    const login = typeof row.login === "string" ? row.login.trim().toLowerCase() : "";
    const candidate = email || login;
    if (!candidate || !candidate.includes("@")) return null;
    return candidate;
}

export function splitOdooUserName(fullName: string): {name: string; surname: string} {
    const trimmed = fullName.trim();
    const space = trimmed.indexOf(" ");
    if (space <= 0) return {name: trimmed || "Odoo", surname: "User"};
    const name = trimmed.slice(0, space).trim();
    const surname = trimmed.slice(space + 1).trim();
    return {name: name || "Odoo", surname: surname || "User"};
}

export function emptyImportCounts(): {created: number; updated: number; skipped: number} {
    return {created: 0, updated: 0, skipped: 0};
}

export function importRowOutcome(hadLink: boolean): "created" | "updated" {
    return hadLink ? "updated" : "created";
}

export type OdooWarehouseLocation = {
    id: number;
    viewId: number | null;
    lotId: number | null;
    viewPath: string;
};

export function warehouseIdForLocationPath(
    locationId: number,
    parentPath: string,
    warehouses: OdooWarehouseLocation[],
): number | null {
    for (const warehouse of warehouses) {
        if (locationId === warehouse.viewId || locationId === warehouse.lotId) return warehouse.id;
        if (warehouse.viewPath && parentPath.startsWith(warehouse.viewPath)) return warehouse.id;
    }
    if (warehouses.length === 1) return warehouses[0].id;
    return null;
}

export type ProductTypeMapping = {
    type: "physical" | "service" | "variable";
    trackInventory: boolean;
    hasVariants: boolean;
};

export function mapOdooProductType(row: Record<string, unknown>): ProductTypeMapping {
    const odooType = typeof row.type === "string" ? row.type : "";
    const variantCount = typeof row.product_variant_count === "number" ? row.product_variant_count : 0;
    const attributeLines = Array.isArray(row.attribute_line_ids) ? row.attribute_line_ids.length : 0;
    const hasVariants = variantCount > 1 || attributeLines > 0;
    if (odooType === "service") {
        return {type: "service", trackInventory: false, hasVariants};
    }
    const isStorable = row.is_storable === true || odooType === "product";
    if (hasVariants) {
        return {type: "variable", trackInventory: isStorable || odooType !== "service", hasVariants: true};
    }
    return {type: "physical", trackInventory: isStorable || odooType !== "service", hasVariants: false};
}
