import {ObjectId} from "mongodb";
import type {Model} from "mongoose";
import type {Document} from "mongoose";
import SchemaGuard from "@coreModule/database/security/schemaGuard";
import type {AuthenticatedMWType} from "@coreModule/utilities/middlewares/authMW";
import type {CrudOptions} from "@coreModule/database/services/baseCrudService";
import {apiValidationException} from "armonia/src/modules/core/helpers/exceptions";
import type {OdooImportFormType, OdooImportDataset} from "armonia/src/modules/eCommerce/api/eCommerce/private/odooImport/odooImport.form.type";
import {odooImportDatasets} from "armonia/src/modules/eCommerce/api/eCommerce/private/odooImport/odooImport.form.type";
import type {OdooImportCounts, OdooImportResponse} from "armonia/src/modules/eCommerce/api/eCommerce/private/odooImport/odooImport.form.response.type";
import {CATEGORY_NAME_MAX} from "armonia/src/modules/eCommerce/api/eCommerce/private/category/category.schema-def";
import {
    PRODUCT_DESCRIPTION_MAX,
    PRODUCT_SKU_MAX,
    PRODUCT_TITLE_MAX,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.schema-def";
import {
    PRODUCT_ATTRIBUTE_NAME_MAX,
    PRODUCT_ATTRIBUTE_VALUE_MAX,
    PRODUCT_ATTRIBUTE_VALUES_MAX_ITEMS,
} from "armonia/src/modules/eCommerce/api/eCommerce/private/productAttribute/productAttribute.schema-def";
import {PRODUCT_VARIANT_SKU_MAX, PRODUCT_VARIANT_BARCODE_MAX} from "armonia/src/modules/eCommerce/api/eCommerce/private/productVariant/productVariant.schema-def";
import {WAREHOUSE_CODE_MAX, WAREHOUSE_NAME_MAX} from "armonia/src/modules/eCommerce/api/eCommerce/private/warehouse/warehouse.schema-def";
import {STOCK_TRANSFER_NOTE_MAX} from "armonia/src/modules/eCommerce/api/eCommerce/private/stockTransfer/stockTransfer.schema-def";
import {DecryptString} from "@coreModule/utilities/security/encryption";
import {generateRandomString} from "@coreModule/utilities/helpers";
import {nestedEntityToRef} from "@coreModule/utilities/mappers/common.mapper";
import {roleService} from "@coreModule/database/schemas/role/role.service";
import {userService} from "@coreModule/database/schemas/user/user.service";
import User from "@coreModule/database/schemas/user/user";
import {ensureAiChannel} from "@coreModule/database/schemas/channel/channel.helper";
import ProductCategory from "@eCommerceModule/database/schemas/category/category";
import {categoryService} from "@eCommerceModule/database/schemas/category/category.service";
import Product from "@eCommerceModule/database/schemas/product/product";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import ProductAttribute from "@eCommerceModule/database/schemas/productAttribute/productAttribute";
import {productAttributeService} from "@eCommerceModule/database/schemas/productAttribute/productAttribute.service";
import {productVariantService} from "@eCommerceModule/database/schemas/productVariant/productVariant.service";
import Warehouse from "@eCommerceModule/database/schemas/warehouse/warehouse";
import {warehouseService} from "@eCommerceModule/database/schemas/warehouse/warehouse.service";
import Inventory from "@eCommerceModule/database/schemas/inventory/inventory";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import InventoryMovement from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement";
import {inventoryMovementService} from "@eCommerceModule/database/schemas/inventoryMovement/inventoryMovement.service";
import StockTransfer from "@eCommerceModule/database/schemas/stockTransfer/stockTransfer";
import {stockTransferService} from "@eCommerceModule/database/schemas/stockTransfer/stockTransfer.service";
import OdooLink from "@eCommerceModule/database/schemas/odooLink/odooLink";
import {odooConnectionService} from "@eCommerceModule/database/schemas/odooConnection/odooConnection.service";
import {createOdooJsonRpcClient, ODOO_SEARCH_PAGE_SIZE, type OdooJsonRpcClient, type OdooDomain} from "./odooJsonRpc";
import {findOdooLink, findOdooLinks, rememberOdooLink, rememberOdooLinks} from "./odooLinkStore";
import {
    emptyImportCounts,
    importRowOutcome,
    isInternalOdooUser,
    mapMoveReason,
    mapOdooProductType,
    movementQuantities,
    odooIntegerId,
    odooMany2oneId,
    odooNumber,
    odooUserEmail,
    parseCategoryRow,
    sortCategoriesParentsFirst,
    sortMovesChronologically,
    splitOdooUserName,
    sumQuantQuantities,
    truncateOdooText,
    warehouseIdForLocationPath,
    type OdooWarehouseLocation,
} from "./odooRecords";

const DEFAULT_NEW_USER_TIMEZONE = "Europe/Tirane";
const DONE_MOVES: OdooDomain = [["state", "=", "done"]];
const INTERNAL_QUANTS: OdooDomain = [["location_id.usage", "=", "internal"]];
const INTERNAL_USERS: OdooDomain = [["share", "=", false], ["active", "=", true]];
const INTERNAL_PICKINGS: OdooDomain = [["state", "=", "done"], ["picking_type_code", "=", "internal"]];

type StockRef = {product: ObjectId; variant?: ObjectId};

type ImportCtx = {
    client: OdooJsonRpcClient;
    companyId: ObjectId;
    languageCode: string;
    opts: CrudOptions;
    params: AuthenticatedMWType;
    links: Map<string, {localModel: string; localId: ObjectId}>;
    warehouseLocations?: OdooWarehouseLocation[];
};

function selectedDatasets(form: OdooImportFormType): OdooImportDataset[] {
    return odooImportDatasets.filter((dataset) => form[dataset] === true);
}

function assertCanCreate(model: Model<Document>, params: AuthenticatedMWType): void {
    try {
        SchemaGuard.checkModelPermission(model, "create", params.actionUserCtx, params.languageCode);
    } catch {
        throw apiValidationException("odoo_dataset_not_permitted", "", null, params.languageCode);
    }
}

function linkKey(odooModel: string, odooId: number): string {
    return `${odooModel}:${odooId}`;
}

async function cachedLink(ctx: ImportCtx, odooModel: string, odooId: number) {
    const key = linkKey(odooModel, odooId);
    const cached = ctx.links.get(key);
    if (cached) return cached;
    const found = await findOdooLink(ctx.companyId, odooModel, odooId, ctx.opts);
    if (!found) return null;
    const value = {localModel: found.localModel, localId: found.localId};
    ctx.links.set(key, value);
    return value;
}

async function writeLink(
    ctx: ImportCtx,
    odooModel: string,
    odooId: number,
    localModel: string,
    localId: ObjectId,
): Promise<"created" | "updated"> {
    const outcome = await rememberOdooLink(ctx.companyId, odooModel, odooId, localModel, localId, ctx.opts);
    ctx.links.set(linkKey(odooModel, odooId), {localModel, localId});
    return outcome;
}

function countRow(counts: OdooImportCounts, outcome: "created" | "updated"): void {
    counts[outcome] += 1;
}

async function resolveStockRef(ctx: ImportCtx, productOdooId: number): Promise<StockRef | null> {
    const link = await cachedLink(ctx, "product.product", productOdooId);
    if (!link) return null;
    if (link.localModel === "ProductVariant") {
        const variant = await productVariantService.findOne({_id: link.localId, company: ctx.companyId}, ctx.opts);
        const product = nestedEntityToRef(variant?.product);
        if (!product) return null;
        return {product, variant: link.localId};
    }
    if (link.localModel === "Product") return {product: link.localId};
    return null;
}

async function importCategories(ctx: ImportCtx): Promise<OdooImportCounts> {
    const counts = emptyImportCounts();
    const rows = sortCategoriesParentsFirst(
        (await ctx.client.searchReadAll("product.category", [], ["id", "name", "parent_id", "sequence"]))
            .map(parseCategoryRow)
            .filter((row): row is NonNullable<typeof row> => row != null),
    );
    for (const row of rows) {
        const name = truncateOdooText(row.name, CATEGORY_NAME_MAX);
        const parentLink = row.parentId != null ? await cachedLink(ctx, "product.category", row.parentId) : null;
        const existing = await cachedLink(ctx, "product.category", row.id);
        const payload = {
            name,
            order: row.sequence,
            parent: parentLink?.localId,
        };
        const doc = existing
            ? await categoryService.updateByIdOrThrow(existing.localId, {$set: payload}, ctx.opts)
            : await categoryService.create({...payload, company: ctx.companyId}, ctx.opts);
        countRow(counts, importRowOutcome(!!existing));
        await writeLink(ctx, "product.category", row.id, "ProductCategory", doc._id);
    }
    return counts;
}

async function importAttributes(ctx: ImportCtx): Promise<void> {
    const attributes = await ctx.client.searchReadAll("product.attribute", [], ["id", "name"]);
    const values = await ctx.client.searchReadAll("product.attribute.value", [], ["id", "name", "attribute_id"]);
    const valuesByAttribute = new Map<number, string[]>();
    for (const value of values) {
        const attributeId = odooMany2oneId(value.attribute_id);
        const name = typeof value.name === "string" ? truncateOdooText(value.name, PRODUCT_ATTRIBUTE_VALUE_MAX) : "";
        if (attributeId == null || !name) continue;
        const list = valuesByAttribute.get(attributeId) ?? [];
        if (!list.includes(name)) list.push(name);
        valuesByAttribute.set(attributeId, list);
    }
    for (const row of attributes) {
        const id = odooIntegerId(row.id);
        const name = typeof row.name === "string" ? truncateOdooText(row.name, PRODUCT_ATTRIBUTE_NAME_MAX) : "";
        if (id == null || !name) continue;
        const existing = await cachedLink(ctx, "product.attribute", id);
        const payload = {
            name,
            values: (valuesByAttribute.get(id) ?? []).slice(0, PRODUCT_ATTRIBUTE_VALUES_MAX_ITEMS),
            isUsedForVariants: true,
        };
        const byName = existing
            ? null
            : await productAttributeService.findOne({company: ctx.companyId, name}, ctx.opts);
        const doc = existing
            ? await productAttributeService.updateByIdOrThrow(existing.localId, {$set: payload}, ctx.opts)
            : byName
                ? await productAttributeService.updateByIdOrThrow(byName._id, {$set: payload}, ctx.opts)
                : await productAttributeService.create({...payload, company: ctx.companyId}, ctx.opts);
        await writeLink(ctx, "product.attribute", id, "ProductAttribute", doc._id);
    }
}

async function importProducts(ctx: ImportCtx): Promise<OdooImportCounts> {
    const counts = emptyImportCounts();
    await importAttributes(ctx);
    const templates = await ctx.client.searchReadAll(
        "product.template",
        [],
        ["id", "name", "default_code", "barcode", "list_price", "standard_price", "categ_id", "type", "is_storable", "sale_ok", "active", "description_sale", "attribute_line_ids", "product_variant_count", "weight"],
    );
    const templateIds = templates.map((row) => odooIntegerId(row.id)).filter((id): id is number => id != null);
    const variants = templateIds.length
        ? await ctx.client.searchReadAll(
            "product.product",
            [["product_tmpl_id", "in", templateIds]],
            ["id", "product_tmpl_id", "default_code", "barcode", "lst_price", "standard_price", "weight", "active", "product_template_attribute_value_ids"],
        )
        : [];
    const ptavIds = [...new Set(variants.flatMap((row) => Array.isArray(row.product_template_attribute_value_ids) ? row.product_template_attribute_value_ids.filter((id): id is number => typeof id === "number") : []))];
    const ptavs = ptavIds.length
        ? await ctx.client.searchReadAll("product.template.attribute.value", [["id", "in", ptavIds]], ["id", "name", "attribute_id"])
        : [];
    const ptavById = new Map(ptavs.map((row) => [odooIntegerId(row.id), row]));
    const variantsByTemplate = new Map<number, Record<string, unknown>[]>();
    for (const variant of variants) {
        const templateId = odooMany2oneId(variant.product_tmpl_id);
        if (templateId == null) continue;
        const list = variantsByTemplate.get(templateId) ?? [];
        list.push(variant);
        variantsByTemplate.set(templateId, list);
    }

    for (const row of templates) {
        const id = odooIntegerId(row.id);
        const title = typeof row.name === "string" ? truncateOdooText(row.name, PRODUCT_TITLE_MAX) : "";
        if (id == null || !title) {
            counts.skipped += 1;
            continue;
        }
        const mapped = mapOdooProductType(row);
        const categoryOdooId = odooMany2oneId(row.categ_id);
        const categoryLink = categoryOdooId != null
            ? await cachedLink(ctx, "product.category", categoryOdooId)
            : null;
        const description = typeof row.description_sale === "string"
            ? truncateOdooText(row.description_sale, PRODUCT_DESCRIPTION_MAX)
            : undefined;
        const payload = {
            type: mapped.type,
            title,
            description,
            sku: typeof row.default_code === "string" ? truncateOdooText(row.default_code, PRODUCT_SKU_MAX) : undefined,
            barcode: typeof row.barcode === "string" ? truncateOdooText(row.barcode, PRODUCT_SKU_MAX) : undefined,
            price: odooNumber(row.list_price),
            costPrice: odooNumber(row.standard_price),
            weight: odooNumber(row.weight),
            status: row.active === false ? "archived" as const : "active" as const,
            trackInventory: mapped.trackInventory,
            availableForSale: row.sale_ok !== false,
            hasVariants: mapped.hasVariants,
            categories: categoryLink ? [categoryLink.localId] : undefined,
        };
        const existing = await cachedLink(ctx, "product.template", id);
        const product = existing
            ? await productService.updateByIdOrThrow(existing.localId, {$set: payload}, ctx.opts)
            : await productService.create({...payload, company: ctx.companyId}, ctx.opts);
        countRow(counts, importRowOutcome(!!existing));
        await writeLink(ctx, "product.template", id, "Product", product._id);

        const odooVariants = variantsByTemplate.get(id) ?? [];
        if (!mapped.hasVariants) {
            const simple = odooVariants[0];
            const simpleId = simple ? odooIntegerId(simple.id) : null;
            if (simpleId != null) await writeLink(ctx, "product.product", simpleId, "Product", product._id);
            continue;
        }
        let order = 0;
        for (const variant of odooVariants) {
            const variantId = odooIntegerId(variant.id);
            if (variantId == null) continue;
            const combination = [];
            const valueIds = Array.isArray(variant.product_template_attribute_value_ids) ? variant.product_template_attribute_value_ids : [];
            for (const valueId of valueIds) {
                if (typeof valueId !== "number") continue;
                const ptav = ptavById.get(valueId);
                const attributeOdooId = ptav ? odooMany2oneId(ptav.attribute_id) : null;
                const attributeLink = attributeOdooId != null ? await cachedLink(ctx, "product.attribute", attributeOdooId) : null;
                const valueName = ptav && typeof ptav.name === "string" ? truncateOdooText(ptav.name, PRODUCT_ATTRIBUTE_VALUE_MAX) : "";
                if (!attributeLink || !valueName) continue;
                combination.push({attribute: attributeLink.localId, value: valueName});
            }
            const existingVariant = await cachedLink(ctx, "product.product", variantId);
            const variantPayload = {
                product: product._id,
                sku: typeof variant.default_code === "string" ? truncateOdooText(variant.default_code, PRODUCT_VARIANT_SKU_MAX) : undefined,
                barcode: typeof variant.barcode === "string" ? truncateOdooText(variant.barcode, PRODUCT_VARIANT_BARCODE_MAX) : undefined,
                price: odooNumber(variant.lst_price),
                costPrice: odooNumber(variant.standard_price),
                weight: odooNumber(variant.weight),
                order: order++,
                status: variant.active === false ? "inactive" as const : "active" as const,
                trackInventory: mapped.trackInventory,
                attributeCombination: combination,
            };
            const saved = existingVariant
                ? await productVariantService.updateByIdOrThrow(existingVariant.localId, {$set: variantPayload}, ctx.opts)
                : await productVariantService.create({...variantPayload, company: ctx.companyId}, ctx.opts);
            await writeLink(ctx, "product.product", variantId, "ProductVariant", saved._id);
        }
    }
    return counts;
}

async function importWarehouses(ctx: ImportCtx): Promise<OdooImportCounts> {
    const counts = emptyImportCounts();
    const rows = await ctx.client.searchReadAll("stock.warehouse", [], ["id", "name", "code"]);
    for (const row of rows) {
        const id = odooIntegerId(row.id);
        const name = typeof row.name === "string" ? truncateOdooText(row.name, WAREHOUSE_NAME_MAX) : "";
        if (id == null || !name) {
            counts.skipped += 1;
            continue;
        }
        const rawCode = typeof row.code === "string" && row.code.trim() ? row.code : `WH${id}`;
        const payload = {
            name,
            code: truncateOdooText(rawCode, WAREHOUSE_CODE_MAX).toUpperCase(),
        };
        const existing = await cachedLink(ctx, "stock.warehouse", id);
        const byCode = existing
            ? null
            : await warehouseService.findOne({company: ctx.companyId, code: payload.code}, ctx.opts);
        const doc = existing
            ? await warehouseService.updateByIdOrThrow(existing.localId, {$set: payload}, ctx.opts)
            : byCode
                ? await warehouseService.updateByIdOrThrow(byCode._id, {$set: payload}, ctx.opts)
                : await warehouseService.create({...payload, company: ctx.companyId, isActive: true}, ctx.opts);
        countRow(counts, importRowOutcome(!!existing || !!byCode));
        await writeLink(ctx, "stock.warehouse", id, "Warehouse", doc._id);
    }
    return counts;
}

async function importInventory(ctx: ImportCtx): Promise<OdooImportCounts> {
    const counts = emptyImportCounts();
    const rows = await ctx.client.searchReadAll(
        "stock.quant",
        INTERNAL_QUANTS,
        ["id", "product_id", "quantity", "warehouse_id", "location_id"],
    );
    const parsed: {productId: number; warehouseId: number | null; locationId: number | null; quantity: number}[] = [];
    for (const row of rows) {
        const productId = odooMany2oneId(row.product_id);
        if (productId == null) {
            counts.skipped += 1;
            continue;
        }
        parsed.push({
            productId,
            warehouseId: odooMany2oneId(row.warehouse_id),
            locationId: odooMany2oneId(row.location_id),
            quantity: odooNumber(row.quantity) ?? 0,
        });
    }
    const unresolvedLocationIds = [...new Set(
        parsed
            .filter((row) => row.warehouseId == null && row.locationId != null)
            .map((row) => row.locationId as number),
    )];
    const [locations, warehouses] = await Promise.all([
        loadLocations(ctx, unresolvedLocationIds),
        loadWarehouseLocations(ctx),
    ]);
    const withWarehouse: {productId: number; warehouseId: number; quantity: number}[] = [];
    for (const row of parsed) {
        const warehouseId = row.warehouseId
            ?? (row.locationId != null ? locations.get(row.locationId)?.warehouseId ?? null : null)
            ?? (warehouses.length === 1 ? warehouses[0].id : null);
        if (warehouseId == null) {
            counts.skipped += 1;
            continue;
        }
        withWarehouse.push({productId: row.productId, warehouseId, quantity: row.quantity});
    }
    const totals = sumQuantQuantities(withWarehouse);
    for (const [key, quantity] of totals) {
        const [productOdooId, warehouseOdooId] = key.split("|").map(Number);
        const stock = await resolveStockRef(ctx, productOdooId);
        const warehouse = await cachedLink(ctx, "stock.warehouse", warehouseOdooId);
        if (!stock || !warehouse) {
            counts.skipped += 1;
            continue;
        }
        const filter = {
            product: stock.product,
            warehouse: warehouse.localId,
            variant: stock.variant ?? null,
            company: ctx.companyId,
        };
        const existing = await inventoryService.findOne(filter, ctx.opts);
        const onHand = Math.max(0, quantity);
        if (existing) {
            await inventoryService.updateByIdOrThrow(existing._id, {$set: {quantityOnHand: onHand}}, ctx.opts);
            counts.updated += 1;
        } else {
            await inventoryService.create({
                product: stock.product,
                variant: stock.variant,
                warehouse: warehouse.localId,
                quantityOnHand: onHand,
                company: ctx.companyId,
            }, ctx.opts);
            counts.created += 1;
        }
    }
    return counts;
}

async function loadWarehouseLocations(ctx: ImportCtx): Promise<OdooWarehouseLocation[]> {
    if (ctx.warehouseLocations) return ctx.warehouseLocations;
    const rows = await ctx.client.searchReadAll("stock.warehouse", [], ["id", "view_location_id", "lot_stock_id"]);
    const viewIds = [...new Set(rows.flatMap((row) => [odooMany2oneId(row.view_location_id), odooMany2oneId(row.lot_stock_id)].filter((id): id is number => id != null)))];
    const views = viewIds.length
        ? await ctx.client.searchReadAll("stock.location", [["id", "in", viewIds]], ["id", "parent_path"])
        : [];
    const pathById = new Map(views.flatMap((row) => {
        const id = odooIntegerId(row.id);
        if (id == null || typeof row.parent_path !== "string") return [];
        return [[id, row.parent_path]] as const;
    }));
    ctx.warehouseLocations = rows.flatMap((row) => {
        const id = odooIntegerId(row.id);
        if (id == null) return [];
        const viewId = odooMany2oneId(row.view_location_id);
        return [{
            id,
            viewId,
            lotId: odooMany2oneId(row.lot_stock_id),
            viewPath: viewId != null ? pathById.get(viewId) ?? "" : "",
        }];
    });
    return ctx.warehouseLocations;
}

async function loadLocations(ctx: ImportCtx, ids: number[]) {
    const uniqueIds = [...new Set(ids)];
    if (uniqueIds.length === 0) return new Map<number, {usage: string; warehouseId: number | null}>();
    const warehouses = await loadWarehouseLocations(ctx);
    const locations = new Map<number, {usage: string; warehouseId: number | null}>();
    for (let offset = 0; offset < uniqueIds.length; offset += ODOO_SEARCH_PAGE_SIZE) {
        const slice = uniqueIds.slice(offset, offset + ODOO_SEARCH_PAGE_SIZE);
        const rows = await ctx.client.searchReadAll("stock.location", [["id", "in", slice]], ["id", "usage", "warehouse_id", "parent_path"]);
        for (const row of rows) {
            const id = odooIntegerId(row.id);
            if (id == null) continue;
            const parentPath = typeof row.parent_path === "string" ? row.parent_path : "";
            locations.set(id, {
                usage: typeof row.usage === "string" ? row.usage : "",
                warehouseId: odooMany2oneId(row.warehouse_id) ?? warehouseIdForLocationPath(id, parentPath, warehouses),
            });
        }
    }
    return locations;
}

const STOCK_MOVE_FIELDS = ["id", "product_id", "product_qty", "product_uom_qty", "quantity", "location_id", "location_dest_id", "date"];

async function resolveStockRefs(ctx: ImportCtx, productOdooIds: number[]): Promise<Map<number, StockRef>> {
    const result = new Map<number, StockRef>();
    const uncached: number[] = [];
    const cachedVariants: {odooId: number; localId: ObjectId}[] = [];
    for (const id of [...new Set(productOdooIds)]) {
        const cached = ctx.links.get(linkKey("product.product", id));
        if (!cached) {
            uncached.push(id);
            continue;
        }
        if (cached.localModel === "Product") {
            result.set(id, {product: cached.localId});
            continue;
        }
        if (cached.localModel === "ProductVariant") cachedVariants.push({odooId: id, localId: cached.localId});
    }
    const links = await findOdooLinks(ctx.companyId, "product.product", uncached, ctx.opts);
    const variantIds = [
        ...cachedVariants.map((row) => row.localId),
        ...links.filter((link) => link.localModel === "ProductVariant").map((link) => link.localId),
    ];
    const variants = variantIds.length
        ? await productVariantService.find({_id: {$in: variantIds}, company: ctx.companyId}, ctx.opts)
        : [];
    const variantById = new Map(variants.map((variant) => [String(variant._id), variant]));
    const putVariant = (odooId: number, localId: ObjectId) => {
        const variant = variantById.get(String(localId));
        const product = nestedEntityToRef(variant?.product);
        if (product) result.set(odooId, {product, variant: localId});
    };
    for (const row of cachedVariants) putVariant(row.odooId, row.localId);
    for (const link of links) {
        ctx.links.set(linkKey("product.product", link.odooId), {localModel: link.localModel, localId: link.localId});
        if (link.localModel === "Product") result.set(link.odooId, {product: link.localId});
        else if (link.localModel === "ProductVariant") putVariant(link.odooId, link.localId);
    }
    return result;
}

function stockBalanceKey(product: ObjectId, variant: ObjectId | undefined, warehouse: ObjectId): string {
    return `${product.toString()}|${variant?.toString() ?? ""}|${warehouse.toString()}`;
}

async function loadInventoryIds(ctx: ImportCtx): Promise<Map<string, ObjectId>> {
    const rows = await inventoryService.find({company: ctx.companyId}, ctx.opts);
    const ids = new Map<string, ObjectId>();
    for (const row of rows) {
        const product = nestedEntityToRef(row.product);
        const warehouse = nestedEntityToRef(row.warehouse);
        if (!product || !warehouse) continue;
        ids.set(stockBalanceKey(product, nestedEntityToRef(row.variant), warehouse), row._id);
    }
    return ids;
}

async function importStockChanges(ctx: ImportCtx): Promise<OdooImportCounts> {
    const counts = emptyImportCounts();
    const moves = sortMovesChronologically(
        await ctx.client.searchReadAll("stock.move", DONE_MOVES, STOCK_MOVE_FIELDS),
    );
    const moveIds = moves.map((row) => odooIntegerId(row.id)).filter((id): id is number => id != null);
    const existingByOdooId = new Map(
        (await findOdooLinks(ctx.companyId, "stock.move", moveIds, ctx.opts)).map((link) => [link.odooId, link.localId]),
    );
    const locationIds = moves.flatMap((row) => [odooMany2oneId(row.location_id), odooMany2oneId(row.location_dest_id)].filter((id): id is number => id != null));
    const locations = await loadLocations(ctx, locationIds);
    const stocks = await resolveStockRefs(
        ctx,
        moves.flatMap((row) => {
            const id = odooMany2oneId(row.product_id);
            return id == null ? [] : [id];
        }),
    );
    const prepared: {
        odooId: number;
        stock: StockRef;
        warehouseId: ObjectId;
        reason: ReturnType<typeof mapMoveReason>;
        qty: number;
        occurred?: Date;
    }[] = [];
    for (const row of moves) {
        const id = odooIntegerId(row.id);
        const productOdooId = odooMany2oneId(row.product_id);
        const sourceId = odooMany2oneId(row.location_id);
        const destId = odooMany2oneId(row.location_dest_id);
        const qty = Math.abs(odooNumber(row.quantity) ?? odooNumber(row.product_qty) ?? odooNumber(row.product_uom_qty) ?? 0);
        if (id == null || productOdooId == null || sourceId == null || destId == null || qty === 0) {
            counts.skipped += 1;
            continue;
        }
        const stock = stocks.get(productOdooId);
        const source = locations.get(sourceId);
        const dest = locations.get(destId);
        const warehouseOdooId = dest?.usage === "internal" ? dest.warehouseId : source?.warehouseId;
        const warehouse = warehouseOdooId != null ? await cachedLink(ctx, "stock.warehouse", warehouseOdooId) : null;
        if (!stock || !warehouse) {
            counts.skipped += 1;
            continue;
        }
        const occurredAt = typeof row.date === "string" ? new Date(row.date) : undefined;
        prepared.push({
            odooId: id,
            stock,
            warehouseId: warehouse.localId,
            reason: mapMoveReason(source?.usage ?? "", dest?.usage ?? ""),
            qty,
            occurred: occurredAt && !Number.isNaN(occurredAt.getTime()) ? occurredAt : undefined,
        });
    }
    const onHand = new Map<string, number>();
    const inventoryIds = await loadInventoryIds(ctx);
    const creates: Parameters<typeof inventoryMovementService.create>[0][] = [];
    const createMoveIds: number[] = [];
    const updates: {id: ObjectId; fields: Record<string, unknown>}[] = [];
    for (const row of prepared) {
        const key = stockBalanceKey(row.stock.product, row.stock.variant, row.warehouseId);
        const quantities = movementQuantities(row.reason, row.qty, onHand.get(key) ?? 0);
        onHand.set(key, quantities.quantityAfter);
        const inventory = inventoryIds.get(key);
        const existingId = existingByOdooId.get(row.odooId);
        if (existingId) {
            updates.push({
                id: existingId,
                fields: {
                    ...(inventory ? {inventory} : {}),
                    product: row.stock.product,
                    variant: row.stock.variant,
                    warehouse: row.warehouseId,
                    reason: row.reason,
                    ...quantities,
                    occurredAt: row.occurred,
                    updatedAt: new Date(),
                },
            });
            continue;
        }
        creates.push({
            ...(inventory ? {inventory} : {}),
            product: row.stock.product,
            variant: row.stock.variant,
            warehouse: row.warehouseId,
            reason: row.reason,
            ...quantities,
            occurredAt: row.occurred,
            referenceType: "odoo.stock.move",
            company: ctx.companyId,
        });
        createMoveIds.push(row.odooId);
    }
    for (let offset = 0; offset < creates.length; offset += ODOO_SEARCH_PAGE_SIZE) {
        const slice = creates.slice(offset, offset + ODOO_SEARCH_PAGE_SIZE);
        const ids = createMoveIds.slice(offset, offset + ODOO_SEARCH_PAGE_SIZE);
        const created = await inventoryMovementService.createMany(slice, ctx.opts);
        await rememberOdooLinks(
            ctx.companyId,
            created.map((movement, index) => ({
                odooModel: "stock.move",
                odooId: ids[index],
                localModel: "InventoryMovement",
                localId: movement._id,
            })),
            ctx.opts,
        );
        counts.created += created.length;
    }
    for (let offset = 0; offset < updates.length; offset += ODOO_SEARCH_PAGE_SIZE) {
        const slice = updates.slice(offset, offset + ODOO_SEARCH_PAGE_SIZE);
        await InventoryMovement.bulkWrite(
            slice.map((row) => ({
                updateOne: {filter: {_id: row.id}, update: {$set: row.fields}},
            })),
            {ordered: false},
        );
        counts.updated += slice.length;
    }
    return counts;
}

async function importActions(ctx: ImportCtx): Promise<OdooImportCounts> {
    const counts = emptyImportCounts();
    const pickings = await ctx.client.searchReadAll("stock.picking", INTERNAL_PICKINGS, ["id", "name", "location_id", "location_dest_id", "move_ids", "date_done"]);
    const locationIds = [...new Set(pickings.flatMap((row) => [odooMany2oneId(row.location_id), odooMany2oneId(row.location_dest_id)].filter((id): id is number => id != null)))];
    const locations = await loadLocations(ctx, locationIds);
    const moveIds = [...new Set(pickings.flatMap((row) => Array.isArray(row.move_ids) ? row.move_ids.filter((id): id is number => typeof id === "number") : []))];
    const moves = moveIds.length
        ? await ctx.client.searchReadAll("stock.move", [["id", "in", moveIds], ["state", "=", "done"]], ["id", "product_id", "product_qty", "product_uom_qty", "quantity"])
        : [];
    const movesById = new Map(moves.map((row) => [odooIntegerId(row.id), row]));
    for (const row of pickings) {
        const id = odooIntegerId(row.id);
        if (id == null) {
            counts.skipped += 1;
            continue;
        }
        const existing = await cachedLink(ctx, "stock.picking", id);
        if (existing) {
            counts.skipped += 1;
            continue;
        }
        const sourceWh = locations.get(odooMany2oneId(row.location_id) ?? 0)?.warehouseId;
        const destWh = locations.get(odooMany2oneId(row.location_dest_id) ?? 0)?.warehouseId;
        const fromWarehouse = sourceWh != null ? await cachedLink(ctx, "stock.warehouse", sourceWh) : null;
        const toWarehouse = destWh != null ? await cachedLink(ctx, "stock.warehouse", destWh) : null;
        if (!fromWarehouse || !toWarehouse || fromWarehouse.localId.equals(toWarehouse.localId)) {
            counts.skipped += 1;
            continue;
        }
        const lines: {product: ObjectId; variant?: ObjectId; quantity: number}[] = [];
        const lineIds = Array.isArray(row.move_ids) ? row.move_ids : [];
        for (const moveId of lineIds) {
            if (typeof moveId !== "number") continue;
            const move = movesById.get(moveId);
            const productOdooId = move ? odooMany2oneId(move.product_id) : null;
            const qty = Math.abs(odooNumber(move?.quantity) ?? odooNumber(move?.product_qty) ?? odooNumber(move?.product_uom_qty) ?? 0);
            if (productOdooId == null || qty < 0.0001) continue;
            const stock = await resolveStockRef(ctx, productOdooId);
            if (!stock) continue;
            const already = lines.find((line) => line.product.equals(stock.product) && String(line.variant ?? "") === String(stock.variant ?? ""));
            if (already) {
                already.quantity += qty;
                continue;
            }
            lines.push({product: stock.product, variant: stock.variant, quantity: qty});
        }
        if (lines.length === 0) {
            counts.skipped += 1;
            continue;
        }
        const doneAt = typeof row.date_done === "string" ? new Date(row.date_done) : new Date();
        const transfer = await stockTransferService.create({
            fromWarehouse: fromWarehouse.localId,
            toWarehouse: toWarehouse.localId,
            lines,
            status: "done",
            note: typeof row.name === "string" ? truncateOdooText(row.name, STOCK_TRANSFER_NOTE_MAX) : undefined,
            doneAt: Number.isNaN(doneAt.getTime()) ? new Date() : doneAt,
            doneBy: new ObjectId(ctx.params.actionUserCtx.userId),
            company: ctx.companyId,
        }, ctx.opts);
        await writeLink(ctx, "stock.picking", id, "StockTransfer", transfer._id);
        counts.created += 1;
    }
    return counts;
}

async function importUsers(ctx: ImportCtx): Promise<OdooImportCounts> {
    const counts = emptyImportCounts();
    const signupRole = await roleService.findOne(
        {company: ctx.companyId, isSignupDefault: true},
        ctx.opts,
    );
    if (!signupRole) {
        throw apiValidationException("odoo_signup_role_missing", "", null, ctx.languageCode);
    }
    const companyRoleData = {
        active: "invited" as const,
        unsuccessfulLogins: 0,
        lockedOutUntil: null,
        lastLogin: null,
        rolesCount: 1,
        roles: [signupRole._id],
        company: ctx.companyId,
    };
    const rows = await ctx.client.searchReadAll("res.users", INTERNAL_USERS, ["id", "name", "login", "email", "share", "active"]);
    for (const row of rows) {
        const id = odooIntegerId(row.id);
        if (id == null || !isInternalOdooUser(row)) {
            counts.skipped += 1;
            continue;
        }
        const email = odooUserEmail(row);
        if (!email) {
            counts.skipped += 1;
            continue;
        }
        const names = splitOdooUserName(typeof row.name === "string" ? row.name : email);
        const existingLink = await cachedLink(ctx, "res.users", id);
        const existingUser = await userService.findOne({username: email}, ctx.opts);
        if (existingUser && await existingUser.hasAtLeastOneRole(ctx.companyId)) {
            await userService.updateByIdOrThrow(existingUser._id, {
                $set: {name: names.name, surname: names.surname, fullName: `${names.name} ${names.surname}`},
            }, ctx.opts);
            await writeLink(ctx, "res.users", id, "User", existingUser._id);
            countRow(counts, importRowOutcome(!!existingLink));
            continue;
        }
        if (existingUser) {
            await userService.updateByIdOrThrow(existingUser._id, {
                $addToSet: {companies: ctx.companyId},
                $push: {roles: companyRoleData},
                $set: {name: names.name, surname: names.surname, fullName: `${names.name} ${names.surname}`},
            }, ctx.opts);
            await ensureAiChannel({
                userId: existingUser._id,
                companyId: ctx.companyId,
                session: ctx.opts.session ?? null,
                logger: ctx.opts.logger,
                languageCode: ctx.languageCode,
                auditUserId: ctx.opts.auditUserId,
            });
            await writeLink(ctx, "res.users", id, "User", existingUser._id);
            counts.created += 1;
            continue;
        }
        const created = await userService.create({
            username: email,
            password: generateRandomString(64),
            mfaSecret: "",
            registeredFrom: ctx.params.userInfo._id,
            online: false,
            name: names.name,
            surname: names.surname,
            fullName: `${names.name} ${names.surname}`,
            timezone: DEFAULT_NEW_USER_TIMEZONE,
            birthday: new Date(),
            phoneNumber: "",
            companies: [ctx.companyId],
            roles: [companyRoleData],
            isEmailVerified: false,
            "requests.invitation": {
                invitedBy: ctx.params.userInfo._id,
                invitedAt: Date.now(),
                company: ctx.companyId,
                welcomeMessage: "",
            },
        }, ctx.opts);
        await writeLink(ctx, "res.users", id, "User", created._id);
        counts.created += 1;
    }
    return counts;
}

export async function runOdooImport(params: AuthenticatedMWType & OdooImportFormType): Promise<OdooImportResponse> {
    const selected = selectedDatasets(params);
    if (selected.length === 0) {
        throw apiValidationException("odoo_import_empty_selection", "", null, params.languageCode);
    }
    const opts: CrudOptions = {logger: params.logger, languageCode: params.languageCode, auditUserId: params.actionUserCtx.userId};
    const connection = await odooConnectionService.findOne({company: params.company._id}, opts);
    if (!connection?.apiKeyEncrypted) {
        throw apiValidationException("odoo_connection_missing", "", null, params.languageCode);
    }

    const permissionChecks: Record<OdooImportDataset, Model<Document>> = {
        categories: ProductCategory,
        products: Product,
        warehouses: Warehouse,
        inventory: Inventory,
        stockChanges: Inventory,
        actions: StockTransfer,
        users: User,
    };
    for (const dataset of selected) {
        assertCanCreate(permissionChecks[dataset], params);
    }
    if (params.dryRun !== true) {
        assertCanCreate(OdooLink, params);
        if (selected.includes("products")) assertCanCreate(ProductAttribute, params);
    }

    const client = createOdooJsonRpcClient({
        url: connection.url,
        database: connection.database,
        username: connection.username,
        apiKey: DecryptString(connection.apiKeyEncrypted),
        languageCode: params.languageCode,
    });
    await client.authenticate();

    const response: OdooImportResponse = {dryRun: params.dryRun === true};
    if (response.dryRun) {
        const countFor: Record<OdooImportDataset, () => Promise<number>> = {
            categories: () => client.searchCount("product.category"),
            products: () => client.searchCount("product.template"),
            warehouses: () => client.searchCount("stock.warehouse"),
            inventory: () => client.searchCount("stock.quant", INTERNAL_QUANTS),
            stockChanges: () => client.searchCount("stock.move", DONE_MOVES),
            actions: () => client.searchCount("stock.picking", INTERNAL_PICKINGS),
            users: () => client.searchCount("res.users", INTERNAL_USERS),
        };
        for (const dataset of selected) {
            response[dataset] = {created: 0, updated: 0, skipped: await countFor[dataset]()};
        }
        return response;
    }

    const ctx: ImportCtx = {
        client,
        companyId: params.company._id,
        languageCode: params.languageCode,
        opts,
        params,
        links: new Map(),
    };
    const writers: Record<OdooImportDataset, (ctx: ImportCtx) => Promise<OdooImportCounts>> = {
        categories: importCategories,
        products: importProducts,
        warehouses: importWarehouses,
        inventory: importInventory,
        stockChanges: importStockChanges,
        actions: importActions,
        users: importUsers,
    };
    for (const dataset of selected) {
        response[dataset] = await writers[dataset](ctx);
    }
    return response;
}
