# API (§49-51, §85-87)

REST API at `/api/v1`. Interactive documentation: OpenAPI/Swagger at
`/api/v1/docs` (dev/staging always; production token-gated via `API_DOCS_TOKEN`),
raw spec at `/api/v1/docs-json`.

## Conventions

- **Versioning**: every route under `/api/v1` (no unversioned production APIs).
- **Success**: `{ "data": …, "meta"?: … }` (meta on paginated endpoints).
- **Error**: `{ "error": { "code", "message", "details"?: … } }` — stable
  machine-readable codes (§102), e.g. `AUTH_INVALID_CREDENTIALS`,
  `PRODUCT_NOT_FOUND`, `CART_EMPTY`, `VALIDATION_ERROR`, `FEATURE_DISABLED`.
- **Auth**: `Authorization: Bearer <accessToken>` (or HTTP-only cookie);
  refresh via `POST /api/v1/auth/refresh`.

## Pagination (§86)

- **Cursor** (high-volume catalog): `GET /api/v1/products?limit=24&cursor=…` →
  `{ data:{ items }, meta:{ nextCursor, hasMore } }`; limit 1-100 (default 24).
- **Offset** (small admin tables): `GET /api/v1/admin/orders?page=1&limit=20` →
  `{ data:{ items, total, page, limit } }`.

## Filtering & sorting (§87)

Products/cards accept composable validated filters (`category`, `set`,
`rarity`, `type`, `grade`, `minPrice`, `maxPrice`, `availability`) and
whitelisted `sort` keys (`newest`, `name_asc`, `price_asc`, `price_desc`,
`number_asc`). Unknown sort values → 400.

## Module endpoints

| Module | Base path | Notes |
|---|---|---|
| Auth | `/auth` | register, login, logout, refresh, me, verify-email, forgot/reset-password |
| Users | `/users` | profile + preferences |
| Products / Cards / Sets | `/products`, `/cards`, `/sets` | public catalog + filters |
| Inventory | `/inventory` | availability + admin adjust |
| Cart | `/cart/items` | user + anonymous session (X-Session-Id) |
| Wishlist | `/wishlist/items` | uniqueness enforced |
| Checkout | `/checkout` | server-side pricing, idempotent pay (Idempotency-Key) |
| Orders | `/orders` | owner list/detail; admin inspect + status |
| Payments | `/webhooks/stripe` | signature-verified, idempotent |
| Shipping | `/shipping`, `/admin/shipments` | addresses + shipment state machine |
| Collection | `/collection` | items, set progress, immutable activity |
| Packs | `/packs` | server-determined opening, idempotent |
| Rewards | `/rewards` | XP ledger, configurable tiers, atomic redemption |
| Notifications | `/notifications` | read tracking + preferences |
| Search | `/search` | PostgreSQL full-text + filters |
| Media | `/media` | signed upload/download, async processing |
| Admin | `/admin` | dashboard, orders, refunds, inventory, collection grant, users |
| Audit | `/audit` | STAFF+ read, SUPER_ADMIN write |
| Privacy | `/privacy` | export, erasure, consent |
| Health | `/health` | liveness/readiness |
| Metrics | `/metrics` | Prometheus scrape (no PII) |

## Idempotency

Send `Idempotency-Key: <uuid>` on checkout payment, reward redemption, pack
opening, refunds, and order creation. Same key + same body → the stored
response is replayed (no side effects); same key + different body → 409 (§91).
