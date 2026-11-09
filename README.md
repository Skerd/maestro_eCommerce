# eCommerce Module (Maestro)

Server-side implementation of the Arpeggio eCommerce domain: product commerce and the services marketplace. Mongoose models, business services, HTTP routes, cron jobs, and DTO mappers.

Contracts (types, schema-defs, validators) live in **armonia** at `armonia/src/modules/eCommerce/`. This module implements the runtime layer.

Enable via `ENABLED_MODULES=eCommerce` (or leave unset to load all present modules).

## Directory layout

```
eCommerce/
├── api/eCommerce/private/              # Product commerce routes
├── api/eCommerceMarketplace/private/   # Marketplace routes (stable /api/eCommerceMarketplace/*)
├── database/
│   ├── moduleBootstrap.ts             # Model registry for initializer
│   └── schemas/<resource>/            # Mongoose models (catalog + marketplace)
└── utilities/
    ├── mappers/                       # Document → DTO / select mappers
    ├── services/                      # Domain services (slug generation, checkout, …)
    └── cron/                          # Module-specific cron handlers
```

## API routes

Routes are discovered from `api/eCommerce/` and `api/eCommerceMarketplace/`. Each file exports `basePath` and `router`. Marketplace HTTP paths stay under `/api/eCommerceMarketplace/*`.

| Route file | Base path (typical) | Description |
|------------|---------------------|-------------|
| `product.ts` | `/api/eCommerce/product` | Catalog products |
| `productVariant.ts` | `/api/eCommerce/productVariant` | Product variants |
| `productAttribute.ts` | `/api/eCommerce/productAttribute` | Configurable attributes |
| `category.ts` | `/api/eCommerce/category` | Categories |
| `collection.ts` | `/api/eCommerce/collection` | Merchandising collections |
| `inventory.ts` | `/api/eCommerce/inventory` | Stock levels |
| `warehouse.ts` | `/api/eCommerce/warehouse` | Warehouses |
| `cart.ts` | `/api/eCommerce/cart` | Shopping carts |
| `checkout.ts` | `/api/eCommerce/checkout` | Checkout flow |
| `productOrder.ts` | `/api/eCommerce/productOrder` | Orders |
| `fulfillment.ts` | `/api/eCommerce/fulfillment` | Fulfillment |
| `pricingRule.ts` | `/api/eCommerce/pricingRule` | Pricing rules |
| `discount.ts` | `/api/eCommerce/discount` | Discounts |
| `taxZone.ts` | `/api/eCommerce/taxZone` | Tax zones |
| `shippingZone.ts` | `/api/eCommerce/shippingZone` | Shipping zones |
| `customerGroup.ts` | `/api/eCommerce/customerGroup` | Customer groups |
| `customerAddress.ts` | `/api/eCommerce/customerAddress` | Customer addresses |
| `returnRequest.ts` | `/api/eCommerce/returnRequest` | Returns |
| `cmsBlock.ts` | `/api/eCommerce/cmsBlock` | CMS blocks |
| `savedSearch.ts` | `/api/eCommerce/savedSearch` | Saved searches |
| `analytics.ts` | `/api/eCommerce/analytics` | Analytics |

## Database schemas

Registered in `database/moduleBootstrap.ts` for index sync and test teardown. Additional schemas (product, cart, checkout, etc.) are loaded via side-effect imports in route/service files.

Each schema folder follows the core pattern:

- `*.ts` — Mongoose model validated against armonia `*SchemaDef`
- `*.service.ts` — `BaseCrudService` subclass
- `*.indexes.ts`, `*.snippets.ts`, `*.views.ts`

## Implementation pattern

```ts
// Route: imports validators + schema-def from armonia, model/service from @eCommerceModule
import {createProductFormSchema} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/createProduct.form.validator";
import {ProductSchemaDef} from "armonia/src/modules/eCommerce/api/eCommerce/private/product/product.schema-def";
import Product from "@eCommerceModule/database/schemas/product/product";
import {productService} from "@eCommerceModule/database/schemas/product/product.service";

export const {router} = createCrudRouter({
    collectionName: "products",
    model: Product,
    service: productService,
    createSchema: createProductFormSchema,
    // …
});
```

## Cron handlers

Registered in `utilities/cron/registerHandlers.ts`; every run is company-scoped. Each company gets its job rows from
the cron server's boot seed (`CRON_SEED_PLATFORM_JOBS=true`, which every solfeggio deploy sets): it adds only the rows a
company is missing, so a handler added here reaches existing companies on the next deploy (TD-B77).

| Code | Schedule | What it does |
|------|----------|--------------|
| `eCommerce.lowStockAlert` | hourly | Alerts staff about stock at or under its reorder point; clears the flag when stock recovers |
| `eCommerce.scheduledPublish` | every 5 min | Publishes scheduled products whose time has come (unpriced ones stay in draft) |
| `eCommerce.checkoutExpiry` | hourly at :15 | Settles checkouts past `expiresAt`: one whose gateway charge already succeeded is placed as an order, the rest expire |
| `eCommerce.abandonedCart` | hourly at :45 | Reminds signed-in buyers once about carts untouched for 24 h+ |
| `eCommerce.posFiscalSweep` | every 5 min | Registers with CIS the paid till sales that never reached it (2 min–24 h old, no codes, no fault, no `fiscalRegisteringAt` marker); a marker older than 10 min without codes is logged for a manual check (D97, TD-B75) |
| `eCommerceMarketplace.orderAutoComplete` | hourly | Accepts deliveries the customer left unanswered for `autoAcceptDays` and completes the order |
| `eCommerceMarketplace.taskRequestExpiry` | hourly | Closes open task requests past `expiresAt` and tells the users still waiting on a bid |

## Path alias

```ts
import Product from "@eCommerceModule/database/schemas/product/product";
```

## Related packages

| Package | Location |
|---------|----------|
| Armonia contracts | [`armonia/src/modules/eCommerce`](../../../armonia/src/modules/eCommerce/README.md) |
| Client UI | `sinfonia/src/modules/eCommerce/` |
