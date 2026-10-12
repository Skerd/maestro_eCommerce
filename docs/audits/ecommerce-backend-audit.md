# eCommerce backend — architecture, flow and data-integrity audit

| | |
|---|---|
| Date | 2026-10-12 |
| Scope | maestro `modules/eCommerce`, the parts of `modules/finance` it calls, core CRUD / plugins / auth, armonia eCommerce contracts |
| Method | Static tracing of the code. Read-only checks against the dev DB (`xCloud-eCommerce`). A second, adversarial review pass (§18). |
| Changes made | None. No code, data, migrations or indexes were modified. **No tests were run.** |
| Paths | Relative to `maestro/modules/` unless stated otherwise. Line numbers are from the working tree on 2026-10-12. |

---

## 1. Executive summary

The cart → checkout → payment → order money path is in better shape than the rest of the backend:
- prices are re-derived on the server;
- discount usage and order numbers are atomic;
- stock is reserved with an atomic guard before any charge;
- refunds are capped per charge.

The serious problems sit **around** that path, in five places.

1. **Authorization holes outside the order path.**
   - Every POS and fiscal endpoint is open to any user with any role in the company (E-01). In this deployment that includes anyone who self-signs up.
   - `customerGroup.addMember` / `removeMember` are open too (E-02).
2. **Stock-ledger integrity.**
   - The unique index on the stock key was never created (E-03).
   - Warehouses and stock rows can be deleted while they hold stock or reservations (E-04).
   - Deleting a pending order leaks its holds (E-05).
   - The expiry cron can release a confirmed order's holds (N-04) and is not atomic (E-07).
   - Online and POS apply different tracking and availability rules (E-08, N-06).
3. **POS and fiscal correctness.**
   - POS always records 0 VAT, and fiscalization reports that to the tax authority (N-01).
   - POS doesn't explode bundles, and fractional quantities fail (E-09).
   - POS gift cards and digital goods are never issued (N-03).
   - A POS sale can be refunded twice, once through the online refund action and once at the till (N-02).
4. **Order history is not fully self-contained.**
   - There is no variant or option snapshot, and no tax breakdown.
   - Currency is stored by reference only.
   - Gift-card and digital issuance read the live product.
   - The admin order DTO mixes live variant and product data with the snapshot (E-10, N-07).
5. **Core infrastructure side effects.**
   - Every CRUD PATCH bypasses Mongoose validators *and* the audit log (E-14).
   - Soft-delete visibility depends on whether the caller is an admin (E-17).
   - Unique keys ignore soft-delete (E-13).

**Regression context.** The Phase 1 integrity fixes recorded as done on 2026-10-03 are absent from the code and from git history. Commit `1b0d5d7` (2026-10-11) deleted all eCommerce tests, so nothing caught it (E-18).

**Severity counts:** P0 ×1 (conditional), P1 ×4, P2 ×19, P3 ×16.

**Remediation status (2026-10-12).** Every finding in §13 now opens with a status block. ✅ = fixed, ⚠️ = partially fixed, ⏸ = not fixed. The status block explains how the fix was implemented, which files changed and which tests cover it. The P3 table (§13) and the roadmap (§14) have a Status column. §19 (round 1), §20 (round 2), §21 (Phase 2a + 2b: stock leaves at shipment), §22 (Phase 2c–2f: operator UI, stock transfers, stock counts, role packs) and §23 (the remaining partial fixes, including the core changes) hold the summaries, verification results and deployment steps.

| | Fixed ✅ | Partially fixed ⚠️ | Not fixed ⏸ |
|---|---|---|---|
| P0 / P1 | E-01, E-03, E-04, E-05, N-01 | — | — |
| P2 | E-02, E-06, E-07, E-08, E-09, E-10 + N-07, E-11, E-12, E-13, E-14, E-15, E-16, E-17, E-18, N-02, N-03, N-04, N-05, N-06 | — | — |
| P3 | E-19, E-20, E-21, E-22, E-23, E-24, E-26, N-08, N-09, N-13, N-14, N-15, postal-pattern regex | — | E-25, N-11, N-12 (by decision) |

Nothing is committed. Before deploying, follow the steps in §19–§21: the tracking-rule migration dry run, `migrate:sync-ecommerce-indexes`, granting the new POS tags to cashier roles, warehouse addresses and TaxZones for POS VAT, the Stripe endpoint check and — right after the deploy, before anything ships — `migrate:order-reservations`.

---

## 2. Scope and inspected components

| Area | Inspected |
|---|---|
| Core | `crudRouterFactory.ts`, `baseCrudService.ts`, `buildUpdateDataFromSchemaDef.ts`, `relationsRegistry.ts`, plugins (`softDelete`, `ownership`, `lifeCycle`, `audit`), `authMW.ts`, `transactionHandler.ts`, `asyncHandler.ts`, `routeRegistry.ts`, role defaults, signup/login role assignment |
| armonia | `schemaDefBuilder.ts` (create/edit zod), product / inventory / fulfillment / returnRequest / taxZone schema-defs, `payPosOrder` validator |
| eCommerce models | all 33 schemas: plugin and index inventory; Product, ProductVariant, Inventory, InventoryMovement, Warehouse, Cart, Checkout, ProductOrder, Fulfillment, ReturnRequest, Discount, PricingRule, Collection, CustomerGroup(+Member), PosOrder, PosSession, PosConfig, FiscalConfig read in detail |
| Routes | every `api/eCommerce/private/*` and `public/*` file; all `*.actions.ts` |
| Services | cart pricing, checkout placement, inventory reservation, inventory service, discount validation, pricing rules, tax, shipping, order number, paid extras, order notifications, POS (`posService`, `posTillOps`, `posLinePrice`, `posKillSwitch` partially), fiscalization (line mapping) |
| Jobs | `checkoutExpiryJob`, `scheduledPublishJob`, `lowStockAlertJob` (light), cron registration |
| finance | `paymentsWebhook` (both copies), `paymentTransaction.service`, `giftCard.service`, gift card and payment transaction routes |
| DB (read-only) | `listIndexes` on 18 collections; integrity counts on `inventories`; company / signup topology |

---

## 3. Architecture and dependency map

```
HTTP ─ authMW (JWT, company from x-company-id or token, requires ≥1 role; sets requestContext.isAdmin)
     ├─ crudRouterFactory routes: select / list / single / PUT / PATCH / DELETE / restore
     │    SchemaGuard model + field permissions, transactionHandler, zod from armonia schema-defs
     │    @action routes: auth + rate limit + optional tx ONLY (no permission check — each action must gate itself)
     ├─ custom routers: cart, checkout, pos, fiscal, analytics, discount/validate, digitalDelivery, public shop routes
     └─ public webhooks: /api/eCommerce/paymentsWebhook/stripe (and stale /api/finance/paymentsWebhook/stripe)

Company (tenant; ownershipPlugin adds company + createdBy)
 ├─ Product ─┬─ ProductVariant (product ref, attributeCombination[{attribute, value:string}])
 │           ├─ Inventory (product, variant|null, warehouse) → onHand, reserved     ◄── InventoryMovement (ledger, not reconstructable)
 │           ├─ categories[] → ProductCategory (parent → self)
 │           ├─ collections[] ◄─?─► Collection.products[] / rules   (two unsynced sources)
 │           └─ bundleComponents[] → Product
 ├─ Warehouse ◄── Inventory.warehouse, PosConfig.warehouses[]
 ├─ Cart (user) → Checkout (idempotencyKey, reservations[], totals) → ProductOrder (idempotencyKey, items[].snapshot)
 │                                    │                                   ├─ Fulfillment (order, items[orderItemId, qty])
 │                                    │                                   ├─ ReturnRequest (order, items)
 │                                    │                                   └─ finance.PaymentTransaction (sourceType/sourceId)
 │                                    └─ finance.PaymentTransaction (pending charge, Stripe intent)
 ├─ Discount, PricingRule, CustomerGroup(+Member), TaxZone, ShippingZone
 ├─ POS: PosConfig → PosSession → PosOrder (+ a ProductOrder per sale, idempotencyKey "pos:<id>") → fiscalization (AL CIS)
 └─ finance: GiftCard (issued for paid gift_card lines), DigitalDelivery (eCommerce), EscrowTransaction (marketplace)

Crons: checkoutExpiry (hourly), scheduledPublish (5 min), lowStockAlert, abandonedCart. No request context → non-admin soft-delete semantics.
```

**Cross-module couplings to know about**
- `checkoutPlacementService` is shared by `/checkout/confirm`, the webhook and the expiry cron.
- POS writes `Inventory` directly (`posService.ts:75-240`) rather than through `InventoryService`.
- The order lifecycle reaches into finance (payment transactions, gift cards) and DigitalDelivery.
- Soft-delete behaviour comes from a core plugin that reads the request context (`softDeletePlugin.ts:102`).

---

## 4. Entity and relationship inventory

**Plugins.** Every eCommerce model except Cart, Checkout and PosCompanyPosLock has `ownership + audit + softDelete + lifeCycle`; DigitalDelivery has `ownership + audit` only. So **Inventory, InventoryMovement, ProductOrder, Fulfillment and Warehouse are all soft-deletable.**

**Uniqueness constraints vs the dev DB**

| Collection | Defined | Present in DB | Note |
|---|---|---|---|
| inventories | `{product, variant, warehouse, company}` unique, `sparse` + partial `deletedAt:null` | **No** | `sparse` + `partialFilterExpression` is invalid; siblings were created (E-03) |
| posorders | `{company, clientRequestId}` unique, `sparse` + partial | **No** | same cause |
| products | slug; gtin / upc / ean unique (partial on `$type:string`) | yes | not partial on `deletedAt` (E-13) |
| warehouses | `{company, code}` unique | yes | not partial on `deletedAt` |
| productcategories | `{company, slug}` unique | yes | not partial on `deletedAt` |
| discounts | `{company, code}` unique sparse | yes | not partial on `deletedAt` |
| productorders | `{company, orderNumber}`, `{idempotencyKey}` unique | yes | |
| checkouts | `{idempotencyKey}` unique; `{status, expiresAt}` (no TTL) | yes | TTL already dropped |
| productreviews / customergroupmembers | unique, partial `deletedAt:null` | yes | proves the partial syntax works on this cluster |
| paymentwebhookevents | `{gateway, eventId}` unique | yes | |
| carts | TTL on `expiresAt` | yes | carts expire 30 days after creation, never extended |

**References and what blocks deletion.** `assertCanDelete` (`core/database/relationsRegistry.ts`) only considers **top-level, required, scalar** ObjectId refs. Nested refs (`ProductOrder.items.product`) and array refs never block. Custom `beforeDelete` hooks *replace* the check (`crudRouterFactory.ts:647-651`).

---

## 5. End-to-end lifecycle flows

**Cart.** `PUT /cart/item`:
- loads an active, non-deleted product; requires a variant when `hasVariants`; enforces min/max/step;
- `repriceCart` resets every line to the base price, applies the first matching pricing rule, re-validates the discount, and re-caps the gift card.

The cart has no stock check, and prices are never trusted from the client.

**Checkout**
1. `/init` (no transaction) copies the repriced cart; it re-syncs a pending checkout if the cart changed.
2. `/address` resets the rate and tax and computes the rates.
3. `/shipping` sets the rate and tax (on subtotal − discount, `productType` never passed).
4. `/payment`, in a transaction:
   - reset if the method changed;
   - `assertDiscountUsable`;
   - **reserve stock**: one warehouse per line, default warehouse first;
   - for Stripe, create the intent with idempotency key `checkout-pi-{key}-{attempt}` and a pending charge;
   - the status moves to `payment_processing` for online methods only.
5. `/confirm` → `placeOrderFromCheckout`:
   - idempotent via `idempotencyKey`;
   - checks payment (asking Stripe once if needed);
   - counts the discount use atomically;
   - re-reserves if the holds were lost (a paid order with a shortfall is kept, with a timeline note);
   - redeems the gift card;
   - draws the order number (outside the transaction);
   - saves the order;
   - **consumes the holds only if paid**, then runs `fulfillOrderPaidExtras`, clears the cart and sends notifications (before commit).

**Payment events**
- **Webhook `payment_intent.succeeded`:** records the event id → `markSucceeded` → amount check → place the order in its own `withTransaction`.
- **Expiry cron:** places checkouts that were paid but never ordered; expires the rest and releases their holds; purges terminal checkouts after 30 days.

**Order lifecycle (actions, all field-tag gated)**
- `confirm`, `markProcessing`;
- `ship`: creates a full Fulfillment; status → shipped/fulfilled;
- `cancel`: unpaid only; releases holds; re-credits the gift card;
- `markPaid`: offline payments; consumes holds; runs extras;
- `refund`: gateway refund, then record it; on a full refund, re-credit the gift card, disable issued cards, expire downloads, restock if unfulfilled.

Fulfillment actions are `ship` / `markDelivered` / `markFailed` and have no stock effect. Return actions are `approve` / `reject` / `receive` / `complete`, status only.

**Stock**

| Event | Effect | Movement |
|---|---|---|
| Create an inventory row | sets on-hand | `initial` |
| Restock / Deduct | `$inc` on-hand by **key** | `restock` / `write_off` |
| `/checkout/payment` | reserved += q, single row | — |
| Payment / `markPaid` | on-hand −q, reserved −q | `sale` (written even if no row matched) |
| Cancel / expiry | reserved −q | — |
| Full refund while unfulfilled | on-hand +q | `return` |
| POS sale | on-hand −q across till warehouses; oversell upserts | `sale` |
| POS refund | on-hand +q into **first** till warehouse, upsert | `return` |
| Fulfillment ship/deliver, return receive | **nothing** | — |

**POS.** Open the session → `pay`:
- server price, line discount and order discount (PIN only if one is configured);
- payments; stock consumed if `trackInventory`;
- a ProductOrder `delivered`/`paid` booked to `customerId` or the **cashier**;
- one manual charge per payment;
- best-effort fiscalization.

`refund`: line or amount refund; restock to the first warehouse; updates the original PosOrder and the ProductOrder status.

---

## 6. Order snapshot completeness matrix

| Fact | Source at checkout | Persisted on ProductOrder | Read path uses snapshot? | Survives source mutation / deletion? | Finding |
|---|---|---|---|---|---|
| Product reference | cart line | `items.product` (ref) | navigation only | ref stays; DTO `product` becomes `undefined` for non-admins once deleted | N-07 |
| Title | product at reprice | `items.snapshot.title` | DTO (falls back to live title), analytics `topProducts`, `/my` | yes | — |
| SKU | variant/product at reprice | `items.snapshot.sku` | DTO | yes | — |
| Image | media id at reprice | `items.snapshot.imageUrl` (a **media id**) | DTO | only while the media exists | P3 |
| Variant name / options | — | **not stored** | DTO shows the live `variant.attributeCombination`, `sku`, `price` | **no** | E-10, N-07 |
| Product type (gift card / digital) | — | **not stored** | `fulfillOrderPaidExtras` reads the live type at payment time | **no** | E-10 |
| Digital files / limits / expiry | — | stored on DigitalDelivery **only after payment** | live product at payment time | no for COD paid later | E-10 |
| Unit price, line total | repriced cart | `unitPrice`, `totalPrice` | DTO, analytics | yes | — |
| Pricing-rule adjustments | `calculatePricing` | not stored (only the net unit price) | — | n/a | P3 |
| Discount | applied discount | `appliedDiscounts[{discount ref, code, amount}]` | DTO (label from the live discount, code and amount from the snapshot) | amount yes; label no | P3 |
| Tax rate / name | `calculateTax` (total only) | `taxTotal`; **`taxBreakdown` is never written** (`checkoutPlacementService.ts:327` copies an always-empty field) | — | rates lost | E-11 |
| Shipping | selected rate | `shippingRate{name, carrier, price}`, `shippingTotal` | DTO | yes | — |
| Totals | checkout | subtotal, discountTotal, shippingTotal, taxTotal, grandTotal | DTO, analytics, emails (total only) | yes | — |
| Currency | cart / product / first currency | `currency` (**ref only**) | DTO and analytics read the live Currency; emails print **no** currency | no if the Currency doc changes | E-10, N-08, N-09 |
| Customer identity | JWT user | `customer` ref, `email`, `phone` (buyer-entered) | emails use the **live** account email, not `order.email` | contact snapshot ignored | N-08 |
| Shipping / billing address | checkout form | embedded (country as a ref) | DTO | yes (country label is live) | — |
| Business name / VAT | — | not captured | — | n/a | business question |
| Gift card used | checkout | `giftCard{ref, code, amount}` | refund / cancel re-credit | yes | — |
| Payment | PaymentTransaction | `stripePaymentIntentId`; charges in finance | order sheet (`enrichSingle`) | yes | — |
| Timestamps / provenance | — | `createdAt`, `timeline[]` | DTO | yes | — |
| POS lines | POS pay | `PosOrder.lines` (name, sku, barcode, price, discount, **taxAmount 0**) | receipt, reprint, fiscal XML | yes (receipt header/footer read the live config) | N-01 |

**Snapshot boundary.** Commercial facts are fixed when `placeOrderFromCheckout` saves the order. The checkout itself freezes prices at `/init`, valid for the 30-minute TTL; later steps don't reprice (N-12). Facts that only materialise at payment time (gift cards, downloads) are taken from live data and are **not** part of the boundary.

---

## 7. Product, warehouse, inventory and order lifecycle findings (index)

- **Product:** E-12, E-13, E-14, E-19, N-05, N-14, E-24.
- **Warehouse / inventory:** E-03, E-04, E-07, E-08, N-06, E-09, N-04.
- **Order:** E-05, E-06, E-10, E-11, E-15, E-16, N-02, N-03, E-20, E-21, N-12.

Full write-ups are in §13.

---

## 8. Deletion, restoration and referential-integrity matrix

| Entity | Delete guard | Cascade | Restore | Historical impact | Finding |
|---|---|---|---|---|---|
| Product | `assertCanDelete`: blocked by active variants or inventory rows (any quantity); order lines never block | none | default; variants and inventory are not restored | orders keep the snapshot; DTO `product` is `undefined` for non-admins | N-07 |
| ProductVariant | default (Inventory.variant is optional → no block) | `$pull` from `product.variants` | `$push` back (duplicates possible) | orders lose option data | E-10, N-13 |
| Inventory | **none**: deletable with on-hand or reserved > 0 | `$pull` from `product.inventories` | `$push` back, **no duplicate-key check** | holds point at a deleted row | E-04, E-03. ✅ Fixed: delete refused while on-hand ≠ 0 or reserved > 0; restore refuses a duplicate live row |
| Warehouse | `beforeDelete` = POS detach only (**replaces `assertCanDelete`**) | POS configs updated | default (two `isDefault` warehouses possible) | stock rows stay active and are still reserved from | E-04. ✅ Fixed: delete refused while any row holds stock or holds; reservation skips inactive/deleted warehouses |
| Category | default (`Product.categories` is an array → no block) | none | default | stale ids on products; pricing uses `categories[0]` | E-24 |
| Collection | default | none | default | — | N-05 |
| CustomerGroup | `beforeDelete` soft-deletes members | members | group restored **without** members | — | P3 |
| Discount | default | none | default | orders keep code and amount | — |
| ProductOrder | only `cancelled`, `refunded` or `unpaid+pending` | **none**: holds and gift-card credit leak | default | — | E-05. ✅ Fixed: a pending order holding stock or credit must be cancelled first |
| Fulfillment | default | none | default | the order stays `shipped` | E-15. ✅ Since §21 the order's statuses are derived from its non-failed shipments on every ship / deliver / fail action |
| InventoryMovement / PosOrder / PosSession | delete forbidden (`beforeDelete` throws) | — | — | ledger kept | — |
| Checkout | n/a (no plugin); the cron **hard-deletes** expired/failed after 30 days | — | — | confirmed ones kept | — |
| GiftCard | default; edit = status only | — | default | staff can re-enable a refund-disabled card | N-15 |
| Media | not audited | — | — | `snapshot.imageUrl` is a media id | §17 |

**Cross-cutting problems**
- **Admin double-delete:** `findOneOrThrow` sees deleted rows for admins, so `deleteById` rewrites `deletedAt`/`deletedBy` and `afterDelete` runs again (N-13).
- **Non-admin double-delete:** fails with "not found". The same operation is idempotent for one actor and not for the other (E-17).
- **Restore** runs no business validation (`crudRouterFactory.ts:686-710`) and doesn't map duplicate-key errors (`baseCrudService.ts:1001`).

---

## 9. Database and concurrency findings (summary)

- **Indexes:** E-03 (invalid definitions), E-13 (soft-delete-blind uniques).
- **Atomicity**
  - Good: atomic guarded `$inc` for reserve, discount count, gift-card redeem and download count; an atomic order counter.
  - Weak: release, confirm and adjust have no guard or result check (E-07, E-04).
- **Transactions**
  - HTTP writes use `transactionHandler` with **no retry on `TransientTransactionError`**, so contention returns a 500 rather than overselling (E-21).
  - Crons and the webhook's pre-processing step run without transactions (E-06, E-07, N-04).
- **Stale-document writes:** the expiry cron saves documents loaded before the loop (N-04). Mongoose array versioning (`model.js:600-636`) does not protect status-only changes.
- **Validators:** operator updates skip schema validation (E-14).
- **Read-modify-write:** cart lines are read then saved. Mongoose versions full-array `$set`, so a concurrent save fails rather than silently losing data (MAY_OR_MAY_NOT_BE under load; not tested).

**Dev DB integrity (read-only, 2026-10-12)**
- 60 active inventory rows.
- 0 duplicate keys, 0 negative on-hand, 0 negative reserved, 0 rows with reserved > on-hand.
- 0 soft-deleted rows with reserved > 0; 0 rows in deleted or inactive warehouses.

The risks above are latent in dev, not live corruption.

---

## 10. API security findings (summary)

| Route / action | Gate today | Finding |
|---|---|---|
| `/api/eCommerce/pos/*`, `posOrder/{hold,pay,refund,reprint,deleteHeld}`, `posSession/{open,cashMove,close,reconciliation}`, `/api/eCommerce/fiscal/*` | authMW only | **E-01**. ✅ Fixed: now gated on `posorders[write:state / amountRefunded]`, `possessions[write:state / cashMoves]`, `fiscalconfigs[write:tcrCode]` |
| `customerGroup/{addMember,removeMember}` | authMW only | **E-02**. ✅ Fixed: CustomerGroupMember create / delete permission |
| productOrder / fulfillment / returnRequest / inventory / warehouse / product / discount / collection / … actions | field-tag gates | OK |
| CRUD routes | SchemaGuard model + field permissions | OK; but cross-tenant ids are accepted in references (E-22) |
| Public shop routes | origin → company, `status: active`, `noDeleted`, `escapeRegex` | OK |
| Stripe webhook | signature over the raw body, event dedupe | E-06 (ordering). ✅ Fixed: the dedupe row is rolled back on failure; the stale finance copy is deleted |
| Digital download | secret token, atomic limit, media company check | OK |
| AI read tools | not checked per tool | E-26 (M) |
| Staff-configured postal-code patterns | `new RegExp` from config (tax / shipping) | P3 (staff-only ReDoS) |

---

## 11. Integration and failure-recovery findings (summary)

- **Notifications and emails are sent before commit** (placement, actions). A rolled-back order can still email the customer and merchants (E-21).
- **Stripe calls happen inside transactions** (create intent, cancel intent, refund). Idempotency keys mitigate most retries, except a refund retried with a different amount (E-21).
- **The webhook marks the event processed before handling it** (E-06). Recovery is the expiry cron, for `payment_processing` checkouts only.
- **Fiscalization** is best-effort after the sale. A failure stores `fiscalError`, and the sale stands (by design). Zero VAT is a correctness issue, not a failure (N-01).
- **Kafka email consumers** rethrow on failure. Duplicate delivery on retry was not verified (§17).

---

## 12. Missing-test matrix

**Current state (before the fixes).** No eCommerce tests existed. **Now:** nine eCommerce suites with 97 tests, plus the core `afterCommit` (6) and `baseCrudServiceWrites` (3) suites (see E-18 and the last column below). The finance suites `escrowHelper`, `paymentTransaction.service` and `stripeAdapter` (13 cases) weren't run during the audit itself; they passed in the full maestro run after the fixes (362/362).

All tests should run on `mongodb-memory-server` with a **replica set** (transactions) and assert DB state.

| # | Scenario | Finding(s) | Covered now? (2026-10-12) |
|---|---|---|---|
| 1 | Place an order, then edit the product title / SKU / price / type / variant options; the order DTO and persisted line are unchanged; type change doesn't affect extras | E-10, N-07 | ✅ Placement freezes type and options; after renaming, repricing and retyping the product and changing the tax rate, the order DTO line and totals are unchanged (`commerceFlows` › "keeps the order as sold…") |
| 2 | Delete a product after purchase; order single / list / `/my` render; review creation; analytics | N-07 | ⏸ |
| 3 | Product slug / GTIN conflict with a soft-deleted product (admin vs non-admin creator) | E-13, E-17 | ⏸ |
| 4 | Delete or deactivate a warehouse with stock, then checkout; delete an inventory row with an active hold, then `markPaid` | E-04 | ✅ Reservation skips inactive/deleted warehouses; warehouse and stock-row deletes refused over HTTP while holding stock (`httpRoutes`); shipping from a row that is gone refused (`commerceFlows` › "refuses to ship from a stock row that is gone") |
| 5 | Attribute value renamed or removed while variants and orders reference it | E-19 | ⏸ |
| 6 | Edit the customer account email after checkout; notifications use which address | N-08 | ⏸ |
| 7 | Change a tax rate or discount after checkout; order totals unchanged; physical-scoped rate applies | E-11 | ✅ Physical-scoped rate applies (per-type tax); order totals unchanged after the tax rate changes (`commerceFlows` › "keeps the order as sold…") |
| 8 | Concurrent `/checkout/payment` on the last unit (two buyers); concurrent `markPaid` | §9 | ✅ Two buyers on the last units: one holds, the other gets `out_of_stock` (`commerceFlows`); two `markPaid` requests at once over HTTP: one payment, the other a clean 400 (`httpRoutes`, fails without the E-21 retry) |
| 9 | Webhook redelivery after a handler crash; `/confirm` + webhook race; refund retry with the same and a different amount | E-06, E-21 | ⏸ |
| 10 | Cancel at each payment / fulfillment state; refused COD after ship | E-16 | ✅ Cancel and full refund release held stock; a failed shipment comes back to stock and the order can be cancelled again (§21 tests) |
| 11 | Expiry cron vs COD `/confirm` race; expiry partial failure (inject an error on the 2nd release) | N-04, E-07 | ✅ Cron vs confirm race; injected failure on the 2nd release rolls the checkout back whole, the next run releases each hold once (`checkoutExpiry`) |
| 12 | Refund side effects when the gateway succeeds but the DB commit fails | E-21 | ⏸ |
| 13 | Restore an inventory row while an active duplicate exists; restore a customer group (members) | E-03, §8 | ✅ Unique index; replacement for a soft-deleted row; customer group delete + restore over HTTP brings its members back (`httpRoutes`) |
| 14 | Web Client token against every POS/fiscal route and `addMember` → 403 | E-01, E-02 | ✅ Over HTTP with a permission-less user: `pos/currentSession`, `fiscal/fiscalizePosOrder`, `customerGroup/addMember` → `user_permissions_not_sufficient` (`httpRoutes`) |
| 15 | Legacy order without `snapshot`, legacy product without price, legacy row without `variant` field | E-14 | ⏸ |
| 16 | Duplicate inventory rows → Restock/Deduct mutate the selected row | E-03 | ✅ Duplicate live rows rejected by the index; Restock over HTTP changes the row it validated, by id (`httpRoutes`) |
| 17 | Pending-order delete → holds released or delete refused; gift card re-credited | E-05 | ⏸ |
| 18 | Revert-to-draft and Duplicate, then the scheduled-publish job | E-12 | ⏸ |
| 19 | POS bundle sale, 0.5 kg sale, gift-card sale, VAT lines in the fiscal XML | E-09, N-03, N-01 | ✅ Bundle sold as components, 0.5 kg sale, VAT per line, gift card refused, VAT lines and totals in the invoice sent to CIS (`posFlows`) |
| 20 | POS sale refunded online, then at the till | N-02 | ✅ Online refund of a POS order is refused |
| 21 | Collection-scoped discount on a manual and a dynamic collection member | N-05 | ⏸ |
| 22 | Split stock (1+1) for quantity 2: PDP vs checkout vs POS | N-06 | ✅ Checkout splits a line across warehouses (default first) and holds nothing when they can't cover it together |
| 23 | Mixed-currency cart | E-23 | ⏸ |
| 24 | PATCH a product price produces an AuditLog row; PATCH price `""` is rejected | E-14 | ✅ Price guard; PATCH writes an AuditLog row with the diff and actor (`httpRoutes`); `""` / out-of-range values on operator updates → `field_value_invalid` (`baseCrudServiceWrites`) |
| 25 | Admin vs non-admin parity for delete, stock and pricing-rule reads | E-17 | ⏸ |
| 26 | POS VAT extracted from tax-inclusive prices at the warehouse's rates | N-01 | ✅ `calculateInclusiveTax` |
| 27 | Collection-targeted pricing for manual and dynamic collections | N-05 | ✅ `collectionIdsByProduct` (supersedes #21) |
| 28 | Restore refused when a live row took the code | E-13 | ✅ warehouse restore |
| 29 | Return: shipped-quantity limit, refund cap, restock on receive, refund on complete | E-20 | ✅ two `returns` tests |
| 30 | Notifications only after commit (handler success vs failure) | E-21 | ✅ core `afterCommit.test.ts` drives the real `asyncHandler` |
| 31 | Gift card disabled by a refund can't be re-enabled | N-15 | ✅ |
| 32 | Bundle components validated | N-14 | ✅ `assertValidBundle` |
| 33 | Placement moves holds onto the order; payment leaves on-hand alone | E-16 | ✅ "moves the held stock onto the order; payment leaves it on the shelf" |
| 34 | Partial shipment consumes and splits a hold; full ship → `shipped` / `fulfilled` | E-15, E-16 | ✅ "consumes held units per shipment, splitting a hold when part of it ships" |
| 35 | Unheld units at shipment: taken from free stock, or `out_of_stock` | E-16 | ✅ "takes units nobody held from free stock at shipment, or refuses when there are none" |
| 36 | Delivered only when every shipment arrived; failed shipment back to stock | E-15, E-16 | ✅ "is delivered once every shipment arrived; a failed one comes back to stock, held again" |
| 37 | Till stock through `InventoryService` (direct sale guard, oversell, restock) | E-09 (2b) | ✅ three `inventoryService` direct stock-move tests (the POS functions themselves need a session fixture) |
| 38 | Transfer moves free stock only, paired movements, new destination row linked; count applies against on-hand now | 2d / 2e (§22) | ✅ `stockDocuments.test.ts` |
| 39 | Default role packs only name real permission groups | 2f (§22) | ✅ `eCommerceRoles.test.ts` |

---

## 13. Detailed findings

### E-01 [P0\*] — POS and fiscal endpoints have no authorization

> ✅ **Status: Fixed** (2026-10-12) — Every POS and fiscal entry point now checks a field write tag before doing anything.
>
> **How it was fixed**
> - Followed the existing order-action pattern (`assertFieldWrite` in `productOrder.actions.ts`): removed `NoWritePermission` from PosOrder `state` and `amountRefunded` and from PosSession `state` and `cashMoves` (`posOrder.ts`, `posSession.ts`), so the boot-time permission sync creates the tags `posorders[write:state]`, `posorders[write:amountRefunded]`, `possessions[write:state]` and `possessions[write:cashMoves]`. Admin roles receive them automatically. Generic PATCH on these models still throws (`buildUpdateData`), so no field became editable.
> - New gate `assertPosOrderWrite(params, field)` at `posOrder.actions.ts:26`, on `hold`, `pay`, `reprint` and `deleteHeld` (`state`) and `refund` (`amountRefunded`). It is reused by every `/pos/*` route (`pos.ts`, first line of each handler, e.g. `:45`) and by `/fiscal/fiscalizePosOrder`, `/registerEinvoice` and `/getTaxpayer` (`fiscal.ts:63`).
> - New gate `assertPosSessionWrite` at `posSession.actions.ts:26`: `open`, `close` and `reconciliation` need `state`; `cashMove` needs `cashMoves`.
> - `/fiscal/registerTcr` needs `fiscalconfigs[write:tcrCode]` (`fiscal.ts:141`).
> - sinfonia: the POS sidebar entry now needs `posOrders` (`sidebarContribution.tsx:39`).
> - **Tests:** `commerceFlows.test.ts` › "POS and customer-group gates" (no tags → rejected; the wrong tag → rejected; `posorders[write:state]` → allowed).
> - **Deployment:** grant the new tags to every cashier/POS role, or the till returns `user_permissions_not_sufficient`.
> - **Left out:** `posPaymentMethod.testConnection` and `posConfig.companyLockStatus` stay ungated (low impact; listed under unrelated debt in §19).

- **Category:** Security
- **Confidence:** Confirmed. The severity is conditional; see Impact.

**Affected components**
- `api/eCommerce/private/pos.ts` (`/catalog` :39, `/currentSession` :60, `/held` :71, `/orders` :82, `/customers` :96, `/verifyPin` :107, `/chargeTerminal` :123)
- `database/schemas/posOrder/posOrder.actions.ts` (`hold` :36, `pay` :58, `refund` :84, `reprint`, `deleteHeld` :115)
- `database/schemas/posSession/posSession.actions.ts` (`open` :36, `cashMove` :54, `close` :75, `reconciliation` :93)
- `api/eCommerce/private/fiscal.ts` (`/fiscalizePosOrder` :55, `/registerEinvoice` :84, `/registerTcr` :123, `/getTaxpayer` :152)
- `utilities/services/posTillOps.ts:551` (`searchPosCustomers`)

**Evidence**
- `@action` routes get only authMW, rate limiting, a transaction and zod (`core/api/crudRouterFactory.ts:714-727`). None of these handlers call `SchemaGuard`.
- Core has no global route-permission layer: `routeRegistry.ts` declares `requiresPermissions` but nothing enforces it.
- authMW admits any user with ≥1 role in the company (`authMW.ts:101-115`).
- Public signup grants the `isSignupDefault` role in the `isDefaultForSignUp` company (`core/api/user/public/signUp.ts:79-84`).
- In the dev DB the only company document, "eCommerce", is the default signup company.

**Execution path.** Sign up → log in → `POST /pos/currentSession` (returns the open session and config) → `POST /posOrder/pay` with `sessionId`, any lines, `discountPercent: 100` and `payments: []`. The discount PIN is required only if `pinForDiscount` *and* a manager PIN exists (`posService.ts:703-715`), so the sale goes through as a paid POS sale. It creates a `delivered`/`paid` ProductOrder for the caller, consumes stock and is sent to fiscalization.

**Reproduction.** On staging, call each route above with a Web Client token for a company that has an open POS session.

**Expected behavior.** POS and fiscal operations require POS-specific permissions (e.g. `posOrders` create, `posSessions` write, `fiscalConfigs` write); the customer search requires read permission on users.

**Actual behavior.** Membership in the company is enough.

**Impact**
- Forged sales and refunds alter stock, cash-drawer totals and financial records.
- Fiscal submissions go to the tax authority under the company certificate.
- The customer directory (name, email, phone) is disclosed.

\*P0 where shop buyers self-sign-up into the merchant company (true for the dev DB). P1 where buyers are provisioned by staff: the exposure is then limited to insiders holding any role, such as the "Agent" placeholder role with no permissions.

**Root cause.** The POS and fiscal modules were built as custom routers and actions without the field-tag gate used by the order, inventory and fulfillment actions.

**Recommended fix**
- Reuse `SchemaGuard.checkModelPermission` (create/write on `PosOrder`, `PosSession`, `FiscalConfig`) or the `assertFieldWrite` pattern (`productOrder.actions.ts:50-65`) at each handler.
- `searchPosCustomers` should require read on users / customers.
- Gate the POS menu entry in sinfonia, which today has `permissions: []`.

**Regression tests.** #14.

**Dependencies and risks.** Existing non-admin cashier roles lose POS access until they are granted the new tags. This needs a role-grant step (`resync:role-permissions`) and an announcement. No data migration.

---

### N-01 [P1] — POS records zero VAT, and fiscalization reports it

> ✅ **Status: Fixed** (2026-10-12) — POS lines now carry the VAT contained in their (tax-inclusive) price, and fiscalization reports it.
>
> **How it was fixed**
> - Your decision: rates come from the company's TaxZones, and till prices are treated as VAT-inclusive, so totals don't change.
> - New `calculateInclusiveTax(gross, productType, address, company)` (`taxCalculationService.ts:190`) prices a base of 100 through the same tax provider (so compound and type-scoped rates apply) and extracts the contained tax.
> - The tax address is the till's first warehouse (`posTaxAddress`, `posService.ts:259`). Without a country there, VAT stays 0 as before.
> - `payPosOrder` computes each line's `taxAmount` on its share after the order discount, sets `posOrder.amountTax`, and the POS ProductOrder's `taxTotal` (`posService.ts:767`). Refund lines carry their proportional tax, and the refund order's `amountTax` is their sum.
> - Fiscalization was unchanged; it already reads `taxAmount` / `amountTax`, so CIS invoices now get the per-line VAT rate and amount.
> - **Tests:** `commerceFlows.test.ts` › "extracts the VAT contained in a gross amount at the warehouse's rates".
> - **Deployment:** till warehouses need an address with a country, and the company needs TaxZones for that country. Earlier fiscalized invoices are not corrected; that needs credit notes, a business step.

- **Category:** Integration / Order
- **Confidence:** Confirmed for the behavior; the impact is conditional.

**Affected components.** `utilities/services/posService.ts:687` (line `taxAmount: 0`), `:780` (`posOrder.amountTax = 0`), `:1050`, `:1096` (refund lines); `utilities/fiscalization/fiscalizationService.ts:153,180,448` (VAT derived from `amountTax` / `taxAmount`).

**Evidence.** POS never computes tax. Fiscalization treats each line as net with `tax = 0`, and emits no VAT rate or VAT amount elements when the tax is 0 (`:196-200`), while `IsIssuerInVAT` reflects `FiscalConfig.isVatRegistered`.

**Execution path.** POS `pay` → lines with `taxAmount: 0` → `fiscalizePosOrder` → the CIS invoice reports total VAT 0.

**Reproduction.** A VAT-registered FiscalConfig with a certificate → POS sale → inspect the generated XML: no `VR`/`VA` per item and `TotVATAmt` 0.

**Expected behavior.** Line VAT is computed from the product's tax class or configured rate (prices are VAT-inclusive at the till in AL), and the fiscal XML carries the rate and amount.

**Actual behavior.** VAT is always zero.

**Impact.** Wrong tax reporting for every POS sale of a VAT-registered merchant, plus incorrect receipts (`amountWithoutVat = amountTotal`).

**Root cause.** POS tax was never implemented; `taxClass` on Product is unused.

**Recommended fix.** Requires a business decision on the source of the VAT rate (per product `taxClass` or per POS config). Then compute `taxAmount` per line in `payPosOrder` / `refundPosOrder` with `roundMoney`.

**Regression tests.** #19.

**Dependencies and risks.**
- The legal treatment must be confirmed (§16).
- Historical fiscalized invoices cannot be corrected by code; they would need credit notes.

---

### E-03 [P1] — The unique stock-key index was never created; stock operations target rows by key

> ✅ **Status: Fixed** (2026-10-12) — The index definitions are valid, duplicates are refused, and stock edits hit the row that was validated.
>
> **How it was fixed**
> - Dropped `sparse` from both unique indexes, keeping the partial filters (`inventory.indexes.ts:8`, `posOrder.indexes.ts:12`). The same `{deletedAt: null}` partial syntax was confirmed to build on this cluster.
> - Inventory create and restore call `assertNoLiveRow` (`inventory.ts:24`), which rejects a second live row for the same product/variant/warehouse with `inventory_already_exists`. Restore runs it before `restoreOneOrThrow` (`inventory.ts:133`).
> - `applyQuantityChange` (Restock/Deduct) now updates by `_id` via `inventoryService.updateById` (`inventory.actions.ts:133`) instead of `adjust` by key, and its lookup excludes deleted rows.
> - **Tests:** `inventoryReservation.test.ts` › "unique stock key" (a second live row gets E11000; a replacement for a soft-deleted row is allowed).
> - **Deployment:** run the duplicate check (§15) before the index builds; the build fails silently if duplicates exist.

- **Category:** Database / Inventory
- **Confidence:** Confirmed (code plus dev DB `listIndexes`).

**Affected components.** `database/schemas/inventory/inventory.indexes.ts:4-7`, `database/schemas/posOrder/posOrder.indexes.ts:10-13`, `database/schemas/inventory/inventory.actions.ts:96-132`, `database/schemas/inventory/inventory.service.ts` (all methods), `utilities/services/inventoryReservationService.ts:106-136`, the `inventory.ts` route (create and restore).

**Evidence**
- Both indexes combine `sparse: true` with `partialFilterExpression`, which MongoDB rejects. In the dev DB every *other* index defined in those files exists; these two don't.
- No application code checks for an existing row on create or restore.
- `applyQuantityChange` reads the row by `_id` (`:113`) and validates it (`:123`), then updates through `inventoryService.adjust(product, variant, warehouse)` (`:132`), i.e. `findOneAndUpdate` by **key**.

**Execution path.** Panel creates a second inventory row for the same product/warehouse → both active → Restock on row B → `adjust` matches row A first → row A changes while the movement references row B. Reservations and consumption likewise match whichever duplicate comes first.

**Reproduction.** Create two rows with the same product/variant/warehouse, restock the second, and compare both `quantityOnHand` values and the movement's `inventory` id.

**Expected behavior.** At most one active row per key, and stock operations mutate the row they validated.

**Actual behavior.** Duplicates are possible and mutations are ambiguous.

**Impact**
- Stock and ledger divergence, phantom availability, reserved quantities drifting between rows.
- Defense-in-depth for POS offline replay is also missing. Today the `PosSession` document write-conflict happens to serialize concurrent replays (§18.3).

**Root cause.** An invalid index option combination, with no app-level uniqueness check.

**Recommended fix**
1. A read-only duplicate check in production (the aggregation in §15).
2. Remove `sparse` from both definitions.
3. `syncIndexes` in a maintenance window.
4. In `applyQuantityChange`, update by `_id` with the same `$inc`.
5. The inventory restore handler checks for an active sibling, as `productReview` does (`checked/productReview.ts:180-205`).

**Regression tests.** #13, #16.

**Dependencies and risks**
- The index build fails if duplicates exist, so they must be merged first.
- `syncIndexes` also drops manually created indexes that aren't in the schema.
- Moving reservations to `inventoryId` is not required once the key is unique.

---

### E-04 [P1] — Warehouses and stock rows can be removed or deactivated while holding stock or reservations

> ✅ **Status: Fixed** (2026-10-12) — Stock can no longer disappear with its row or warehouse, and stock operations only touch live rows.
>
> **How it was fixed**
> - Inventory `beforeDelete` refuses while `quantityOnHand !== 0 || quantityReserved > 0` (`inventory_has_stock`, `inventory.ts:111`), then keeps the default `assertCanDelete`.
> - Warehouse `beforeDelete` refuses while any live row in it holds stock or reservations (`warehouse_has_stock`, `checked/warehouse.ts:43`), then detaches POS configs as before. Rows with zero stock don't block cleanup.
> - Reservation reads only active, non-deleted warehouses (`reserveCheckoutStock`, `inventoryReservationService.ts:131`). Deactivation is still allowed: new holds skip the warehouse, and existing holds are still consumed.
> - `InventoryService` key filters now include `deletedAt: null`, so they never match a soft-deleted row, even for admins (`inventory.service.ts`). `releaseReservation` (`:40`) never goes below zero and returns whether a row matched; `confirmSale` (`:68`) returns the updated row or `null`.
> - `consumeCheckoutReservations` wrote no `sale` movement when no live row matched, and marked the hold `released`. *Superseded in §21:* stock now leaves at shipment (`consumeForShipment`), which refuses to ship from a row that is gone (`inventory_not_found`) instead of shipping without a stock change.
> - POS stock writers (`consumePosStock`, `restockPosStock`, cross-warehouse lookups) are also restricted to live rows (`posService.ts`).
> - **Tests:** `inventoryReservation.test.ts` › "ignores stock in inactive or deleted warehouses", "never takes reserved stock below zero". ("records no sale when the held stock row no longer exists" was removed with `consumeCheckoutReservations` in §21.) The delete guards are route-inline hooks with no automated test.

- **Category:** Warehouse / Inventory / Lifecycle
- **Confidence:** Confirmed.

**Affected components**
- `api/eCommerce/private/checked/warehouse.ts:29-36` (`beforeDelete`)
- `warehouse.actions.ts` (`deactivate`)
- the `inventory.ts` route (no `beforeDelete`)
- `inventoryReservationService.ts:91-136` (reservation), `:156-200` (consume)
- `inventory.service.ts` (`confirmSale`, `releaseReservation`)

**Evidence**
- A custom `beforeDelete` replaces `assertCanDelete` (`crudRouterFactory.ts:647-651`). `Inventory.warehouse` is required and would otherwise block the delete.
- Reservation filters rows by product/variant/company only; it checks `isActive` only for the *default* warehouse lookup.
- `confirmSale` / `releaseReservation` return nothing and the caller doesn't check (`:174`). The `sale` movement is written and the hold marked `consumed` regardless.

**Execution path.** COD order holds stock in warehouse W → staff deletes W, or deletes the inventory row → `markPaid` → `confirmSale` matches no row (non-admin) → the movement is written and the hold marked consumed. On-hand is never reduced, and the held units of a still-active row are never released.

**Reproduction.** As above. Compare `quantityOnHand` and `quantityReserved` before and after.

**Expected behavior.** Removal is blocked while a row has on-hand ≠ 0 or reserved > 0 (or follows an explicit transfer/write-off policy), and reservations only use active warehouses.

**Actual behavior.** Removal is allowed and later stock operations silently no-op.

**Impact.** On-hand overstated, reserved leaked, a ledger that no longer reconciles; online sales from deactivated warehouses.

**Root cause.** Lifecycle hooks don't consider stock state; stock operations don't verify they matched a row.

**Recommended fix**
- Warehouse `beforeDelete`: run the POS detach **and** `assertCanDelete`, or a stock check.
- Inventory route `beforeDelete`: reject when `quantityReserved > 0 || quantityOnHand !== 0`.
- Reservation: restrict rows to active, non-deleted warehouses (one `Warehouse.find` per call).
- `confirmSale` / `releaseReservation` return the match result, and callers throw on `null`.

**Regression tests.** #4.

**Dependencies and risks.** The deletion policy is a business decision (§16). Blocking zero-quantity rows would hamper cleanup.

---

### E-05 [P1] — Deleting a pending unpaid order leaks its stock holds and gift-card credit

> ✅ **Status: Fixed** (2026-10-12) — A pending order that still holds stock or store credit can't be deleted.
>
> **How it was fixed**
> - Product order `beforeDelete` (`productOrder.ts` route, `:111`): for `pending` orders it looks up the checkout and refuses (`order_must_be_cancelled_first`) while any hold is `reserved` or `giftCard.amount > 0`. The operator cancels first; cancel already releases holds and re-credits the card.
> - Refusing was chosen over releasing on delete, because a deleted-then-restored order would otherwise have lost its holds (§18.5).
> - **Tests:** none automated (route-inline hook).

- **Category:** Order / Lifecycle
- **Confidence:** Confirmed.

**Affected components.** `api/eCommerce/private/productOrder.ts:96-105`.

**Evidence.** `beforeDelete` allows `unpaid + pending` orders and has no `afterDelete`. Compare `cancel` (`productOrder.actions.ts:284-299`), which releases the holds and re-credits the gift card.

**Execution path.** COD order (holds reserved, gift card partly redeemed) → staff deletes it → the checkout holds stay `reserved` → `quantityReserved` is never released and the gift-card amount is never returned.

**Reproduction.** Place a COD order using a gift card, delete it, then check `Inventory.quantityReserved` and the `GiftCard.balance`.

**Expected behavior.** Deletion is refused while holds or credit exist ("cancel first"), or it performs the same side effects as cancel.

**Actual behavior.** Silent leak.

**Impact.** Phantom out-of-stock; customer money lost.

**Root cause.** Delete and cancel are separate paths with different side effects.

**Recommended fix.** In `beforeDelete`, reject unpaid pending orders that still hold `reserved` reservations or a redeemed gift card (`order_must_be_cancelled_first`). Preferred over releasing, because restoring a deleted order would leave it without holds.

**Regression tests.** #17.

**Dependencies and risks.** None. A data repair via the `reconcileInventoryReserved` dry run is advisable.

---

### E-02 [P2] — `customerGroup.addMember` / `removeMember` have no permission check

> ✅ **Status: Fixed** (2026-10-12) — Membership changes need CustomerGroupMember create/delete permission.
>
> **How it was fixed**
> - `SchemaGuard.checkModelPermission(CustomerGroupMember, "create")` in `addMember` and `"delete"` in `removeMember` (`customerGroup.actions.ts:69`, `:102`). The tags are created by the boot permission sync.
> - **Tests:** `commerceFlows.test.ts` › "refuses customer-group self-enrolment without the member create permission".

- **Category:** Security
- **Confidence:** Confirmed.

**Affected components.** `database/schemas/customerGroup/customerGroup.actions.ts:65,97`. The neighbouring `setDefault` is gated at `:24`.

**Execution path.** A buyer posts `{customerGroup: <id>, userId: <self>}` to `/api/eCommerce/customerGroup/addMember` → becomes a member → pricing rules scoped to that group apply (`pricingCalculationService.ts` `ruleMatchesCustomerGroups`).

**Expected behavior.** `checkModelPermission(CustomerGroupMember, "create" / "delete")`.

**Actual behavior.** Any company user can do it.

**Impact.** Price manipulation. Exploitation needs the group ObjectId, and I found no buyer-reachable route that exposes it, hence P2 rather than P1.

**Root cause.** The gate was missed on these two actions.

**Recommended fix.** Add the gate (two lines each).

**Regression tests.** #14.

**Dependencies and risks.** None.

---

### N-02 [P2] — A POS sale can be refunded twice

> ✅ **Status: Fixed** (2026-10-12) — Till sales can only be refunded at the till.
>
> **How it was fixed**
> - The online `refund` action rejects orders whose `idempotencyKey` starts with `pos:` (`refund_via_pos`, `productOrder.actions.ts:439`), so `refundPosOrder` stays the only path. It keeps the PosOrder, cash drawer and stock in step.
> - **Tests:** `commerceFlows.test.ts` › "sends POS-originated orders to the till refund".
> - **Follow-up (UI):** the refund menu item is still shown for POS orders in the panel; the backend refuses it.

- **Category:** Order / Integration
- **Confidence:** Confirmed.

**Affected components.** `productOrder.actions.ts:416-557` (online `refund`), `posService.ts:974+` (`refundPosOrder`), `posService.ts` (one manual charge per payment).

**Evidence**
- The POS ProductOrder is `paid` and therefore in `REFUNDABLE` (`:43`). The online refund looks up *one* charge (`:431`) and never checks `idempotencyKey` starting with `pos:`.
- `refundPosOrder` only checks `PosOrder.amountRefunded`, which the online path never updates.

**Execution path.** A POS sale (cash + card) → admin refunds the ProductOrder online (records a manual refund against the first charge) → the cashier refunds the same PosOrder at the till (cash drawer and restock) → two refunds are recorded.

**Expected behavior.** POS-originated orders are refunded only through the POS path, or the two paths share state.

**Impact.** Double refund in the books and cash; split payments are refunded only partially online.

**Root cause.** Two refund implementations with no channel guard.

**Recommended fix.** In `refund`, reject orders whose `idempotencyKey` starts with `pos:` (`refund_via_pos`).

**Regression tests.** #20.

**Dependencies and risks.** The sinfonia refund dropdown for POS orders should be hidden.

---

### N-03 [P2] — POS sells gift-card, digital and bundle products without issuing anything

> ✅ **Status: Fixed** (2026-10-12) — Gift-card and digital products are blocked at the till (your decision); bundles are exploded.
>
> **How it was fixed**
> - `POS_UNSELLABLE_TYPES = ["gift_card", "digital"]` and `assertPosSellable` in `posLinePrice.ts:12`. They are excluded from every POS catalog query (`posService.ts:527`) and rejected in `pay` (`posService.ts:711`) and in held drafts (`posTillOps.ts:90`) with `pos_product_not_sellable`.
> - Bundles: see E-09 (`trackedStockLines`).
> - **Tests:** `inventoryReservation.test.ts` › "explodes bundles into their tracked components". The sellability guard has no automated test.

- **Category:** Order / Product
- **Confidence:** Confirmed.

**Evidence.** The POS catalog excludes only `variable` (`posService.ts:510`). `payPosOrder` never calls `fulfillOrderPaidExtras` or `explodeBundleLines`.

**Impact**
- The customer pays for a gift card or download and receives nothing.
- A bundle sale either fails, or, with oversell, creates a negative bundle stock row while its components stay untouched.

**Recommended fix**
- Either exclude `gift_card` / `digital` from POS, or call `fulfillOrderPaidExtras` with the POS ProductOrder (POS customer = cashier; see E-09).
- Explode bundles via `explodeBundleLines` before consumption.

**Regression tests.** #19.

**Dependencies and risks.** Issuing gift cards to the cashier as "customer" is wrong; it needs a customer, or a code printed on the receipt.

---

### N-04 [P2] — The expiry cron writes stale checkouts and can release a just-confirmed order's holds

> ✅ **Status: Fixed** (2026-10-12) — The cron re-reads each checkout inside its own transaction and only expires one that is still open and overdue.
>
> **How it was fixed**
> - New `expireCheckout` (`checkoutExpiryJob.ts:42`): `session.withTransaction` → `Checkout.findOne({_id, status: {$in: [pending, payment_processing]}, expiresAt: {$lte: now}})` → release the holds with the session → `status = "expired"` → save. A checkout confirmed or resumed since the batch was loaded is skipped, and a failure releases nothing. The Stripe intent cancel stays outside the transaction, as before.
> - **Tests:** `checkoutExpiry.test.ts` (in-memory replica set): "expires an overdue checkout and releases its hold" and "leaves a checkout alone when it was confirmed after the batch was loaded". The second test was run against the pre-fix job and **failed**, then passed on the fix.

- **Category:** Inventory / Database
- **Confidence:** Strongly suspected (timing-dependent; the code path is confirmed).

**Affected components.** `utilities/cronJobs/checkoutExpiryJob.ts:42-70`, `inventoryReservationService.ts:206-221`.

**Evidence**
- `due` is loaded once (`:42`). For each item, after Stripe calls, the job releases holds by key (`$inc`, not conditioned on the checkout state) and sets `status = "expired"` on the in-memory document (`:65-69`).
- A COD `/confirm` only changes `status`, so Mongoose's array versioning (`node_modules/mongoose/lib/model.js:600-636`) doesn't detect the conflict when the cron saves.

**Execution path.** A COD checkout expires at T → the cron loads it → the buyer confirms at T+ε (order created, checkout `confirmed`) → the cron releases the holds and saves `expired` → `markPaid` later finds no `reserved` holds → stock is never deducted.

**Expected behavior.** Release only when the checkout is still `pending` / `payment_processing`, atomically.

**Impact.** On-hand overstated; possible oversell.

**Recommended fix.** Per checkout: `findOneAndUpdate({_id, status: {$in: [pending, payment_processing]}}, {$set: {status: "expired"}})` inside a session, then release using the returned document, all within one `withTransaction` (the `placePaidCheckoutInBackground` pattern, `checkoutPlacementService.ts:410-431`). Keep the Stripe cancel outside the transaction.

**Regression tests.** #11.

**Dependencies and risks.** Also closes E-07.

---

### E-06 [P2] — The webhook records an event as processed before processing it; the stale copy is still live

> ✅ **Status: Fixed** (2026-10-12) — A failed event is forgotten so Stripe's retry is processed; the stale copy is removed.
>
> **How it was fixed**
> - The processing block of `/api/eCommerce/paymentsWebhook/stripe` is wrapped in try/catch. On error it deletes the `PaymentWebhookEvent` row and rethrows (`public/paymentsWebhook.ts:168`), so the redelivery isn't acknowledged as a duplicate. Every step it repeats is idempotent (`markSucceeded`, placement keyed by `idempotencyKey`).
> - Deleted the stale `maestro/modules/finance/api/finance/public/paymentsWebhook.ts` (nothing imported it).
> - The "existing unpaid order" branch is unchanged: effectively dead code for Stripe (§18.1).
> - **Tests:** none automated (needs an HTTP harness).
> - **Deployment:** make sure no Stripe endpoint points to `/api/finance/paymentsWebhook/stripe` (now 404).

- **Category:** Integration
- **Confidence:** Confirmed.

**Affected components.** `api/eCommerce/public/paymentsWebhook.ts:95-101,103-160`; `finance/api/finance/public/paymentsWebhook.ts` (route `/api/finance/paymentsWebhook/stripe`).

**Evidence**
- `PaymentWebhookEvent.create` runs first, outside any transaction. A later exception returns a 500 to Stripe, and every redelivery then hits the duplicate path (`:97-98`).
- The finance copy has neither order auto-placement nor the amount check.

**Execution path.** `payment_intent.succeeded` → event recorded → `placePaidCheckoutInBackground` throws (transient DB error) → redeliveries are ignored → the order exists only if the buyer's `/confirm` or the expiry cron places it, for `payment_processing` checkouts only.

*Correction to the first pass:* the non-transactional "existing unpaid order" branch (`:44-59`) is effectively unreachable for Stripe, because an order is only created once its charge has succeeded.

**Expected behavior.** Record the event in the same transaction as its effects, or delete the record on failure.

**Impact.** Delayed or missing orders for captured money; if both URLs are configured in Stripe, the stale copy may win the race.

**Recommended fix.** Delete the dedupe record in a `catch` before rethrowing (smallest change); delete the finance copy.

**Regression tests.** #9.

**Dependencies and risks.** Check the Stripe dashboard endpoints before deleting the finance route.

---

### E-07 [P2] — Checkout-expiry release isn't atomic, and the release/confirm operations have no guards

> ✅ **Status: Fixed** (2026-10-12) — Release is atomic per checkout and can't double-release or go negative.
>
> **How it was fixed**
> - Covered by the transactional `expireCheckout` (N-04) and the floored, result-checked `releaseReservation` / `confirmSale` (E-04).
> - **Tests:** `checkoutExpiry.test.ts`; `inventoryReservation.test.ts` › "never takes reserved stock below zero".

- **Category:** Inventory
- **Confidence:** Confirmed.

**Evidence**
- `releaseCheckoutReservations` loops `$inc` per hold and saves the checkout at the end (`:206-221`). If one `$inc` throws, earlier releases stick and the checkout isn't saved, so the next run releases them again.
- `releaseReservation` / `confirmSale` don't floor at 0 or check the match (`inventory.service.ts`).

**Impact.** `quantityReserved` too low (or negative), then oversell.

**Recommended fix.** As N-04. In addition, guard the filters with `quantityReserved: {$gte: q}` and check the result.

**Regression tests.** #11.

---

### E-08 [P2] — Two stock-tracking rules

> ✅ **Status: Fixed** (2026-10-12) — One tracking rule is used everywhere (this re-lands the lost Phase 1.3).
>
> **How it was fixed**
> - `isStockTracked(product, variant)` (`inventoryReservationService.ts:84`): `digital` / `service` / `gift_card` / `bundle` are never tracked; otherwise tracked unless the product or variant has `trackInventory: false`.
> - `trackedStockLines(lines)` (`:99`) explodes bundles and keeps only tracked lines. A product that no longer exists counts as tracked, so it can only sell real stock. It is used by checkout reservation (`:131`, where tracked + no row now means `OutOfStockError`), by POS sales (`posService.ts:837`) and by POS refunds (`:1203`).
> - The storefront `stockAvailability` uses the same rule and active warehouses only, and a variant product is in stock when any variant is (`shopProduct.ts:26`). The POS catalog's `trackInventory` flags come from `isStockTracked`.
> - **Tests:** `inventoryReservation.test.ts` › the `isStockTracked` matrix, "skips untracked lines", "treats a tracked product without any stock row as out of stock", "respects a variant that opts out of tracking".
> - **Behaviour change / deployment:** tracked products with no stock row are now out of stock online. Run `yarn migrate:disable-tracking-without-inventory` (dry run first) to keep them selling.

**Evidence.** Online treats "an Inventory row exists" as tracked (`inventoryReservationService.ts:107`, `shopProduct.ts` `stockAvailability`). POS uses `product.trackInventory` (`posService.ts:793`). Nothing online reads `trackInventory`.

**Impact**
- Tracked products without rows sell without limit online.
- Untracked products with rows still reserve stock.
- The same product behaves differently at the till.

**Recommended fix.** One `isStockTracked(product, variant)` beside `explodeBundleLines`, used by reservation, the product page and POS. This is the lost Phase 1.3, and the migration script `disableTrackingWithoutInventory.ts` already exists.

**Regression tests.** #22.

---

### N-06 [P2] — Three availability rules disagree

> ✅ **Status: Fixed** (2026-10-12, Phase 2a — §21) — Checkout reserves across warehouses, so "in stock" on the product page and at payment mean the same thing.
>
> **How it was fixed**
> - `reserveCheckoutStock` (`inventoryReservationService.ts:130`) first tries one active warehouse that covers the whole line (default first, `:162`: fewer parcels), otherwise splits the line across warehouses, taking each one's free stock, default first (`:171`). A line the active warehouses can't cover together throws `OutOfStockError` after releasing this call's holds, so nothing partial is committed.
> - The product page (`shopProduct.ts:26`, same tracking rule and active warehouses since E-08) shows a variant in stock when any active warehouse has free stock — which is now exactly what checkout can reserve for one unit. POS already filled across the till's warehouses.
> - **Tests:** `inventoryReservation.test.ts` › "splits a line across warehouses when none covers it alone, default first", "throws OutOfStockError when all warehouses together can't cover a line, holding nothing", plus the existing default / fallback tests.
> - **Remaining difference (by design):** a quantity larger than one can still show "in stock" and then fail at payment when the warehouses together hold less — the page shows availability, not a quantity.

**Evidence**
- The product page marks a variant in stock if *any* row has available > 0 (`shopProduct.ts:23-31`).
- Checkout reserves a **whole line from one row** (`inventoryReservationService.ts:115-136`).
- POS fills across the till's warehouses (`posService.ts` `consumePosStockAcrossWarehouses`).

**Impact.** "In stock" on the product page, then `out_of_stock` at payment for quantities covered only by split stock.

**Recommended fix.** Split-warehouse reservation (already designed in Phase 2a). Short term, make the product page and cart quantity checks use the same single-row rule.

**Regression tests.** #22.

---

### E-09 [P2] — POS stock defects

> ✅ **Status: Fixed** (2026-10-12) — POS bundles, fractional quantities, refund restock location and customer validation are fixed.
>
> **How it was fixed**
> - Bundles: `payPosOrder` consumes `trackedStockLines(...)` instead of the raw lines (`posService.ts:837`). The till-only `trackInventory` field on POS lines was removed.
> - Fractional quantities: `ProductOrder.items.quantity` min is `0.0001` (`productOrder.ts:174`), mirrored in armonia `productOrder.schema-def.ts` (matches the POS validator).
> - Refund restock: `returnableByWarehouse` (`posService.ts:252`) computes, per stock key, the sale's `sale` movements minus earlier refunds' `return` movements. The refund restocks into those warehouses first (`:1226`); anything beyond falls back to the till's first warehouse. Bundles are exploded there too.
> - `customerId` must belong to the company (`pos_customer_not_found`, `posService.ts:780`).
> - **Phase 2b (§21, renamed in §22):** POS no longer writes `Inventory` itself. A till sale goes through `inventoryService.takeStock` (`inventory.service.ts:142`: only free stock, or — when the till allows overselling — below zero, creating the missing row), a till refund through `inventoryService.addStock` (`:160`). Rows these create are linked to their product by the service. `InventoryService` is now the only stock writer.
> - **Unchanged by choice:** walk-in sales are still booked to the cashier (`ProductOrder.customer` is required).
> - **Tests:** bundle explosion is covered (`trackedStockLines`), and the two `InventoryService` methods the till uses are tested directly; the POS pay/refund flow itself has no automated test (needs a POS session fixture).

**Evidence**
- Bundles aren't exploded (`posService.ts:793`).
- A fractional quantity is accepted by the POS validator (`armonia …/payPosOrder.form.validator.ts:54`, `min 0.0001`) but `ProductOrder.items.quantity` is `min: 1` (`productOrder.ts:172`), so a 0.5 kg sale aborts the whole transaction.
- Refunds restock into `warehouseIds[0]` with upsert (`:999`, `:218`), not into the source warehouse.
- Walk-in sales use `customer: ctx.userId`, i.e. the cashier (`:814`); `customerId` is not validated against the company.
- Oversell upserts create negative rows that never reach `product.inventories`.

**Impact.** Failed sales, mis-located stock, cashier "purchase history" polluted with walk-in sales.

**Recommended fix**
- Explode bundles.
- Order line `min: 0.0001` (the lost Phase 1.5).
- Restock to the warehouse recorded in the original sale's movements.
- Consider a walk-in customer marker rather than the cashier.

**Regression tests.** #19.

---

### E-10 + N-07 [P2] — Order snapshot gaps, and a DTO that mixes live data with the snapshot

> ✅ **Status: Fixed** (2026-10-12) — Order lines and orders freeze their facts at placement; payment extras, emails and screens read the frozen values.
>
> **How it was fixed**
> - `lineSnapshotFacts` (`checkoutPlacementService.ts:58`) writes `snapshot.productType` and `snapshot.variantLabel` on every online order line. POS orders now write both too (`posService.ts`). The label comes from one shared helper, `variantOptionsLabel` (`productVariant.service.ts:11`), also used by the POS catalog.
> - Orders also freeze `currencyCode` (ISO code) next to the `currency` reference, at placement and in POS (`productOrder.ts:270`, armonia schema-def and DTO).
> - `fulfillOrderPaidExtras` decides by `snapshot.productType` (falling back to the live type for older orders) and honours products deleted after purchase (`orderPaidFulfillmentService.ts:51`).
> - The per-rate `taxBreakdown` is persisted (E-11).
> - N-07: the panel order sheet shows the frozen `snapshot.variantLabel` ("Options" in 5 locales), and the shop's order history shows it too. The live `product` / `variant` refs stay in the DTO only as navigation links, as the audit allows.
> - Emails use the frozen `currencyCode` (N-08).
> - **Tests:** `commerceFlows.test.ts` › "freezes the product type and the chosen options onto the order lines"; `giftCardAndExtras.test.ts` › two tests on the frozen type.

- **Category:** Snapshot
- **Confidence:** Confirmed.

**Evidence**
- The line snapshot is `{title, sku, imageUrl}` only (`checkoutPlacementService.ts:310-321`).
- `taxBreakdown` is copied from a checkout field that nothing ever writes (`:327`; grep shows reads only).
- `currency` is a reference.
- `fulfillOrderPaidExtras` selects gift-card / digital products **live** at payment time (`orderPaidFulfillmentService.ts:40-46`).
- The DTO populates `product` (title, slug, sku, **status, type, currency**) and `variant` (**sku, attributeCombination, price**, status) from live documents (`productOrderMapper.dto.ts:43-44`, snippets in `productVariant.snippets.ts:5-12`, `product.snippets.ts:6-16`).

**Execution path.** Order → a variant's options or price are edited → the admin order view shows the new options and price. Or: a COD order for a digital product → staff replaces the product's documents → `markPaid` delivers the new files.

**Expected behavior.** Historical facts come only from the order.

**Impact.**
- Support and accounting can't tell what was sold.
- Wrong entitlements.
- Tax audits lack rate detail.

**Recommended fix**
- Add `snapshot.variantLabel` (joined attribute values) and `snapshot.productType` at placement.
- Persist `taxBreakdown` from the tax provider (return the rates alongside the total).
- Snapshot the currency `abbreviation`.
- `fulfillOrderPaidExtras` uses `snapshot.productType`.
- Stop exposing live `variant.price` and `status` in the order DTO.

**Regression tests.** #1, #2.

**Dependencies and risks.** No faithful backfill is possible. Leave old orders' new fields empty and make the DTO fall back explicitly ("current data").

---

### E-11 [P2] — Product-type tax rates never apply; no tax detail is persisted

> ✅ **Status: Fixed** (2026-10-12) — Type-scoped rates apply, and the per-rate breakdown is stored.
>
> **How it was fixed**
> - The tax provider contract now returns `{amount, breakdown}`; the internal zone provider records each applied rate (`taxCalculationService.ts`).
> - New `calculateLinesTax` (`taxCalculationService.ts:145`) groups lines into physical (`physical` / `variable` / `bundle`), digital, and the rest, spreads the discount by value, taxes each group with its `productType`, and merges the breakdown by name and rate.
> - `/checkout/shipping` stores `taxTotal` and `taxBreakdown` (`checkout.ts:289-296`). `/address` and cart re-sync clear the breakdown. Placement already copies it onto the order.
> - **Unchanged:** service and gift-card lines still take only "all" rates, as before (gift-card taxation is an open question).
> - **Tests:** `commerceFlows.test.ts` › "applies type-scoped rates per line group and keeps the per-rate breakdown".

**Evidence.** `/shipping` calls `calculateTax(subtotal − discount, address, company)` with no context (`checkout.ts:288`). `rateApplies` then only accepts `appliesTo: "all"` (`taxCalculationService.ts` `rateApplies`). The TaxZone schema allows `physical` / `digital`.

**Impact.** Configured physical/digital rates are silently ignored, and no rate detail is stored (see E-10).

**Recommended fix.** Compute tax per line type (meta already carries the product type in `cartPricingService`), sum, and persist the breakdown.

**Regression tests.** #7.

**Dependencies and risks.** Whether gift-card lines should be taxed is a business decision (§16).

---

### N-05 [P2] — Collection membership has two unsynced sources

> ✅ **Status: Fixed** (2026-10-12) — Discounts and pricing rules resolve collection membership from the collections themselves (your decision), the same way the storefront does.
>
> **How it was fixed**
> - New `collectionIdsByProduct(productIds, company)` (`collectionMembership.ts:70`): manual collections by their product list, dynamic ones by running their rules against the cart's products (reusing `applyCollectionMembershipToProductFilter`).
> - `repriceCart` takes each line's `collectionIds` from it (`cartPricingService.ts:109`) instead of `Product.collections`, which pricing no longer reads.
> - **Tests:** `commerceFlows.test.ts` › "resolves manual and rule-based collections from the collections themselves".

**Evidence**
- Storefront collection pages filter by `Collection.products` (manual) or the collection's rules (dynamic) (`utilities/services/collection/collectionMembership.ts`).
- Collection-targeted discounts and pricing rules use `Product.collections` (`cartPricingService.ts:112`, `discountValidationService.ts` `lineIsEligible`, `pricingCalculationService.ts` `lineMatchesRule`).
- A grep finds no code writing one from the other.

**Impact.** "Summer collection −20 %" doesn't apply to products that appear in the collection, or applies to products that don't; dynamic collections never qualify.

**Recommended fix.** Resolve membership via `applyCollectionMembershipToProductFilter` at pricing time, or derive `Product.collections` when a collection changes. One source of truth is a decision to make (§16).

**Regression tests.** #21.

---

### E-12 [P2] — Revert-to-draft and Duplicate silently go live again

> ✅ **Status: Fixed** (2026-10-12) — Drafts no longer go live by themselves.
>
> **How it was fixed**
> - `duplicate` no longer copies `publishedAt` (`product.actions.ts:68`). `revertToDraft` sets `publishedAt: null` (`:178`), so the scheduled-publish job (`publishedAt <= now`) no longer matches it.
> - **Tests:** none automated.

**Evidence**
- `duplicate` spreads `original.toObject()` minus a small list, which keeps `publishedAt` (`product.actions.ts:47-70`).
- `revertToDraft` keeps `publishedAt` (`:145-165`).
- The job activates `status: "draft", publishedAt <= now` every 5 minutes (`scheduledPublishJob.ts:14-17`).

**Impact.** A product pulled from sale, or an unreviewed "(Copy)", goes live within 5 minutes.

**Recommended fix**
- `duplicate`: omit `publishedAt`.
- `revertToDraft`: `$unset publishedAt`, or make the job act only on drafts whose `publishedAt` is in the future relative to their last status change (decision needed).

**Regression tests.** #18.

---

### E-13 [P2] — Unique keys ignore soft-delete (corrected in the second pass)

> ✅ **Status: Fixed** (2026-10-12) — Deleted rows no longer block their codes, restores are checked, and slugs never collide. Only the PATCH duplicate-key 500 remains, with the core E-14 ticket.
>
> **How it was fixed**
> - Slug generation counts soft-deleted rows (`slugGenerationService.ts:27`), done in the first round. Slug indexes stay as they are, so URLs of deleted items are never reused.
> - Product GTIN / UPC / EAN, warehouse code, discount code, product attribute name and customer group name are now unique among **live** rows only (partial `deletedAt: null`, e.g. `product.indexes.ts:18`).
> - Restore of those five models goes through one shared handler, `restoreUnlessKeyTaken` (`restoreUnlessKeyTaken.ts:14`): it refuses when a live row now holds one of the keys, using the same `<model>_already_exists` code create uses.
> - Locale messages added for `product_already_exists`, `warehouse_already_exists`, `discount_already_exists`, `productAttribute_already_exists`, `customerGroup_already_exists`, `productCategory_already_exists` and `productCollection_already_exists` (they used to show an empty message).
> - New migration `yarn migrate:sync-ecommerce-indexes` (dry run by default): lists, then drops and rebuilds, the changed indexes. API autoIndex can't change an existing index of the same name. It refuses the inventory index while duplicate live rows exist.
> - **Tests:** `commerceFlows.test.ts` › "refuses to restore a warehouse whose code a live warehouse took meanwhile".
> - **Deployment:** run the migration dry run, then `--execute`, per environment (dev dry run lists exactly these five indexes).

**Evidence**
- These unique indexes include deleted rows: products (slug, gtin, upc, ean), warehouses (code), product categories (slug), discounts (code), product attributes (name), customer groups (name), collections (slug).
- `generateUniqueSlug` counts with the soft-delete filter (`slugGenerationService.ts:24-26`), so for non-admins it proposes a slug the index already holds, and the create fails with `product_already_exists`. Admins see deleted rows and get a suffixed slug (E-17).
- PATCH duplicate-key errors aren't mapped (`baseCrudService.ts:653`), so the caller gets a 500.

*Correction:* restore conflicts can't happen on these non-partial indexes, because the replacement could never take the key. They apply only to partial-index models. productReview handles them; customerGroupMember is unverified; inventory will need it after the E-03 fix.

**Impact.** Deleted keys are permanently blocked; behaviour differs by role; 500s on edit.

**Recommended fix**
- Make slug generation `withDeleted` (one line).
- Map 11000 in the `updateById` operator branch.
- Moving the other indexes to `partialFilterExpression: {deletedAt: null}` is a business decision: it requires a restore-time conflict check per model.

**Regression tests.** #3.

---

### E-14 (+N-16) [P2] — The generic PATCH path skips validators, the audit log and duplicate-key mapping

> ✅ **Status: Fixed** (2026-10-12; core part in §23) — Operator updates now run validators, write the audit entry and map duplicate keys; the local price guard stays.
>
> **How it was fixed**
> - `assertPricedWhenActive` (`product.actions.ts:31`): an `active` product without variants must have a price (`null` / `""` refused, `product_price_required`). It is enforced on product create and edit (`checked/product.ts:58`, using the effective status, price and `hasVariants` after the edit) and on `publish`. The scheduled-publish job skips unpriced drafts (`scheduledPublishJob.ts:19`).
> - **Core (§23):** `baseCrudService.updateById`'s operator path (`baseCrudService.ts:651`) runs update validators (`runValidators: true`; they check only the changed paths, so legacy documents aren't re-validated), writes the same UPDATE audit entry the save hook writes — diffed from the document it already loads, in the caller's transaction (`auditOperatorUpdate`, `auditPlugin.ts:50`) — and returns the old document when `returnNew: false`. Create and update map a duplicate key to `<model>_already_exists` and a rejected or uncastable value to the new `field_value_invalid` naming the field (`toWriteError`, `:607`) instead of a 500.
> - **Tests:** `commerceFlows.test.ts` › "assertPricedWhenActive"; `baseCrudServiceWrites.test.ts` (validators, audit in the transaction, duplicate key, `returnNew: false`); `httpRoutes.test.ts` › "audits an edit with its diff and actor", "answers a duplicate key with a 400, not a 500".

- **Category:** Database / Architecture
- **Confidence:** Confirmed.

**Evidence**
- `crudRouterFactory` always sends `{$set, $unset}` (`:589-602`).
- `updateById` with `auditUserId` and operators goes through `this.model.updateOne` (`baseCrudService.ts:634-656`). That runs no validators and no audit plugin (the code says so in a comment), and maps no duplicate-key error.
- The edit zod accepts `""` for every optional field (`armonia/src/modules/core/helpers/schemaDefBuilder.ts:643`). `buildUpdateDataFromSchemaDef` passes `""` through. Mongoose casts `""` to `null` for numbers (`mongoose/lib/cast/number.js:19-20`).
- `price` isn't required for active products, and cart pricing uses `product.price ?? 0` (`cartPricingService.ts:96`).

**Impact**
- **No audit trail for any panel edit**: prices, discounts, stock thresholds, statuses.
- An active product without a price sells for 0.
- `""` is stored for enums.
- An objectId sent as `""` returns a 500.

**Root cause.** A core design trade-off in `updateById`.

**Recommended fix**
- Core (separate ticket, platform-wide): `runValidators: true` on the operator path; compute the audit diff from `existing` (already loaded by the router); map 11000.
- eCommerce, local: reject activating or editing an active product without a price.

**Regression tests.** #15, #24.

**Dependencies and risks.** The core change affects every module. Some legacy documents may fail validation once validators run.

---

### E-15 [P2] — Fulfillment integrity

> ✅ **Status: Fixed** (2026-10-12; status derivation in Phase 2a — §21) — Fulfillments are validated and locked, "ship" ships only what's left, and the order's statuses follow its shipments.
>
> **How it was fixed**
> - New `FulfillmentService.remainingQuantities(order)` (`fulfillment.service.ts:15`): ordered quantity minus pending/shipped/delivered fulfillments, per order line.
> - Fulfillment create loads the order company-scoped (404 otherwise) and rejects items beyond what's left (`fulfillment_quantity_exceeds_order`, `fulfillment.ts:44`). `order` and `items` are stripped from edits (`:54`).
> - The order `ship` action ships only the remaining quantities (`productOrder.actions.ts:210`) and refuses when nothing is left (`order_already_fulfilled`).
> - **Phase 2a:** `syncOrderFulfillment` (`orderFulfillmentService.ts:185`) derives the order from its non-failed fulfillments after every ship, deliver and fail action: every line shipped → `fulfilled`, some → `partially_fulfilled`, none → `unfulfilled`; the order moves to `shipped` when everything has left, to `delivered` once every non-failed shipment is delivered, and back to `processing` when a fully shipped order's shipment fails. Only `confirmed` / `processing` / `shipped` orders move (`:22`); pending, cancelled and refunded orders keep their status. The timeline gets `order_<status>` when the status changed, otherwise `order_partially_shipped` / `shipment_delivered` / `shipment_failed`. The buyer's "delivered" email goes out once, when the whole order is delivered, instead of per parcel.
> - Fulfillment CRUD can't write `status`, `shippedAt` or `deliveredAt` (they aren't in `FulfillmentSchemaDef`), so a created fulfillment always starts `pending` and stock only moves through the ship / fail actions.
> - **Tests:** `commerceFlows.test.ts` › "ships only what earlier fulfillments haven't covered, then refuses a second full ship", and the four "stock leaves at shipment" tests (§21).

**Evidence**
- The order `ship` action creates a Fulfillment for **every line in full** (`productOrder.actions.ts:209-225`) regardless of existing fulfillments.
- Fulfillment CRUD uses the plain schema-def builders (`fulfillment.ts`): there's no check that the order belongs to the company, that `orderItemId`s belong to the order, or that quantities ≤ remaining; `order` and `items` stay editable after shipping.
- Any `ship` sets the order to `fulfilled`.

**Impact.** Double shipments in records, wrong fulfillment status, fulfillments pointing at foreign or invalid lines.

**Recommended fix.** Phase 2a `orderFulfillmentService` (already designed). Short term: validate items on create and lock `order` / `items` after create.

---

### E-16 [P2, known design gap] — COD stock timing

> ✅ **Status: Fixed** (2026-10-12, Phase 2a — §21) — The order owns its stock holds, and on-hand drops when a shipment leaves, not at payment.
>
> **How it was fixed**
> - `ProductOrder.reservations` reuses the checkout's hold sub-schema (`stockReservationsField`, `checkout.ts:45`; `productOrder.ts:491`, system-managed, hidden from tables) plus a `fulfillment` link on consumed entries. At placement the checkout's still-held entries are copied onto the order and the checkout's list is emptied (`checkoutPlacementService.ts:369`, `:407`).
> - Payment no longer touches stock: the paid placement, `markPaid` and the webhook's paid branch stopped consuming; `consumeCheckoutReservations` is removed.
> - Shipping consumes (`consumeForShipment`, `orderFulfillmentService.ts:76`), called by the order `ship` action and the fulfillment `ship` action: shipped lines → `trackedStockLines` (bundles as components) → matching `reserved` holds are sold through `inventoryService.confirmSale`, a hold is split when only part of it ships, each piece is linked to the Fulfillment and gets a `sale` movement referencing it. Units nobody held (an order paid while out of stock — `stock_shortfall` — or older data) are reserved and sold on the spot, or the shipment is refused with `out_of_stock`.
> - A shipment marked failed after it left (refused COD, returned to sender) reverses its sale (`reverseShipment`, `:141`; `inventoryService.reverseSale`): the units are back on hand **and held** for the order, with a `return` movement, so it can ship again — or, when the order is already cancelled / refunded, released (`fulfillment.actions.ts:209`). With the order back in `processing` (E-15), a refused COD order can now be cancelled, which releases the stock.
> - Cancel and full refund release whatever the order still holds (`releaseReservations`, `inventoryReservationService.ts:204`, generalised from the checkout version). The old "restock consumed units when refunding an unfulfilled order" path is gone — nothing is consumed before shipment. Shipped goods come back through a return, which now restocks into the warehouse the order's consumed hold shipped from (`returnRequest.actions.ts:100`).
> - The order delete guard (E-05) reads the order's own holds (`productOrder.ts` route `:105`).
> - **Migration:** `yarn migrate:order-reservations` moves holds of already-placed orders, and puts stock that payment already consumed back on hand and held for orders that haven't shipped (see §21).
> - **Tests:** §12 rows 33–36.

On-hand drops only at `markPaid`. A shipped COD order is in `CANCEL_BLOCKED` (`productOrder.actions.ts:40`), so a refused delivery keeps its hold forever and the shipped goods remain on hand until payment. This is already planned as Phase 2a (ship-time consumption).

**Regression tests.** #10, #33–#36.

---

### E-17 [P2] — Soft-delete visibility depends on who is calling

> ✅ **Status: Fixed** (2026-10-12; core part in §23) — Every eCommerce selling, pricing and stock path ignores soft-deleted rows for every caller, and the delete check counts live references only, for everyone.
>
> **How it was fixed**
> - Round 1: stock operations (`deletedAt: null` in `InventoryService`; reservation, storefront availability, Restock/Deduct, POS stock writers).
> - Round 2: explicit `.noDeleted()` / `deletedAt: null` on pricing rules (`pricingCalculationService.ts`), discount lookups and use-counting (cart, reprice, `assertDiscountUsable`, `consumeDiscount`, free shipping), cart and pricing variant lookups, POS variant price, tax zones and shipping zones.
> - **Core (§23):** `assertCanDelete` counts only live references for every caller (`relationsRegistry.ts:116`); before, admins were blocked by soft-deleted ones. The plugin's admin visibility stays as designed: it is what lets admins list and restore deleted rows, and business paths no longer depend on it.
> - **Tests:** `httpRoutes.test.ts` › "count only live references, for admins too (E-17)".

**Evidence**
- `softDeletePlugin.ts:102-112` includes deleted documents in **every** query (find, update, count, populate) when `requestContext.actionUserCtx.isAdmin`.
- Crons have no context.
- eCommerce business logic mostly doesn't call `.noDeleted()`: inventory key operations, `assertCanDelete` counts, `PricingRule.find`, `ProductVariant.findOne` in cart and POS.

**Impact.** The same operation has three behaviours:
- admin actions consume, release or restock **deleted** stock rows;
- deleted pricing rules and variants apply for admin buyers and cashiers;
- `assertCanDelete` counts deleted references for admins only;
- slug generation differs by role.

**Recommended fix.** Add explicit `.noDeleted()` in the eCommerce business paths: inventory service, reservation, pricing, POS variant lookup. Don't change the plugin, because admin restore UIs across modules depend on it.

**Regression tests.** #25.

---

### E-18 [P2] — There are no eCommerce tests

> ✅ **Status: Fixed** (2026-10-12) — eCommerce has tests again.
>
> **How it was fixed**
> - Restored `commerceFlows`, `giftCardAndExtras` and `inventoryReservation` from `1b0d5d7^`. They were adapted to the tracking rule (products must exist to count as tracked).
> - Added tests for the fixes above, and a new `checkoutExpiry.test.ts` on an in-memory replica set (transactions).
> - **Result:** round 1 — 4 eCommerce suites, 58 tests (maestro 362/362); round 2 — 65 eCommerce tests plus a core post-commit suite (maestro 44 files, 372/372 passing).

Commit `1b0d5d7` (2026-10-11, "Demo Data fixed") deleted `__tests__/{commerceFlows, giftCardAndExtras, inventoryReservation}.test.ts`. The Phase 1 work was lost without any signal. **Fix:** restore from git (`git show 1b0d5d7^:__tests__/…`) and add the §12 scenarios.

---

### P3 findings (compact)

| ID | Finding | Evidence | Fix | Status |
|---|---|---|---|---|
| E-19 | A variant can be re-parented to another product, orphaning its stock rows; `hasVariants` isn't derived from the variants; no SKU or attribute-combination uniqueness | `checked/productVariant.ts` `afterUpdate` | lock `product` after create; derive `hasVariants` | ✅ Fixed: a variant can't change product (`delete data.product`, `checked/productVariant.ts:97`); create, edit and restore refuse a second live variant with the same options (`assertCombinationFree`, `:34`, `variant_combination_exists`); `hasVariants` and `variantCount` are derived from live variants on create/delete/restore (`syncProductVariants`, `:58`). SKU stays non-unique by design (Odoo doesn't enforce it either) |
| E-20 | Returns don't restock or link to a refund; `refundAmount` is unbounded; editable after resolution | `returnRequest.actions.ts` | Phase 4 | ✅ Fixed: create checks the order is the company's, not a till sale, items ≤ shipped minus other returns (`returnableQuantities`, `returnRequest.service.ts:21`), refund ≤ value of the returned items (`returnedItemsValue`, `:44`); order, items and type are locked, refund only editable while pending; **receive** restocks returns/exchanges into the warehouse each item was sold from with `return` movements (`restockReturnedItems`, `returnRequest.actions.ts:88`); **complete** refunds `refundAmount` through the shared `refundProductOrder` (`productOrder.actions.ts:445`), needs `productorders[write:paymentStatus]`; exchanges don't refund. Tests: two `returns` tests |
| E-21 | Stripe calls and emails inside DB transactions; no transient-error retry (contention → 500); a refund retried with a *different* amount after a post-gateway abort issues a second real refund (the key includes the amount) | `productOrder.actions.ts:461-467`, `asyncHandler.ts` | send notifications after commit; key the refund on order + attempt | ✅ Fixed: notifications go out only after the transaction commits (core `runAfterCommit`, flushed by `asyncHandler` and the background placement); the refund idempotency key no longer includes the amount (`productOrder.actions.ts:500`); `asyncHandler` replays a request whose transaction hits a transient error (write conflict) in a fresh transaction, up to 3 attempts, and retries a commit with an unknown outcome (§23). Gateway calls stay inside the transaction: the replay is safe because they carry idempotency keys |
| E-22 | Inventory, fulfillment and return create accept foreign-company product, warehouse or order ids; inventory `afterCreate` pushes into the product by id without a company filter | `inventory.ts:42-50` | validate refs by company | ✅ Fixed: inventory create checks product, warehouse and variant belong to the company and the variant to the product (`assertOwnReferences`, `inventory.ts:46`); fulfillment (E-15) and return (E-20) creates check the order is the company's |
| E-23 | Cart lines in different currencies are summed; weight units aren't converted; digital-only orders still need a shipping rate | `cartPricingService.ts`, `checkout.ts` | currency check on add; `requiresShipping` | ✅ Fixed: adding a product priced in another currency than the cart's is refused (`cart_currency_mismatch`, `cart.ts:127`); checkout converts weights to kg before shipping rates (`checkout.ts:39`, assumes zone weight limits are in kg); a cart with nothing to ship gets one free "No shipping required" rate (`checkout.ts:258`) |
| E-24 | No category cycle guard; deleted categories stay on products; admins can create reviews attributed to the customer | category route, `checked/productReview.ts` `buildCreateData` | cycle check; reviewer = actor | ✅ Fixed: a category can't be moved under itself or a descendant (`assertNotOwnAncestor`, `checked/category.ts:19`, `category_parent_cycle`); only the buyer can write a review on their order (`checked/productReview.ts:88`). Deleted category ids stay on products (harmless; restoring the category restores the link) |
| N-08 | Emails go to the live account email, not the checkout contact email; amounts are printed without currency | `productOrderNotify.ts:44-69,30-37` | pass the currency; decide the address | ✅ Fixed: amounts in order emails are formatted in the order's currency (`productOrderNotify.ts:46`); emails go to the contact address the buyer gave at checkout (`order.email`), falling back to the account login, with the account's name (§23, `productOrderNotify.ts:63`) |
| N-09 | Analytics revenue sums across currencies; `store_overview` groups by currency | `analytics.ts:97-115`, `storeOverviewTool.ts` | group by currency | ✅ Fixed: revenue and top-product figures are for one currency, `?currency=` or the one with most paid orders, and the response lists all currencies with sales (`revenueCurrency`, `analytics.ts:94`; armonia response types extended additively). The panel shows the dominant currency's figures until a picker is added |
| N-11 | POS ignores pricing rules, customer groups, min/max/step and variant status | `posService.ts`, `posLinePrice.ts` | business decision | ⏸ Not changed: business decision (POS keeps base prices) |
| N-12 | Price and availability are frozen at `/init`; archived, deleted or repriced products are still placed within the TTL | `checkout.ts` | business decision | ⏸ Not changed: business decision (price held for the 30-minute checkout) |
| N-13 | An admin re-delete rewrites `deletedAt`/`deletedBy` and re-runs `afterDelete`; restore `$push`es ids (duplicates possible); POS-upserted rows never reach `product.inventories` | `crudRouterFactory.ts:642-655`, `inventory.ts:91-106` | `$addToSet`; reject deleting an already-deleted row | ✅ Fixed: restores and creates use `$addToSet`; stock rows created by upsert are linked to their product by `InventoryService`; inventory restore refuses a duplicate live row; deleting an already-deleted row is refused for admins too, so `deletedAt` / `deletedBy` and `afterDelete` don't run again (§23, `crudRouterFactory.ts:646`) |
| N-14 | Nested or self-referencing bundles aren't validated (exploded one level only) | `inventoryReservationService.ts:30-73` | validate on save | ✅ Fixed: bundle components must be live, non-bundle products of the company and not the bundle itself (`assertValidBundle`, `product.actions.ts:47`, on create and edit; `bundle_component_invalid`). Tests: `assertValidBundle` |
| N-15 | Staff can re-enable a gift card that a full refund disabled | `finance/api/finance/private/giftCard.ts:50-54` | record `disabledReason`; block re-enable | ✅ Fixed: a full refund marks the cards it disables `revokedByRefund` (`giftCard.ts:63`); the enable action and PATCH refuse to reactivate them (`gift_card_revoked_by_refund`, `giftCard.actions.ts:58`). Tests: "gift cards revoked by a refund" |
| E-25 | Gift-card balance changes have no ledger; audit rows are written outside the transaction | `giftCard.service.ts`, `auditPlugin.ts` | optional | ⏸ Not changed: a gift-card ledger would need a new collection with no current consumer; audit rows outside the transaction are core |
| E-26 | AI read tools (orders, inventory, discounts) have no per-tool field permissions (MAY_OR_MAY_NOT_BE; AI is disabled) | `domain/ai/tools/*` | verify channel gating | ✅ Fixed: each eCommerce AI tool requires the panel's read permission for its data (e.g. `productorders[read:grandTotal]`) or admin, via new core `requirePermission` (`assistantToolAccess.ts:79`); refusals use the existing `accessDenied` envelope (message made permission-neutral) |
| — | Staff-configured postal-code patterns are compiled with `new RegExp` (ReDoS by staff only) | `taxCalculationService.ts`, `shippingCalculationService.ts` | escape before replacing `*` | ✅ Fixed: tax and shipping postal patterns are escaped, only `*` stays a wildcard (`taxCalculationService.ts:45`, `shippingCalculationService.ts`) |

---

## 14. Prioritized remediation roadmap

| Tier | Item | Invariant protected | Modules | Migration / repair | Compatibility risk | Independent? | Status (2026-10-12) |
|---|---|---|---|---|---|---|---|
| Immediate | E-01 POS / fiscal gates | only authorised staff move money and stock | eCommerce, sinfonia sidebar | role grants | cashier roles lose access until granted | yes | ✅ Done |
| Immediate | E-02 member gates | pricing tiers are staff-assigned | eCommerce | — | none | yes | ✅ Done |
| Immediate | N-01 POS VAT | fiscal reports match the tax due | eCommerce POS / fiscal | credit notes for past invoices (business) | receipt totals change | needs a business decision | ✅ Done (TaxZones, VAT-inclusive) |
| Immediate | E-03 index + by-`_id` adjust | one row per stock key | eCommerce | duplicate check, then `syncIndexes` | build fails on duplicates | yes | ✅ Done (index build pending deploy) |
| Immediate | E-04 delete / deactivate guards, reservation filter, checked results | stock ops always hit a live row | eCommerce | `reconcileInventoryReserved` dry run | blocks some deletes | yes | ✅ Done |
| Immediate | E-05 order delete guard | holds and credit are never orphaned | eCommerce | reconcile | none | yes | ✅ Done (refuse instead of release) |
| Short-term | N-04 + E-07 transactional, conditional expiry | each hold is released at most once | eCommerce | — | — | yes | ✅ Done |
| Short-term | E-06 webhook ordering; delete the finance copy | captured money always becomes an order | eCommerce, finance | Stripe endpoint check | — | yes | ✅ Done |
| Short-term | N-02, N-03 POS refund guard; POS extras / bundles | one refund path per sale | eCommerce | — | UI | yes | ✅ Done (gift card / digital blocked at POS) |
| Short-term | E-08, E-09 (re-land Phase 1) | one tracking rule; POS lines valid | eCommerce | `disableTrackingWithoutInventory` dry run | — | yes | ✅ Done (migration dry run pending) |
| Short-term | E-12, E-13 (slug), E-14 (local price guard) | drafts stay draft; keys usable | eCommerce | — | — | yes | ✅ Done |
| Short-term | E-10, E-11 snapshot and tax detail | history is self-contained | eCommerce, armonia DTO | none (no backfill) | DTO additive | yes | ✅ Done |
| Short-term | E-18 tests | regressions are caught | eCommerce | — | — | yes | ✅ Done |
| Medium | E-16 / E-15 / N-06 Phase 2a (+ 2b POS through `InventoryService`) | stock leaves at shipment; partial fulfillment | eCommerce | in-flight order migration | high | no | ✅ Done (§21; `migrate:order-reservations` runs at deploy) |
| Medium | E-17 explicit `.noDeleted()` | same behaviour for every actor | eCommerce, core | — | admin behaviour changes | yes | ✅ Done (core delete check in §23) |
| Medium | E-14 core validators / audit | every edit is validated and audited | core (all modules) | — | only changed paths are validated | yes | ✅ Done (§23) |
| Medium | N-05, E-19, E-20 | — | eCommerce | — | — | yes | ✅ Done (N-05, E-19, E-20) |
| Optional | E-21 to E-26, N-08 to N-15 | — | — | — | — | yes | ✅ Done (see P3 table; E-25, N-11, N-12 deliberately not) |
| Medium | Phase 2c–2f: operator UI, stock transfers, stock counts, role packs | every stock change is a ledgered document; staff get scoped roles | eCommerce, armonia, sinfonia | none (new collections) | none | yes | ✅ Done (§22) |

---

## 15. Unresolved questions and assumptions

1. Do shop buyers always sign up into the merchant company? In dev, the only company is the default signup company. This sets E-01's severity.
2. Is Stripe configured to call `/api/finance/paymentsWebhook/stripe`?
3. Warehouse deletion policy: block, require a transfer, or write off?
4. POS VAT source (product `taxClass` vs POS config); is the merchant VAT-registered for CIS?
5. Should gift-card lines be taxed? (Assumed no for multi-purpose vouchers; needs confirmation.)
6. Should admins' business actions ever operate on soft-deleted rows?
7. Collection membership: which source of truth?
8. Was Phase 1 (2026-10-03) dropped intentionally, or lost?
9. Should POS apply online pricing rules and customer groups (N-11)?
10. Price lock during the checkout TTL (N-12): intended?
11. Assumption: monetary values are major units rounded with `roundMoney` (2 decimals). Zero- or 3-decimal currencies are not handled. Verify whether any are configured.

**Read-only scripts** (session scratchpad, not committed): `listIndexes.js`, `dupInventory.js`, `companies.js`.
- `listIndexes.js` — runs `db.collection(name).indexes()` for each argument.
- `dupInventory.js` — `$group` on `{product, variant ?? null, warehouse, company}` where `deletedAt: null`, with `n > 1`, plus negative and reserved counters.

---

## 16. Files and execution paths inspected

**core**
- `api/crudRouterFactory.ts`, `api/buildUpdateDataFromSchemaDef.ts`
- `database/services/baseCrudService.ts`, `database/relationsRegistry.ts`
- `database/plugins/{softDelete,ownership,lifeCycle,audit}Plugin.ts`
- `utilities/middlewares/{authMW,transactionHandler,asyncHandler,transactionUtils}.ts`
- `utilities/endpoints/routeRegistry.ts`
- `database/schemas/role/role.defaults.ts`, `api/user/public/{signUp,login}.ts`
- `database/schemas/company/company.ts` (demo seed trigger)
- `initializer/index.ts` (`syncAllIndexes`)

**armonia**
- `core/helpers/schemaDefBuilder.ts`
- eCommerce product / inventory / fulfillment / returnRequest / taxZone schema-defs
- `posOrder/payPosOrder.form.validator.ts`

**eCommerce routes:** all files under `api/eCommerce/private` and `public`.

**eCommerce actions:** all `*.actions.ts`.

**eCommerce schemas:** all `*.indexes.ts`; `product`, `productOrder`, `inventory`, `checkout` (reservations), `productVariant` / `product` snippets.

**eCommerce services**
- `cartPricingService`, `checkoutPlacementService`, `inventoryReservationService`, `inventory.service`
- `discountValidationService`, `pricingCalculationService`, `taxCalculationService`, `shippingCalculationService`
- `orderNumberService`, `orderPaidFulfillmentService`, `productOrderNotify`
- `posService`, `posTillOps` (receipt, customers, hold), `posLinePrice`, `posKillSwitch` (force close)
- `warehousePosConfigGuard`, `collection/collectionMembership`, `slugGenerationService`, `money`

**eCommerce other**
- crons: `checkoutExpiryJob`, `scheduledPublishJob`
- `utilities/fiscalization/fiscalizationService` (line mapping), `ublInvoice` (VAT fields)
- `utilities/mappers/productOrder/productOrderMapper.dto.ts`, `shopProduct` stock
- `domain/ai/tools/*` (names and mutation check)
- `kafka/kafkaConsumer.ts`

**finance**
- `api/finance/public/paymentsWebhook.ts`
- `api/finance/private/{giftCard,paymentTransaction}.ts`
- `paymentTransaction.service.ts`, `giftCard.service.ts`, `giftCard.actions.ts`

---

## 17. Areas not audited and why

| Area | Why |
|---|---|
| sinfonia panel and shop (whether `""` is sent for cleared numbers, pending-order delete exposed, live variant data rendered) | backend-only scope |
| Live Stripe (3DS, redirects, real webhooks) | no test keys |
| Production DB indexes and data | only the dev DB was reachable; scripts are provided to run read-only |
| Transactions on the production topology | dev is replica set `rs0` behind mongos; production not inspected |
| eCommerceMarketplace escrow routes | a separate module; only one permission gate was seen in `escrowTransaction.ts` |
| AI-channel permission gating | core AI module; feature disabled |
| Kafka consumer retry and idempotency (duplicate emails) | infrastructure; not traced to the broker config |
| Fiscal SOAP fault handling, CIS acceptance rules | external service and legal rules |
| Media lifecycle (deleting media used by order snapshots or downloads) | core media module |
| Low-stock and abandoned-cart crons, cmsBlock, `shopConfig` / `shopTaxonomy` / `shopCountries`, websocket `roomContribution` | read lightly; no integrity-critical writes found |
| Performance and index fit under production volume | no production statistics |

---

## 18. Second-pass (adversarial) review

### 18.1 Corrections to the first pass

| Item | First pass | Correction | Why |
|---|---|---|---|
| E-01 | P0 | P0 **conditional** | Reach depends on signup topology; proven for dev (the default signup company is the only company) |
| E-02 | P1 | P2 | Needs a group ObjectId; no buyer-reachable exposure found |
| E-06 | "existing-order branch non-transactional" | That branch is effectively dead code; the real issue is dedupe-before-process | Stripe orders exist only after a succeeded charge |
| E-11 | gift-card lines taxed = defect | Moved to business questions | Depends on voucher tax rules |
| E-13 | restore conflicts for slug / GTIN | Not possible on non-partial indexes; real issues are permanent blocking, the role-dependent slug and the PATCH 500 | Index includes deleted rows, so no replacement can exist |
| E-14 / E-25 | separate findings, audit gap P3 | Merged: one root cause; audit gap raised to P2 | Every CRUD PATCH takes the `updateOne` branch |
| E-16 | defect | Known design gap (Phase 2a) | Documented decision in the Phase 2 design |
| E-09 | fractional quantity "suspected" | Confirmed | armonia validator `min 0.0001` vs order `min 1` |
| "Refunds capped at remaining" | verified OK | Per charge only; N-02 bypasses it across paths | Two refund implementations |
| Phase 1 | "rolled back" | "Absent from the code and from git history" | Revert vs never-committed can't be distinguished |

### 18.2 New findings from the second pass
N-01 (P1), N-02, N-03, N-04, N-05, N-06, N-07 (merged into E-10), N-16 (merged into E-14) — all P2. N-08, N-09, N-11 to N-15 — P3. Each is in §13.

### 18.3 Alternate paths checked against the first-pass safeguards

| Safeguard | Alternate path | Result |
|---|---|---|
| Field-tag gates on order actions | POS / fiscal routes, `customerGroup` members | **bypass** (E-01, E-02) |
| Refund cap per charge | POS till refund vs online refund | **bypass** (N-02) |
| Server-side pricing | POS `hold` / `pay` | OK (`resolvePosLineUnitPrice`); POS ignores pricing rules (N-11) |
| Gift-card issuance on payment | POS sale | **missing** (N-03) |
| Reservation before charge | POS (direct consumption), CRUD inventory create / restore | POS by design; CRUD can create duplicates (E-03) |
| Stock audit (movements) | inventory delete; consume on a deleted row | movement written without a stock change (E-04) |
| Status state machine | product PATCH `status`; scheduled publish | PATCH bypasses `publish` / `archive`; the job reverses drafts (E-12) |
| Gift-card refund disable | gift-card PATCH `status` / `enable` action | staff can re-enable (N-15) |
| POS offline idempotency | concurrent replays | unique index missing; concurrent replays are serialized only because both write the same PosSession document (write conflict). Defense in depth absent (E-03). |
| Payment transaction immutability | CRUD PUT / PATCH / DELETE | blocked (empty builders, write limit 0) — OK |
| Inventory movement immutability | CRUD | blocked (throws) — OK |
| Demo seeding in production | company creation | only from DB-init defaults (`company.defaults.ts`) — OK |

### 18.4 Inconsistent business rules across single, bulk, admin and background operations
- **Stock tracking:** row existence (online) vs `trackInventory` (POS) (E-08).
- **Availability:** any-row (product page) vs single-row (checkout) vs multi-row (POS) (N-06).
- **Soft-delete:** admin HTTP sees deleted rows; non-admin and crons don't (E-17).
- **Pricing:** online applies rules, groups and min/max/step; POS doesn't (N-11).
- **Tax:** zones online, zero in POS (N-01).
- **Revenue:** summed across currencies (analytics) vs per currency (AI `store_overview`) (N-09).
- **Order removal:** cancel releases holds and credit; delete doesn't (E-05).
- **Refund:** online vs POS paths with separate state (N-02).

### 18.5 Risk of the proposed fixes (new or changed)
- **E-01:** a permission regression for existing cashier roles; needs grants plus a UI gate.
- **E-03:** the index build fails on duplicates; `syncIndexes` drops unknown indexes. Don't move reservations to `inventoryId` now (avoids a schema migration).
- **E-04:** blocking every row prevents cleanup; block on non-zero on-hand or reserved only.
- **E-05:** releasing on delete makes restore unsafe; refuse instead.
- **N-04 / E-07:** don't wrap Stripe calls in the transaction; keep the cancel first, then a conditional, transactional release.
- **E-12:** clearing `publishedAt` loses the first publish date (used for sorting / SEO?); decide.
- **E-13:** partial uniques need a restore conflict check on every affected model; prefer the one-line slug fix now.
- **E-14:** a core change affects every module; schedule separately with a regression pass.
- **E-17:** don't change plugin semantics (admin restore UIs rely on them); add `.noDeleted()` locally.
- **E-10:** additive DTO and schema fields; no backfill; mark the fallbacks.
- **No new abstractions are proposed.** Every fix reuses an existing helper:
  - `SchemaGuard`
  - `explodeBundleLines`
  - `placePaidCheckoutInBackground`'s transaction pattern
  - the `productReview` restore check
  - `applyCollectionMembershipToProductFilter`
  - `roundMoney`

### 18.6 Verified correctness vs unproven behaviour

**Verified by reading code (and DB where noted)**
- Cart and POS-pay prices are server-derived; client totals are never trusted.
- Discount `usageCount` is counted atomically with its limit guard; the per-customer check is in place.
- Order numbers come from an atomic `$inc` counter (outside the transaction; gaps are acceptable).
- Reserve uses an atomic `$expr` guard, so no oversell on concurrent online reservations.
- Refunds are capped per charge; `markFailed` never regresses a succeeded charge; `markSucceeded` is idempotent.
- Gift-card redeem is atomic and balance-guarded; download-limit consumption is atomic.
- Public catalog routes are scoped by company, `status: active` and `noDeleted`; search uses `escapeRegex`.
- productReview restore checks for an active sibling.
- `{deletedAt: null}` partial unique indexes build on this cluster (DB).
- Demo data seeds only on DB init.
- Inventory movement, PosOrder and PosSession cannot be created, edited or deleted through CRUD.

**Unproven** (evidence missing)
- Production index state and production duplicates.
- Stripe end-to-end; which webhook URLs Stripe calls.
- Cart concurrency under Mongoose array versioning in practice.
- Transaction semantics on the production topology.
- sinfonia behaviour (`""` payloads, delete exposure, rendering of live variant data).
- Kafka redelivery producing duplicate emails.
- Whether CIS accepts the zero-VAT invoices (and whether any tenant is VAT-registered).
- Whether the N-04 race has ever occurred (needs log or reconcile evidence).

### 18.7 Five most consequential unresolved risks

| # | Risk | Evidence needed to close it |
|---|---|---|
| 1 | **E-01** POS / fiscal open to any company user | Production signup topology (`companies.isDefaultForSignUp` vs merchant tenants); a staging call with a Web Client token to `/pos/currentSession`, `/posOrder/pay`, `/pos/customers`; inventory of roles in use |
| 2 | **N-01** zero VAT reported to the tax authority | Tenants with an active `FiscalConfig` and `isVatRegistered: true`; sample submitted XML; the merchant's legal VAT treatment |
| 3 | **E-03** duplicate stock rows in production | Read-only `listIndexes` plus the duplicate aggregation (§15) on production `inventories` and `posorders` |
| 4 | **Reserved-quantity drift** (E-04, E-05, E-07, N-04) | `yarn migrate:reconcile-inventory-reserved` **dry run** on production; a movement-sum vs on-hand comparison; a staging reproduction of the cron-vs-confirm race |
| 5 | **Money vs record divergence** (E-06, N-02, E-21) | Stripe dashboard endpoint list; webhook error logs; a query of succeeded charges without an order; POS orders with refunds on both the PosOrder and the ProductOrder |

### 18.8 Audit areas that remain unverified
See §17, plus:
- The `customerGroupMember` restore path. No CRUD route was found, so a conflict on its partial unique index is unverified.
- `posKillSwitch` beyond `forceClosePosSession`.
- `lowStockAlertJob` and `abandonedCartJob` correctness.
- Zero- or three-decimal currencies under `roundMoney`.

---

## 19. Remediation status (2026-10-12)

Scope chosen: **Immediate + Short-term**, with these decisions:
- **N-01 POS VAT:** deferred (no reliable rate source yet).
- **N-03:** gift-card and digital products are **blocked** at the till.
- **E-14:** the core `updateById` change is left for a **separate core ticket**; only a local eCommerce price guard is added.

Nothing is committed.

### Implemented

| ID | Change | Files |
|---|---|---|
| E-01 | Every POS / fiscal route and action is gated on field write tags. `posorders[write:state]` covers selling, every till read and fiscalization; `posorders[write:amountRefunded]` covers refunds; `possessions[write:state]` covers open / close / reconcile; `possessions[write:cashMoves]` covers cash moves; `fiscalconfigs[write:tcrCode]` covers TCR registration. To create these tags, `NoWritePermission` was removed from PosOrder `state` / `amountRefunded` and PosSession `state` / `cashMoves`; generic PATCH on these models still throws. The sidebar POS entry now needs `posOrders`. | `posOrder.actions.ts`, `posSession.actions.ts`, `posOrder.ts`, `posSession.ts`, `pos.ts`, `fiscal.ts`, sinfonia `sidebarContribution.tsx` |
| E-02 | `addMember` / `removeMember` require CustomerGroupMember create / delete. | `customerGroup.actions.ts` |
| E-03 | `sparse` dropped from both unique indexes. Inventory create and restore refuse a second live row for the same key. Restock and Deduct update the row they validated (by `_id`). | `inventory.indexes.ts`, `posOrder.indexes.ts`, `inventory.ts`, `inventory.actions.ts` |
| E-04 | Inventory delete is refused while on-hand ≠ 0 or reserved > 0. Warehouse delete is refused while any live row holds stock or holds. Reservation uses only active, non-deleted warehouses. `confirmSale` / `releaseReservation` report whether they matched; release never goes below zero; no `sale` movement is written when no row matched. All stock-key operations (online and POS) target live rows only. | `inventory.ts`, `checked/warehouse.ts`, `inventory.service.ts`, `inventoryReservationService.ts`, `posService.ts` |
| E-05 | A pending order still holding stock or store credit can't be deleted (`order_must_be_cancelled_first`). | `productOrder.ts` (route) |
| E-06 | A webhook event whose processing throws is forgotten, so Stripe's redelivery is processed. The stale `/api/finance/paymentsWebhook/stripe` was removed. | `public/paymentsWebhook.ts`, finance `api/finance/public/paymentsWebhook.ts` (deleted) |
| E-07 + N-04 | Each overdue checkout is re-read and expired in its own transaction, only while still open and overdue. | `checkoutExpiryJob.ts` |
| E-08 | One rule, `isStockTracked`: physical / variable products are tracked unless the product or variant has `trackInventory: false`; digital / service / gift card / bundle never are. It is used by checkout reservation, the storefront and POS (`trackedStockLines`, which also explodes bundles). | `inventoryReservationService.ts`, `shopProduct.ts`, `posService.ts` |
| E-09 | POS explodes bundles. ProductOrder line quantity minimum is 0.0001 (fractional till sales). POS refunds restock into the warehouses the sale drew from (its `sale` movements minus earlier refunds' `return`s). POS `customerId` must belong to the company. | `posService.ts`, `productOrder.ts`, armonia `productOrder.schema-def.ts` |
| N-02 | The online refund rejects POS-originated orders (`refund_via_pos`). | `productOrder.actions.ts` |
| N-03 | Gift-card / digital products are excluded from the POS catalog and rejected by pay / hold. | `posLinePrice.ts`, `posService.ts`, `posTillOps.ts` |
| E-10 | Order lines freeze `snapshot.productType` and `snapshot.variantLabel` at placement. Paid extras go by the frozen type (falling back to the live type for older orders) and honour products deleted after purchase. | `checkoutPlacementService.ts`, `orderPaidFulfillmentService.ts`, `productOrder.ts`, armonia DTO / schema-def, order DTO mapper |
| E-11 | Tax is computed per rate scope (physical / digital / rest) so type-scoped rates apply, and the per-rate `taxBreakdown` is persisted on checkout and order. | `taxCalculationService.ts` (`calculateLinesTax`), `checkout.ts` |
| E-12 | Duplicate no longer copies `publishedAt`; revert-to-draft clears it. | `product.actions.ts` |
| E-13 | Slug generation counts soft-deleted rows (no more collisions for non-admins). | `slugGenerationService.ts` |
| E-14 (local) | An active product without variants needs a price: on create, edit and publish, and the scheduled-publish job leaves unpriced drafts alone. | `product.actions.ts` (`assertPricedWhenActive`), `checked/product.ts`, `scheduledPublishJob.ts` |
| E-15 | Fulfillment create checks that items are lines of the company's order, within what is left to fulfil. Order and items are fixed after create. The order `ship` action ships only the remaining quantities. | `fulfillment.service.ts` (`remainingQuantities`), `fulfillment.ts`, `productOrder.actions.ts` |
| E-18 | Restored `commerceFlows`, `giftCardAndExtras` and `inventoryReservation`, and added `checkoutExpiry` (replica set). | `__tests__/*` |

New error codes were added to all five armonia locale files:
- `inventory_already_exists`
- `inventory_has_stock`
- `warehouse_has_stock`
- `order_must_be_cancelled_first`
- `refund_via_pos`
- `pos_product_not_sellable`
- `pos_customer_not_found`
- `product_price_required`
- `fulfillment_quantity_exceeds_order`
- `order_already_fulfilled`

### Verification
- **maestro `vitest run`:** 43 files, **362/362 passed**. The eCommerce suites hold 58 tests. The cron race test was confirmed to **fail on the pre-fix job** and pass on the fix.
- **Typecheck** (`../sinfonia/node_modules/.bin/tsc --noEmit --skipLibCheck -p .` in maestro): 262 errors, **identical to the baseline** taken with these changes stashed.
- **sinfonia `npm run typecheck`:** 15 pre-existing errors; none in the changed contracts.
- **Runtime import smoke** of every changed route, schema and cron: OK.
- **Not verified:**
  - live HTTP walk (panel, till, storefront) and live Stripe;
  - the webhook rollback, the order / inventory / warehouse delete guards and the POS refund warehouse allocation have no automated test (route-inline hooks and a POS session fixture would be needed).

### Deployment steps (in order)
1. **Behaviour change: tracking rule.** Tracked physical / variable products with **no** stock row are now out of stock online (before, they sold without limit). Run `yarn migrate:disable-tracking-without-inventory` (dry run) and decide whether to `--execute` it, so those products keep selling as before.
2. **Indexes.** Run the read-only duplicate check (§15) against `inventories` and `posorders` in each environment. Merge any duplicates, then let the API build the indexes (autoIndex) or run `syncIndexes`, and confirm with `listIndexes`.
3. **Permissions.** Restarting the API creates the new tags (`posorders[write:state]`, `posorders[write:amountRefunded]`, `possessions[write:state]`, `possessions[write:cashMoves]`). Admin roles receive them automatically; **grant them to every cashier / POS role**, or the till returns `user_permissions_not_sufficient`.
4. **Stripe.** Make sure no Stripe endpoint points to `/api/finance/paymentsWebhook/stripe` (removed, now 404). The live one is `/api/eCommerce/paymentsWebhook/stripe`.
5. **Holds.** Run `yarn migrate:reconcile-inventory-reserved` (dry run) to find holds leaked before these fixes.

### Deliberately not changed
- **N-01** POS VAT (business decision pending).
- **E-14 core:** validators, audit and E11000 mapping on operator updates (separate core ticket).
- **E-16, N-06, partial fulfillment stock:** Phase 2a (done later, §21).
- **E-17:** only the stock paths were fixed; general admin soft-delete semantics are untouched.
- **E-13:** the other soft-delete-blind unique indexes (needs a per-model restore check first).
- **N-07:** the order DTO still exposes the live `variant` / `product` snippets next to the snapshot (a sinfonia contract change).
- POS lines don't snapshot `productType` / `variantLabel` (POS has no gift / digital lines any more).
- **N-05, E-19, E-20, E-21 to E-26, N-08 to N-15:** Medium / Optional tiers.

### Unrelated debt noticed while fixing (reported, not fixed)
- The POS catalog search (`posService.ts` `loadPosCatalog`) puts the raw search text into `$regex` (cashier-only ReDoS); `posTillOps` escapes it.
- `<model>_already_exists` codes from `baseCrudService.create` (e.g. `product_already_exists`, `warehouse_already_exists`) have no locale entries, so the client shows an empty message.
- `posPaymentMethod.testConnection` and `posConfig.companyLockStatus` are ungated (low impact: a terminal ping and a read-only flag).
- `round2` copies remain in `posKillSwitch.ts`.

---

## 20. Remediation status, round 2 (2026-10-12)

Scope chosen: **everything except Phase 2a** (stock leaving at shipment, partial-fulfillment status, split-warehouse reservation), with these decisions:
- **N-01:** POS VAT from the company's TaxZones, prices VAT-inclusive.
- **E-14:** the core PATCH change stays a separate ticket.
- **N-05:** the Collection is the source of truth for membership.

Nothing is committed. Each finding's status block in §13 and the P3 table give the details; this section is the summary.

### Implemented in round 2
- **N-01** POS VAT; **E-10/N-07** currency code and POS line snapshot, variant label on screen; **N-05** collection membership; **E-13** live-only business keys, restore checks, index migration; **E-17** remaining eCommerce reads.
- P3: **E-19** variants, **E-20** returns (validation, restock, refund through the shared `refundProductOrder`), **E-21** notifications after commit and the refund idempotency key, **E-22** references, **E-23** cart currency, weight units and no-shipping orders, **E-24** category cycles and buyer-only reviews, **N-08** email currency, **N-09** analytics per currency, **N-13** `$addToSet` and POS-created rows, **N-14** bundle validation, **N-15** refund-revoked gift cards, **E-26** AI tool permissions, postal-pattern escaping.
- Debt from §19: POS catalog search escaped; `<model>_already_exists` messages added; `posPaymentMethod.testConnection` gated on payment-method write rights.

**Core changes (small, outside your uncommitted files):**
- `transactionUtils.ts`: `runAfterCommit` / `flushAfterCommitTasks`, the post-commit hook.
- `asyncHandler.ts`: flushes the hook after commit, drops it on abort.
- `assistantToolAccess.ts`: `requirePermission`, and a permission-neutral refusal message.

Finance:
- `GiftCard.revokedByRefund`, enforced in the enable action and PATCH.

armonia:
- `currencyCode` and snapshot fields on ProductOrder.
- Analytics response types.
- 15 new locale entries in each of the 5 languages.

sinfonia:
- Order sheet "Options" field.
- Shop order history shows the variant label.

### Verification (round 2)
- **maestro `vitest run`:** 44 files, **372/372 passed**. That includes 7 new eCommerce tests and the new 3-test core `afterCommit` suite, which caught and drove a fix: the MongoDB driver's `isCommitted` is also true for aborted transactions, so the post-commit hook is flushed explicitly by the code that commits instead.
- **Typecheck:** 262 errors, identical to the baseline.
- **sinfonia typecheck:** 15 pre-existing errors, unchanged.
- **Import smoke** of every changed route and service: OK.
- **`yarn migrate:sync-ecommerce-indexes` dry run on dev:** lists exactly the five rebuilt indexes; inventory and POS indexes already match.
- **Not verified live:** POS VAT on a real till with CIS; the return receive/complete flow in the panel; analytics currency switching in the UI (the API only); AI tool refusals in a chat.

### Additional deployment steps (after those in §19)
1. `yarn migrate:sync-ecommerce-indexes` (dry run, then `--execute`) in each environment.
2. **POS VAT:** give each till's first warehouse an address with a country, and make sure TaxZones exist for it. Otherwise VAT stays 0, as before.
3. **Behaviour changes to announce:**
   - collection-targeted discounts now follow the storefront collection;
   - carts can't mix currencies;
   - only the buyer can write reviews;
   - a deleted warehouse or product code can be reused;
   - AI tools refuse users without the matching read permission.

### Still not done
- **Phase 2a:** E-16, N-06, the partial-fulfillment status part of E-15 — done in §21.
- **Core:** E-14 (validators, audit diff and duplicate-key mapping on PATCH), the admin side of E-17, admin re-delete (N-13), HTTP transient retry (E-21).
- **By decision:** N-11 (POS pricing rules), N-12 (checkout price lock), E-25 (gift-card ledger), N-08 recipient address.
- **Kept as is:**
  - `posConfig.companyLockStatus` stays ungated: it's a read-only flag every till polls.
  - `round2` in `posKillSwitch.ts` adds `Number.EPSILON`, so it isn't identical to `roundMoney`; merging would change rounding.
  - `enrichCartLinesWithProductMeta` in `pricingCalculationService.ts` has no callers (dead code, reported only).

---

## 21. Remediation status, Phase 2a + 2b (2026-10-12)

Scope chosen: **Phase 2a + 2b**, backend plus the minimal panel changes:
- the order holds its stock; stock leaves at shipment;
- partial-fulfillment status and the delivery rule;
- split-warehouse reservation;
- a migration for orders already placed;
- POS writes stock through `InventoryService`.

This closes **E-16**, **N-06** and the remaining part of **E-15**, and completes the 2b note on **E-09**. Nothing is committed.

### How stock moves now

| Moment | Before | Now |
|---|---|---|
| Payment step | stock held on the checkout | unchanged |
| Order placed | holds stay on the checkout | holds move onto the order; the checkout's list is emptied |
| Payment (gateway, `markPaid`, webhook) | holds consumed: on-hand drops | stock untouched |
| Shipment (order `ship`, fulfillment `ship`) | no stock effect | shipped units leave: on-hand and reserved drop, with a `sale` movement referencing the Fulfillment. Units nobody held are taken from free stock, or the shipment is refused with `out_of_stock` |
| Delivery | any delivered fulfillment → order `delivered` | `delivered` once every line shipped and every non-failed shipment arrived |
| Failed shipment | status only | units back on hand and held for the order again (`return` movement); released instead when the order is already cancelled / refunded; a fully shipped order goes back to `processing` |
| Cancel | releases the checkout's holds | releases the order's holds (a partially shipped order: only the unshipped part) |
| Full refund | restocked consumed units if unfulfilled | releases the unshipped holds; shipped goods come back only through a return |
| Return received | restock into the checkout's consumed warehouse | restock into the warehouse the order's shipment left from |
| Reservation | one warehouse must cover the whole line | one warehouse when possible, otherwise split across warehouses (default first) |
| Till sale / refund | POS wrote `Inventory` directly | through `inventoryService.takeStock` / `addStock` (named `sellDirect` / `restockDirect` in this round; renamed in §22) |

### Implemented

| ID | Change | Files |
|---|---|---|
| E-16 | `ProductOrder.reservations` (shared `stockReservationsField` sub-schema, plus a `fulfillment` link). Placement moves the holds onto the order. Payment paths no longer consume. New `orderFulfillmentService`: `consumeForShipment` (consume holds per shipment, split partial holds, reserve-and-sell shortfalls or `out_of_stock`), `reverseShipment` (failed shipment back on hand and held). Cancel and full refund call `releaseReservations` (generalised from `releaseCheckoutReservations`). Returns restock from the order's consumed holds. The order delete guard reads the order's holds. | `checkout.ts`, `productOrder.ts`, `orderFulfillmentService.ts` (new), `inventoryReservationService.ts`, `inventory.service.ts` (`reverseSale`), `productOrder.actions.ts`, `fulfillment.actions.ts`, `checkoutPlacementService.ts`, `paymentsWebhook.ts`, `checkoutExpiryJob.ts`, `returnRequest.actions.ts`, `productOrder.ts` (route) |
| E-15 | `syncOrderFulfillment` derives `fulfillmentStatus` (`unfulfilled` / `partially_fulfilled` / `fulfilled`) and the order status (`shipped`, `delivered`, back to `processing`) from the non-failed fulfillments after every ship / deliver / fail. The "delivered" email goes out once per order. The `SHIP_ADVANCES_ORDER` / `DELIVER_ADVANCES_ORDER` shortcuts are gone. | `orderFulfillmentService.ts`, `fulfillment.actions.ts`, `productOrder.actions.ts` |
| N-06 | Split-warehouse reservation in `reserveCheckoutStock`; all-or-nothing per call. | `inventoryReservationService.ts` |
| E-09 (2b) | `consumePosStock` / `restockPosStock` call `inventoryService.sellDirect` / `restockDirect` (renamed `takeStock` / `addStock` in §22); no direct `Inventory` writes remain in POS. | `inventory.service.ts`, `posService.ts` |
| Migration | `yarn migrate:order-reservations` (dry run by default, `--execute` writes; one transaction per order; re-runnable). For each confirmed checkout with holds: copies them onto its order and empties the checkout's list. For an order that is paid but unshipped and not cancelled / refunded, stock that payment already consumed goes back on hand and held (`adjustment` movement), so the shipment takes it out once. Shipped orders keep their `consumed` holds (returns restock from them) without a link to the old shipment. Orders that already have holds, deleted orders and checkouts without an order are skipped and listed. | `scripts/migrations/moveReservationsToOrders.ts` (new), `package.json` |
| Repair script | `migrate:reconcile-inventory-reserved` now counts the holds on live orders as well as on open checkouts. **The old copy must not run after this deploy:** it would zero every order's holds. | `scripts/migrations/reconcileInventoryReserved.ts` |

**Panel (sinfonia).** Timeline labels for `order_partially_shipped`, `shipment_delivered`, `shipment_failed` and the round-2 `return_restock_skipped`, in all 5 languages (`productOrderSheetView.json`). `partially_fulfilled` already had labels and the armonia enum already had the value. Nothing else in the panel changes: the order's holds are hidden from tables, and the ship / deliver / fail buttons call the same actions.

**Comments updated:** `checkout.indexes.ts` and `checkoutExpiryJob.ts` no longer say confirmed checkouts hold the order's stock (they are kept because charges taken at checkout reference them).

### Verification
- **maestro `vitest run`:** 44 files, **378/378 passed** (372 before). The eCommerce suites now hold 71 tests.
  - New: "moves the held stock onto the order; payment leaves it on the shelf"; the four "stock leaves at shipment" tests (partial shipment and hold split, shortfall from free stock or `out_of_stock`, delivered-only-when-all-arrived plus failed-shipment reversal and re-ship, cancel / full-refund release); split-warehouse and all-warehouses-short reservation; `releaseReservations` leaving consumed holds alone; `sellDirect` / `restockDirect` / `reverseSale`.
  - Removed with the functions they tested: the three `consumeCheckoutReservations` tests and "restocks consumed units exactly once".
  - Adjusted: the returns fixture holds its consumed stock on the order; the ship test uses untracked products (a line whose product doesn't exist counts as tracked and would now need stock).
- **Typecheck** (TS 5.9 over maestro): 262 errors, identical to the baseline; the new migration script adds none.
- **sinfonia typecheck:** 15 pre-existing errors, unchanged.
- **Import smoke** of the changed routes, cron, return actions and POS service: OK.
- **`yarn migrate:order-reservations` dry run on dev:** 0 orders to move — dev has no placed checkout still holding stock — so the write path has **not** run against real data.
- **`yarn migrate:reconcile-inventory-reserved` dry run on dev:** 17 rows whose reserved quantity no checkout or order hold explains (drift from before this change; nothing written).
- **Not verified:** a live panel walk through ship / deliver / fail / cancel, a live Stripe payment through the new placement, and the migration's `--execute`.

### Deployment steps (after those in §19 and §20)
1. **Run `yarn migrate:order-reservations` right after deploying, before anyone ships.** Dry run first, then `--execute`. Without it:
   - a paid order placed before the deploy would lose stock twice: once at payment (old rule) and again at shipment;
   - an unpaid order's hold would stay on its checkout for ever while its shipment takes free stock.
2. Then run `yarn migrate:reconcile-inventory-reserved` (dry run) with the **updated** script, and review the rows it lists before any `--execute`. `scripts/` is git-ignored, so copy both scripts to every machine that runs migrations.
3. **Behaviour changes to announce:**
   - on-hand drops at shipment, not at payment; paid but unshipped goods show as on hand and reserved;
   - orders show *partially fulfilled* until every line has shipped, and *delivered* only when every parcel has arrived;
   - marking a shipped parcel failed puts its units back in stock, held for the order;
   - a line can be held from several warehouses;
   - shipping a paid order that holds no stock (`stock_shortfall`) is refused with `out_of_stock` until stock is available.

### Still not done
- **Phase 2c–2f:** operator UI (deduct reason picker, warehouse filter, order-line picker in the fulfillment form), stock transfers, stock counts, default eCommerce role packs — done in §22.
- Shipments don't choose a warehouse: a shipment takes the order's holds in order, then any warehouse with free stock. A `warehouse` on Fulfillment is part of a later step.
- Old shipments (before the migration) have no link to their consumed holds, so marking one failed doesn't put stock back; staff restock it by hand.
- **Core:** unchanged from §20 (E-14, the admin side of E-17, N-13 admin re-delete, E-21 HTTP retry).

### Unrelated debt noticed (reported, not fixed)
- Dev has 17 inventory rows with reserved quantities that no hold accounts for (see the reconcile dry run). Worth reviewing before the next demo reset.

---

## 22. Remediation status, Phase 2c–2f (2026-10-12)

Scope: everything left in the Phase 2 design (operator UI, stock transfers, stock counts, default role packs). The core items stay a separate ticket (E-14, the admin side of E-17, N-13 admin re-delete, E-21 HTTP retry), and N-11, N-12 and E-25 stay as decided. Nothing is committed.

### 2c. Operator UI
| Change | How | Files |
|---|---|---|
| Deduct reason picker | The deduct form takes an optional `reason` (`write_off` — the default, as before — `damage` or `adjustment`), recorded as the movement's reason. The stock-move dialog shows a reason select when deducting. | armonia `deductInventory.form.validator.ts:25` (`inventoryDeductReasons`), `inventory.actions.ts` (`applyQuantityChange` takes the reason), sinfonia `inventoryStockMoveAction.tsx` |
| Warehouse filter on the inventory list | A warehouse quick filter (the existing `quickFilters` mechanism, a DSL `equals` on `warehouse`). | sinfonia `inventories/index.tsx:26` |
| Order-line picker | New `POST /api/eCommerce/productOrder/lineSelect` (gated like the CRUD select: the caller must be able to read the order's lines) lists one option per line of the chosen order, labelled "title (options) × quantity" (`productOrderLinesToSelect`). The fulfillment and return request forms use it instead of a raw line-id text field; it follows the form's `order` field. | `productOrder.ts` route `:119`, `productOrderMapper.select.ts`, armonia `productOrderLineSelect.form.validator.ts`, `fulfillment.views.ts`, `returnRequest.views.ts` |

### 2d. Stock transfers (new entity `StockTransfer`)
- **Document:** from warehouse, to warehouse, lines (product, optional variant, quantity), note, status `draft` → `done` | `cancelled`, `doneBy` / `doneAt`.
- **Create / edit (draft only):** the two warehouses must differ (`stock_transfer_same_warehouse`); every line must be a distinct (`stock_line_duplicate`), stock-tracked (`stock_line_not_tracked` — a bundle can't be a line) item of the company in warehouses of the company (`inventory_reference_invalid`). A non-draft can't be edited (`stock_document_not_draft`), and a done transfer can't be deleted (`stock_document_done`).
- **`complete`** (`stockTransfer.actions.ts:60`, gated on `stocktransfers[write:status]`), in one transaction: re-checks the lines, then for each line takes free stock from the source (`inventoryService.takeStock` without overselling — units held for orders never move; a short line refuses the whole transfer with `insufficient_stock`) and puts it into the destination (`addStock`, creating and linking the row when the warehouse never stocked the item), with a `transfer_out` / `transfer_in` movement pair referencing the transfer. **`cancel`** closes a draft.
- **Panel:** list / card / sheet / create / edit pages under Stock → Stock transfers; complete and cancel from the row, card and sheet menus.

### 2e. Stock counts (new entity `StockCount`)
- **Document:** warehouse, lines (product, optional variant, `expectedQuantity` set by the server, `countedQuantity` entered), note, status `draft` → `applied` | `cancelled`, `appliedBy` / `appliedAt`.
- **Create:** picking a warehouse snapshots every live stock row there as a line with its on-hand as the expected quantity (`StockCountService.countLines`, `stockCount.service.ts:25`). **Edit (draft only):** enter counted quantities; lines can be added for items found without a stock row (expected 0); the warehouse is fixed. Same line rules as transfers.
- **`apply`** (`stockCount.actions.ts:58`, gated on `stockcounts[write:status]`), in one transaction: for each counted line (blank = not counted, left alone) the difference is taken against on-hand **now**, not the snapshot, so a sale shipped while counting isn't undone; on-hand goes up through `addStock` or down through `adjust`, each with an `adjustment` movement referencing the count. A count below what is held for orders is accepted (the shelf is what it is) and shows as negative availability. **`cancel`** closes a draft.
- **Panel:** same set of pages under Stock → Stock counts; apply and cancel from the menus.

**Shared pieces (reuse):**
- `utilities/services/stockDocumentLines.ts`: line validation (`assertStockDocumentLines`, built on `trackedStockLines` and `assertOwnStockReferences`) and movement recording (`recordStockMovement`).
- `assertOwnStockReferences` moved from the inventory route into `inventory.service.ts:186`, so stock rows, transfer lines and count lines share one check.
- `InventoryService.sellDirect` / `restockDirect` (§21) are renamed `takeStock` / `addStock`. They now serve the till, transfers and counts, and they link upserted rows to their product themselves (`linkStockRowToProduct` left `posService.ts`).
- One menu-items component and one confirm dialog (`components/custom/stockDocuments/`) serve all four actions in the panel.

### 2f. Default eCommerce role packs
`eCommerce.role.defaults.ts`, registered in the eCommerce `moduleBootstrap` like the propertyManagement pack:
- **Store Manager** (`ecom_store_manager`): full catalog, pricing, discounts, customer groups, reviews, CMS, shipping and tax zones, orders, fulfillments, returns, warehouses, stock, transfers, counts, tills and till setup; read-only on the ledger and buyer-side records (movements, carts, checkouts, addresses, digital deliveries).
- **Warehouse Operator** (`ecom_warehouse_operator`): fulfillments, stock rows, transfers, counts; read-only on the catalog, orders, returns, warehouses and movements. Ships through fulfillments; can't refund or change prices.
- **Cashier** (`ecom_cashier`): POS orders and sessions (selling, refunds at the till, cash moves); read-only on the catalog, stock, warehouses, till configs and payment methods.

### Error codes and locales
- New error codes in all five languages: `stock_transfer_same_warehouse`, `stock_document_not_draft`, `stock_document_done`, `stock_line_duplicate`, `stock_line_not_tracked`.
- Panel strings for the new pages, the action components, the menu entries, the role-permission groups, the deduct reasons and the relabelled order-line fields, in all five languages.

### Verification
- **maestro `vitest run`:** 46 files, **385/385 passed** (378 before).
  - New `stockDocuments.test.ts` (6): line rules; transfer moves free stock with paired movements and a linked new destination row, then refuses a second completion; transfer never moves held stock and needs the status permission, then cancels; count snapshot, expected quantities, apply against on-hand now; deduct reason recorded; order-line labels.
  - New `eCommerceRoles.test.ts` (1): every group named by the packs is a real eCommerce permission group.
  - Renamed: the till stock-move tests now cover `takeStock` / `addStock`, including the product link.
- **Typecheck** (TS 5.9 over maestro): 262 errors, identical to the baseline.
- **sinfonia typecheck:** 15 pre-existing errors, unchanged.
- **sinfonia `vitest run`:** 1556 passed, 2 failed. Neither failure comes from this work:
  - `studioSourceIndex` "finds the create/edit sharing the corpus is full of" counts shared view groups in maestro (38, expects > 40). It fails the same way with the new view files removed.
  - `displayRow` is a core component this work doesn't touch.
- **Import smoke** of the eCommerce bootstrap and every changed route: OK.
- **Not verified live:** the new panel pages (create, edit, complete, apply, cancel), the order-line picker, the warehouse filter and the deduct reason select haven't been clicked through in a browser.

### Deployment notes
- No migration: two new collections, whose indexes the API builds (autoIndex), and new permission tags created at boot. Admin roles receive them as before. A running dev API on `ts-node-dev` will already have done this on its own restarts.
- **Role packs reach new companies only.** `createDefaultRoles` runs on company creation and on database initialisation. Existing companies don't get the three new roles automatically, which is the same as the propertyManagement packs. Create them per company (e.g. calling `company.createDefaultRoles()`), then `yarn resync:role-permissions` keeps them in line with the pack.
- **Grant the new tags** (`stocktransfers[...]`, `stockcounts[...]`) to any custom roles that should use transfers or counts.

### Still not done
- **Core (separate ticket):** E-14, the admin side of E-17, N-13 admin re-delete, E-21 HTTP retry.
- **By decision:** N-11, N-12, E-25, N-08 recipient address.
- Shipments still don't choose a warehouse (a `warehouse` on Fulfillment), and pre-migration shipments have no link to their consumed holds (§21).

### Unrelated debt noticed (reported, not fixed)
- `syncAllCompanyDefaultRoles` (`company.defaults.ts`) has no callers. It's the obvious way to give existing companies new role packs, but nothing runs it.
- The sinfonia corpus test above fails on the current maestro corpus (38 shared create/edit view groups, threshold 40).
