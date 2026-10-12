/**
 * `search_products` + `search_inventory` — AI-assistant tools for the shop
 * catalogue and what is actually on the shelf.
 *
 * Answers "what do we sell under 50 euro?", "which products are out of stock?",
 * "what needs reordering?", "how many of SKU X are left in the main warehouse?".
 *
 * The two are separate because they answer different questions from different
 * collections: a Product is what the catalogue offers, an Inventory row is one
 * product/variant's stock in one warehouse. "Do we sell it" and "have we got
 * any" are not the same question, and a single tool would force the model to
 * guess which one was meant.
 *
 * SECURITY: arguments are untrusted LLM output — re-validated with Zod, free
 * text regex-escaped, and every query hard-scoped to `ctx.companyId` with
 * soft-deleted rows excluded.
 *
 * @module catalogTools
 */

import {z} from "zod";
import {registerAssistantTool} from "@coreModule/domain/ai/tools/toolRegistry";
import type {AssistantTool, AssistantToolContext} from "@coreModule/domain/ai/tools/assistantTool.types";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";
import {inventoryService} from "@eCommerceModule/database/schemas/inventory/inventory.service";
import {warehouseService} from "@eCommerceModule/database/schemas/warehouse/warehouse.service";
// Imported for its side effect of registering the model, not for the value:
// `search_inventory` populates `variant`, and the assistant runs in its own
// process (xServers/assistantServer) which does NOT load every route file the
// way the API server does. Without this, mongoose throws "Schema hasn't been
// registered for model 'ProductVariant'" the moment a populated row comes back.
// Any populate target a tool reaches must be imported somewhere in its chain.
import "@eCommerceModule/database/schemas/productVariant/productVariant";
import type {ProductStatus, ProductType} from "@eCommerceModule/database/schemas/product/product";
import {
    DEFAULT_RESULTS,
    companyScope,
    emptyResult,
    enumValues,
    findOptions,
    limitArg,
    limitParameter,
    listResult,
    numberRange,
    regexClause,
    shortText,
    toNumber
} from "@coreModule/domain/ai/tools/assistantToolKit";
import {accessDenied, requirePermission} from "@coreModule/domain/ai/tools/assistantToolAccess";

const PRODUCT_STATUS_VALUES = enumValues<ProductStatus>({draft: true, active: true, archived: true});
const PRODUCT_TYPE_VALUES = enumValues<ProductType>({
    physical: true,
    digital: true,
    service: true,
    variable: true,
    bundle: true,
    gift_card: true
});

/** Sort orders the model may request, mapped to real Mongo sorts. */
const PRODUCT_SORTS: Record<string, Record<string, 1 | -1>> = {
    price_asc: {price: 1},
    price_desc: {price: -1},
    newest: {createdAt: -1},
    best_rated: {ratingAverage: -1},
    title: {title: 1}
};
const PRODUCT_SORT_VALUES = Object.keys(PRODUCT_SORTS);

// ── search_products ──────────────────────────────────────────────────────────

const SearchProductsArgs = z
    .object({
        search: z.string().trim().min(1).optional(),
        sku: z.string().trim().min(1).optional(),
        status: z.enum(PRODUCT_STATUS_VALUES as [string, ...string[]]).optional(),
        type: z.enum(PRODUCT_TYPE_VALUES as [string, ...string[]]).optional(),
        brand: z.string().trim().min(1).optional(),
        tag: z.string().trim().min(1).optional(),
        minPrice: z.coerce.number().nonnegative().optional(),
        maxPrice: z.coerce.number().nonnegative().optional(),
        featuredOnly: z.coerce.boolean().optional(),
        onSaleOnly: z.coerce.boolean().optional(),
        availableOnly: z.coerce.boolean().optional(),
        sortBy: z.enum(PRODUCT_SORT_VALUES as [string, ...string[]]).optional(),
        limit: limitArg
    })
    .strip();

const productParameters = {
    type: "object" as const,
    properties: {
        search: {type: "string", description: "Free text matched against the product title, SKU, slug or short description."},
        sku: {type: "string", description: "Match products whose SKU contains this text."},
        status: {
            type: "string",
            enum: PRODUCT_STATUS_VALUES,
            description: "Catalogue status: draft, active (on sale), or archived."
        },
        type: {
            type: "string",
            enum: PRODUCT_TYPE_VALUES,
            description: "Product type: physical, digital, service, variable, bundle, or gift_card."
        },
        brand: {type: "string", description: "Only products of this brand."},
        tag: {type: "string", description: "Only products carrying this tag."},
        minPrice: {type: "number", description: "Minimum price in the product's own currency."},
        maxPrice: {type: "number", description: "Maximum price in the product's own currency."},
        featuredOnly: {type: "boolean", description: "true = only products flagged as featured."},
        onSaleOnly: {type: "boolean", description: "true = only products whose price is below their compare-at price."},
        availableOnly: {type: "boolean", description: "true = only products currently available for sale."},
        sortBy: {
            type: "string",
            enum: PRODUCT_SORT_VALUES,
            description: "Result order (default title). Use price_desc for \"most expensive\", best_rated for \"top rated\"."
        },
        limit: limitParameter
    },
    required: [] as string[]
};

async function executeProducts(rawArgs: unknown, ctx: AssistantToolContext): Promise<unknown> {
    // The assistant shows only what the panel would: the same read permission
    const access = await requirePermission(ctx, "products[read:title]");
    if (!access.allowed) return accessDenied("the product catalog");

    const args = SearchProductsArgs.parse(rawArgs ?? {});

    // Hard company scope — the only scope the tool is allowed to read.
    const query: Record<string, unknown> = companyScope(ctx);

    if (args.search != null) {
        const rx = regexClause(args.search);
        query.$or = [{title: rx}, {sku: rx}, {slug: rx}, {shortDescription: rx}, {brand: rx}];
    }
    if (args.sku != null) query.sku = regexClause(args.sku);
    if (args.status) query.status = args.status;
    if (args.type) query.type = args.type;
    if (args.brand != null) query.brand = regexClause(args.brand);
    // `tags` is an array of strings; equality on an array field matches any element.
    if (args.tag != null) query.tags = regexClause(args.tag);
    if (args.featuredOnly === true) query.featured = true;
    if (args.availableOnly === true) query.availableForSale = true;

    const price = numberRange(args.minPrice, args.maxPrice);
    if (price) query.price = price;

    // "On sale" is a comparison between two fields, which a plain filter cannot
    // express — $expr evaluates them against each other per document.
    if (args.onSaleOnly === true) {
        query.$expr = {
            $and: [
                {$ne: ["$compareAtPrice", null]},
                {$gt: ["$compareAtPrice", "$price"]}
            ]
        };
    }

    const limit = args.limit ?? DEFAULT_RESULTS;
    const sort = PRODUCT_SORTS[args.sortBy ?? "title"];

    const products = await productService.find(
        query,
        findOptions(ctx),
        [{path: "currency", select: "symbol abbreviation name"}],
        "title sku slug status type brand price compareAtPrice currency featured availableForSale " +
            "hasVariants ratingAverage ratingCount reviewCount tags shortDescription trackInventory " +
            "lowStockThreshold publishedAt",
        sort,
        limit
    );

    const results = products.map((p: any) => ({
        id: p._id?.toString(),
        title: p.title ?? null,
        sku: p.sku ?? null,
        status: p.status ?? null,
        type: p.type ?? null,
        brand: p.brand ?? null,
        price: toNumber(p.price),
        compareAtPrice: toNumber(p.compareAtPrice),
        onSale: p.compareAtPrice != null && p.compareAtPrice > p.price,
        currency: p.currency?.abbreviation || p.currency?.symbol || null,
        featured: p.featured ?? false,
        availableForSale: p.availableForSale ?? false,
        hasVariants: p.hasVariants ?? false,
        rating: p.ratingAverage ?? null,
        reviewCount: p.reviewCount ?? p.ratingCount ?? 0,
        tags: Array.isArray(p.tags) ? p.tags.slice(0, 10) : [],
        description: shortText(p.shortDescription, 200),
        // Stock lives in the Inventory collection, not here — say so rather than
        // let the model infer availability from `availableForSale` alone.
        stockNote: p.trackInventory ? "Use search_inventory for stock levels." : "Stock not tracked."
    }));

    return listResult(productService, query, results, ctx);
}

export const searchProductsTool: AssistantTool = {
    name: "search_products",
    description:
        "Search the online shop's product catalogue by free text, SKU, status " +
        "(draft, active, archived), product type, brand, tag, price range, or " +
        "flags for featured/on-sale/available. Returns each product's title, SKU, " +
        "price, compare-at price, rating and tags, plus `total` — the true number " +
        "of matching products, which is what you must quote when asked how many. " +
        "This is the CATALOGUE: for stock quantities use search_inventory, and for " +
        "what customers have bought use search_product_orders.",
    parameters: productParameters,
    execute: executeProducts
};

// ── search_inventory ─────────────────────────────────────────────────────────

const SearchInventoryArgs = z
    .object({
        productSearch: z.string().trim().min(1).optional(),
        warehouseName: z.string().trim().min(1).optional(),
        lowStockOnly: z.coerce.boolean().optional(),
        outOfStockOnly: z.coerce.boolean().optional(),
        maxQuantity: z.coerce.number().int().nonnegative().optional(),
        limit: limitArg
    })
    .strip();

const inventoryParameters = {
    type: "object" as const,
    properties: {
        productSearch: {type: "string", description: "Only stock for products whose title or SKU matches this."},
        warehouseName: {type: "string", description: "Only stock held in the warehouse whose name or code matches this."},
        lowStockOnly: {
            type: "boolean",
            description: "true = only rows at or below their reorder point. Prefer this for \"what needs reordering\"."
        },
        outOfStockOnly: {type: "boolean", description: "true = only rows with nothing on hand."},
        maxQuantity: {type: "integer", description: "Only rows with at most this quantity on hand."},
        limit: limitParameter
    },
    required: [] as string[]
};

async function executeInventory(rawArgs: unknown, ctx: AssistantToolContext): Promise<unknown> {
    // The assistant shows only what the panel would: the same read permission
    const access = await requirePermission(ctx, "inventories[read:quantityOnHand]");
    if (!access.allowed) return accessDenied("stock levels");

    const args = SearchInventoryArgs.parse(rawArgs ?? {});

    // Hard company scope — the only scope the tool is allowed to read.
    const query: Record<string, unknown> = companyScope(ctx);

    if (args.productSearch != null) {
        const rx = regexClause(args.productSearch);
        const products = await productService.find(
            {...companyScope(ctx), $or: [{title: rx}, {sku: rx}]},
            findOptions(ctx),
            undefined,
            "_id",
            undefined,
            50
        );
        const productIds = products.map((p: any) => p._id).filter(Boolean);
        if (productIds.length === 0) {
            return emptyResult(`No product matching "${args.productSearch}" in this company.`);
        }
        query.product = {$in: productIds};
    }

    if (args.warehouseName != null) {
        const rx = regexClause(args.warehouseName);
        const warehouses = await warehouseService.find(
            {...companyScope(ctx), $or: [{name: rx}, {code: rx}]},
            findOptions(ctx),
            undefined,
            "_id",
            undefined,
            25
        );
        const warehouseIds = warehouses.map((w: any) => w._id).filter(Boolean);
        if (warehouseIds.length === 0) {
            return emptyResult(`No warehouse matching "${args.warehouseName}" in this company.`);
        }
        query.warehouse = {$in: warehouseIds};
    }

    if (args.outOfStockOnly === true) {
        query.quantityOnHand = {$lte: 0};
    } else if (args.maxQuantity != null) {
        query.quantityOnHand = {$lte: args.maxQuantity};
    }

    // Low stock compares two fields on the same document, so it needs $expr.
    if (args.lowStockOnly === true) {
        query.$expr = {
            $and: [
                {$ne: ["$reorderPoint", null]},
                {$lte: ["$quantityOnHand", "$reorderPoint"]}
            ]
        };
    }

    const limit = args.limit ?? DEFAULT_RESULTS;

    const rows = await inventoryService.find(
        query,
        findOptions(ctx),
        [
            {path: "product", select: "title sku"},
            {path: "variant", select: "sku attributeCombination"},
            {path: "warehouse", select: "name code"}
        ],
        "product variant warehouse quantityOnHand quantityReserved reorderPoint reorderQuantity",
        {quantityOnHand: 1},
        limit
    );

    const results = rows.map((r: any) => {
        const onHand = r.quantityOnHand ?? 0;
        const reserved = r.quantityReserved ?? 0;
        return {
            id: r._id?.toString(),
            product: r.product?.title ?? null,
            sku: r.variant?.sku ?? r.product?.sku ?? null,
            warehouse: r.warehouse?.name ?? r.warehouse?.code ?? null,
            quantityOnHand: onHand,
            quantityReserved: reserved,
            // What can actually be sold right now: reserved units are already
            // promised to open orders.
            quantityAvailable: onHand - reserved,
            reorderPoint: r.reorderPoint ?? null,
            reorderQuantity: r.reorderQuantity ?? null,
            needsReorder: r.reorderPoint != null && onHand <= r.reorderPoint,
            outOfStock: onHand <= 0
        };
    });

    return listResult(
        inventoryService,
        query,
        results,
        ctx,
        "quantityAvailable is on-hand minus units already reserved for open orders."
    );
}

export const searchInventoryTool: AssistantTool = {
    name: "search_inventory",
    description:
        "Check stock levels per product/variant per warehouse. Filter by product " +
        "title or SKU, warehouse, `lowStockOnly` (at or below reorder point), " +
        "`outOfStockOnly`, or a maximum quantity. Returns quantity on hand, " +
        "quantity reserved for open orders, the sellable quantity available, and " +
        "the reorder point, plus `total` — the true number of matching stock rows. " +
        "Use this for \"what is running out\", \"what needs reordering\", \"how " +
        "many do we have left\", or \"is X in stock\".",
    parameters: inventoryParameters,
    execute: executeInventory
};

/** Registered by the core tool bootstrap (registerAllAssistantTools). */
export function registerCatalogAssistantTools(): void {
    registerAssistantTool(searchProductsTool);
    registerAssistantTool(searchInventoryTool);
}
