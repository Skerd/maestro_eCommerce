# eCommerce Module (Maestro)

Server-side implementation of the Arpeggio eCommerce domain: Mongoose models, business services, HTTP routes, cron jobs, and DTO mappers.

Contracts (types, schema-defs, validators) live in **armonia** at `armonia/src/modules/eCommerce/`. This module implements the runtime layer.

Enable via `ENABLED_MODULES=eCommerce` (or leave unset to load all present modules).

## Directory layout

```
eCommerce/
├── api/eCommerce/private/     # Express route files (auto-discovered)
├── database/
│   ├── moduleBootstrap.ts     # Model registry for initializer
│   └── schemas/<resource>/    # Mongoose models, services, indexes, views
└── utilities/
    ├── mappers/               # Document → DTO / select mappers
    ├── services/              # Domain services (slug generation, checkout, …)
    └── cron/                  # Module-specific cron handlers
```

## API routes

Routes are discovered from `api/eCommerce/private/`. Each file exports `basePath` and `router`.

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
| `orderChannel.ts` | `/api/eCommerce/orderChannel` | Order channels |
| `orderDelivery.ts` | `/api/eCommerce/orderDelivery` | Delivery tracking |
| `orderMilestone.ts` | `/api/eCommerce/orderMilestone` | Order milestones |
| `orderRevision.ts` | `/api/eCommerce/orderRevision` | Order revisions |
| `fulfillment.ts` | `/api/eCommerce/fulfillment` | Fulfillment |
| `paymentTransaction.ts` | `/api/eCommerce/paymentTransaction` | Payments |
| `escrowTransaction.ts` | `/api/eCommerce/escrowTransaction` | Escrow |
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

## Path alias

```ts
import Product from "@eCommerceModule/database/schemas/product/product";
```

## Related packages

| Package | Location |
|---------|----------|
| Armonia contracts | [`armonia/src/modules/eCommerce`](../../../armonia/src/modules/eCommerce/README.md) |
| Client UI | `sinfonia/src/modules/eCommerce/` |
