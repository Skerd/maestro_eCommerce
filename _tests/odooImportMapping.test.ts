import {describe, expect, it} from "vitest";
import {
    importRowOutcome,
    mapMoveReason,
    mapOdooProductType,
    movementQuantities,
    parseCurrencyRow,
    signedMoveQuantity,
    sortCategoriesParentsFirst,
    sortMovesChronologically,
    sumQuantQuantities,
    warehouseIdForLocationPath,
} from "../utilities/odoo/odooRecords";

describe("odoo import mapping", () => {
    it("orders categories so parents come first", () => {
        const ordered = sortCategoriesParentsFirst([
            {id: 3, name: "Leaf", parentId: 2, sequence: 0},
            {id: 1, name: "Root", parentId: null, sequence: 0},
            {id: 2, name: "Mid", parentId: 1, sequence: 0},
        ]);
        expect(ordered.map((row) => row.id)).toEqual([1, 2, 3]);
    });

    it("sums quants per product and warehouse", () => {
        const totals = sumQuantQuantities([
            {productId: 10, warehouseId: 1, quantity: 4},
            {productId: 10, warehouseId: 1, quantity: 2.5},
            {productId: 10, warehouseId: 2, quantity: 1},
        ]);
        expect(totals.get("10|1")).toBe(6.5);
        expect(totals.get("10|2")).toBe(1);
    });

    it("maps move location usages to ledger reasons", () => {
        expect(mapMoveReason("supplier", "internal")).toBe("restock");
        expect(mapMoveReason("internal", "customer")).toBe("sale");
        expect(mapMoveReason("internal", "internal")).toBe("transfer_in");
        expect(mapMoveReason("internal", "inventory")).toBe("transfer_out");
        expect(mapMoveReason("inventory", "internal")).toBe("adjustment");
        expect(movementQuantities("sale", 3, 0)).toEqual({quantity: -3, quantityBefore: 0, quantityAfter: -3});
        expect(movementQuantities("sale", 2, 5)).toEqual({quantity: -2, quantityBefore: 5, quantityAfter: 3});
        expect(movementQuantities("restock", 3, -1)).toEqual({quantity: 3, quantityBefore: -1, quantityAfter: 2});
    });

    it("maps templates with attributes to variable products", () => {
        expect(mapOdooProductType({type: "service"})).toMatchObject({type: "service", hasVariants: false});
        expect(mapOdooProductType({type: "product", product_variant_count: 3})).toMatchObject({type: "variable", hasVariants: true});
        expect(mapOdooProductType({type: "consu", is_storable: false})).toMatchObject({type: "physical"});
    });

    it("parses Odoo currencies by ISO code", () => {
        const limits = {nameMax: 128, symbolMax: 16};
        expect(parseCurrencyRow({id: 1, name: "usd", full_name: "United States dollar", symbol: "$", decimal_places: 2}, limits))
            .toEqual({id: 1, code: "USD", name: "United States dollar", symbol: "$", decimalPlaces: 2});
        expect(parseCurrencyRow({id: 2, name: "JPY", symbol: false, decimal_places: 0}, limits))
            .toEqual({id: 2, code: "JPY", name: "Yen", symbol: "JPY", decimalPlaces: 0});
        expect(parseCurrencyRow({id: 4, name: "XQZ", symbol: "q"}, limits)?.name).toBe("XQZ");
        expect(parseCurrencyRow({id: 3, name: "EURO", symbol: "€"}, limits)).toBeNull();
        expect(parseCurrencyRow({id: 0, name: "EUR"}, limits)).toBeNull();
    });

    it("updates the same Odoo id on a second run", () => {
        expect(importRowOutcome(false)).toBe("created");
        expect(importRowOutcome(true)).toBe("updated");
    });

    it("maps internal locations onto the warehouse view path", () => {
        const one = [{id: 7, viewId: 3, lotId: 8, viewPath: "1/3/"}];
        const two = [...one, {id: 9, viewId: 4, lotId: 10, viewPath: "1/4/"}];
        expect(warehouseIdForLocationPath(8, "1/3/8/", one)).toBe(7);
        expect(warehouseIdForLocationPath(12, "1/3/12/", two)).toBe(7);
        expect(warehouseIdForLocationPath(99, "1/5/99/", two)).toBeNull();
        expect(warehouseIdForLocationPath(99, "1/5/99/", one)).toBe(7);
    });

    it("sorts stock moves by date then id so running on-hand can go negative", () => {
        const ordered = sortMovesChronologically([
            {id: 3, date: "2024-02-01 10:00:00"},
            {id: 1, date: "2024-01-01 10:00:00"},
            {id: 2, date: "2024-01-01 10:00:00"},
        ]);
        expect(ordered.map((row) => row.id)).toEqual([1, 2, 3]);
        let onHand = 0;
        onHand = movementQuantities("sale", 2, onHand).quantityAfter;
        expect(onHand).toBe(-2);
        onHand = movementQuantities("restock", 5, onHand).quantityAfter;
        expect(onHand).toBe(3);
        const current = 10;
        const latestSale = movementQuantities("sale", 2, current - signedMoveQuantity("sale", 2));
        expect(latestSale).toEqual({quantity: -2, quantityBefore: 12, quantityAfter: 10});
    });
});
