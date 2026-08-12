# Database (§6, §60, §95)

PostgreSQL is the system of record. Prisma 7 with the `pg` driver adapter; all
migrations are versioned under `apps/api/prisma/migrations` (never dev-only
auto-sync in production).

## Schema highlights

- **Users**: id (UUID), email @unique, emailVerified, passwordHash (Argon2id),
  first/last/displayName, avatarUrl, status (ACTIVE/SUSPENDED/DELETED), role,
  createdAt/updatedAt/lastLoginAt, deletedAt.
- **Catalog**: Set, Card (name, setName, cardNumber, rarity, type, hp,
  language, marketPrice, metadata), Product (sku @unique, slug @unique,
  category, productType, price, status), ProductVariant, CardGrade.
- **Commerce**: Cart/CartItem, Order + OrderItem (snapshots), Payment +
  PaymentWebhookEvent, Shipment/ShipmentItem, Address, InventoryItem/
  InventoryReservation/InventoryMovement.
- **Collection**: Collection/CollectionItem (@@unique([collectionId, cardId])),
  CollectionActivity (immutable stream).
- **Packs**: Pack/PackContent/PackOpening (idempotencyKey @unique,
  randomizationVersion)/PackCard.
- **Rewards**: RewardAccount, RewardTransaction (ledger), Reward,
  RewardRedemption (@@unique([accountId, rewardId])), RewardTier.
- **Notifications/Media/Audit**: Notification + NotificationPreference,
  MediaAsset, AuditLog.
- **Ops**: IdempotencyRecord (key @unique), AbuseEvent, EmailLog, DailyAnalytics.

## Conventions

- UUID primary keys; human-readable order numbers via `order_number_seq`
  (PV-10482…).
- `createdAt`/`updatedAt` UTC; soft deletion where appropriate (`deletedAt`).
- FK + unique constraints + indexes on all hot query paths (§95): users.email,
  products.slug/sku/category/status, cards.name/set_id/rarity,
  orders.user_id/status, collection_items.user_id/card_id,
  notifications.user_id, etc.
- Transactions for multi-entity writes (§92); inventory row locks
  (`FOR UPDATE`) + DB CHECK backstop prevent overselling.

## Migrations

```bash
pnpm db:migrate          # dev (interactive)
pnpm db:migrate:deploy   # CI/prod (apply pending)
pnpm db:rollback         # prisma migrate resolve --rolled-back (repair only)
pnpm db:push             # dev schema sync (not for production)
```

Migrations are **forward-only** — never edit an applied migration; fix forward
with a new one (§81).

## Security (§55)

- Production: encrypted connections (sslmode require/verify-full + CA),
  private networking, no public port, least-privilege `pv_app` role
  (infrastructure/db/roles.sql), encrypted storage, automated encrypted
  backups + PITR (§70).
- `assertSecureDbConfig` fails closed at startup in production (URL + TLS +
  credentials). See docs/security/database.md.

## Backups & restore

See docs/operations/backups-dr.md — daily encrypted off-site backups, SHA-256
sidecars, `--verify` restores into a scratch DB, RPO ≤24h / RTO ~15-30min,
and the disaster-recovery procedures in docs/operations/disaster-recovery.md.
