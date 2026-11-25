# eCommerce Module (Maestro)

Server-side implementation of Arpeggio product commerce: shop, inventory, till and storefront. Mongoose models, business services, HTTP routes, cron jobs, and DTO mappers. The services marketplace is its own module, `maestro/modules/marketplace` (D142); neither module imports the other.

Contracts (types, schema-defs, validators) live in **armonia** at `armonia/src/modules/eCommerce/`. This module implements the runtime layer.

Enable via `ENABLED_MODULES=eCommerce` (or leave unset to load all present modules).

## Directory layout

```
eCommerce/
├── api/eCommerce/private/              # Product commerce routes
├── database/
│   ├── moduleBootstrap.ts             # Model registry for initializer; reportables (D191: `domain/reports/eCommerceReportables.ts`)
│   └── schemas/<resource>/            # Mongoose models
└── utilities/
    ├── mappers/                       # Document → DTO / select mappers
    ├── services/                      # Domain services (slug generation, checkout, …)
    └── cron/                          # Module-specific cron handlers
```

## Reports to the platform (D191)

People report a product or a product review to the platform from the shop (`eCommerce.product`, `eCommerce.productReview`). A product the platform hides (`hiddenByPlatform`) leaves the portal, the shop, its search and the cart; a hidden review leaves the shop and the product's stored rating (`workflows/productRating.ts`). A review is published once written, and nobody deletes one (the model's delete is `no-permission`).

## API routes

Routes are discovered from `api/eCommerce/`. Each file exports `basePath` and `router`. The storefront's address forms read the core place lists (`/api/portal/places/{countries,states,cities}`).

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
| `productOrder.ts` → `customerAddresses` | `/api/eCommerce/productOrder/customerAddresses` | The shop's buyers' address books, read-only (core `UserAddress`, D163) |
| `returnRequest.ts` | `/api/eCommerce/returnRequest` | Returns |
| `cmsBlock.ts` | `/api/eCommerce/cmsBlock` | CMS blocks |
| `savedSearch.ts` | `/api/eCommerce/savedSearch` | Saved searches |
| `analytics.ts` | `/api/eCommerce/analytics` | Analytics |

**Point of sale and fiscalization: coming soon (D186).** Until Arpeggio is certified as fiscal software, finance's
`FISCALIZATION_AVAILABLE` (`armonia/src/modules/finance/helpers/fiscalAvailability.ts`) is `false`. The till
(`/api/eCommerce/pos`) and its fiscal routes (`/api/eCommerce/fiscal`) refuse every call with
`fiscalization_coming_soon`, and so do the actions and writes of `posOrder`, `posSession`, `posConfig` and
`posPaymentMethod`. Their list, select and single reads stay open, because other records link to till sales. The gate is
finance's `fiscalComingSoon` middleware. Setting the constant to `true` restores all of it, and the panel's menus too.

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
| `eCommerce.posFiscalSweep` | every 5 min | Registers with CIS the paid till sales that never reached it (2 min–24 h old, no codes, no fault, no `fiscalRegisteringAt` marker); a marker older than 10 min without codes is logged for a manual check (D97, TD-B75); does nothing while fiscalization is coming soon (D186) |

## Path alias

```ts
import Product from "@eCommerceModule/database/schemas/product/product";
```

## Related packages

| Package | Location |
|---------|----------|
| Armonia contracts | [`armonia/src/modules/eCommerce`](../../../armonia/src/modules/eCommerce/README.md) |
| Client UI | `sinfonia/src/modules/eCommerce/` |
