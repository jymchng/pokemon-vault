# Privacy, GDPR & Data Retention (§103-105)

How Pokémon Vault collects, uses, deletes, and retains personal data in a
GDPR-ready way. **Principle: collect only what is necessary; never embed PII
into immutable records unnecessarily; document every retention window.**

## 1. Minimal collection (§103)

- Registration collects **only**: email, password (Argon2id hash — never
  plaintext), first/last name, display name, avatar (all optional).
- No birthdate, phone, or address required at signup (address only at
  checkout, and only for shipping).
- Payment card numbers are **never** stored — Stripe returns a token; only
  the payment intent/provider reference is kept.
- `emailOptIn` (marketing) defaults to **false** — consent is opt-in, not
  pre-ticked (§104).

## 2. Consent & notification prefs

- `NotificationPreference` per user: orderUpdates, shippingUpdates,
  rewardAvailable, collectionMilestones, promotions, systemMessages,
  **emailOptIn** (marketing).
- API: `GET/PATCH /api/v1/privacy/consent` — read/update marketing opt-in.
- The notifier honors `emailOptIn` before sending promotional email.

## 3. Data export (§104 right to portability)

- `GET /api/v1/privacy/export` returns a JSON document of everything stored
  for the requesting user: profile, sessions, orders (business facts, not
  card numbers), collection, rewards, notifications (recent 500), and
  notification preferences.
- Exports never include other users' data, credentials, or payment card
  numbers.

## 4. Account deletion (§104 right to erasure)

- `DELETE /api/v1/privacy/account` (self-service, authenticated):
  1. Soft-deletes the User row (`status=DELETED`, `deletedAt` set).
  2. **Anonymizes PII**: email → `deleted-<id8>@removed.invalid`, passwordHash
     nulled, name/avatar cleared — immutable records (orders, payments,
     audit, notifications) keep working references without personal data.
  3. Deletes derived rows immediately: carts, sessions, refresh tokens,
     one-time tokens, notification preferences.
  4. Writes an audit entry (`user.delete`).
- Admin may also delete via `PATCH /api/v1/admin/users/:id/status`
  (status=DELETED).

## 5. Retention windows (§105)

| Data | Retention | Notes |
|---|---|---|
| Users (soft-deleted) | **permanent anonymized** | email replaced; status DELETED; kept for ledger/audit integrity |
| Orders + order_items | **10 years** (tax/legal) | snapshot items are business facts; no PII beyond the (anonymized) user FK |
| Payments + webhook events | **10 years** | provider refs only — never card numbers |
| Audit logs | **7 years** | actorId/resourceId only; before/after holds business state, not PII |
| Notifications | **2 years** | body is non-PII template text; user FK only |
| Collection activity | **2 years** | |
| Sessions / refresh tokens | **deleted on account deletion**; TTL elsewhere (30 d) | |
| Carts / cart items | **30 days** (abandoned) | |
| Email logs (worker) | **90 days** | to/from addresses only |
| Packs / openings | **permanent** | immutable; user FK only |
| Media | **on account deletion** | object storage purge job |

> Rationale: immutability of orders/payments/audit is required for financial
> and fraud integrity; the PII (email/name) is **not** embedded in those
> records — the User row is anonymized in place, so the two requirements
> (retention + erasure) are both satisfied.

## 6. No PII in immutable records

- Orders store `userId` (FK), not email/name.
- Audit logs store `actorId` (FK) + business before/after.
- Pack openings store `userId` + card ids.
- Notifications store `userId` + template text.
- Therefore erasure = anonymize the User row; nothing else holds PII.

## 7. Operations

- Retention cleanup jobs (cron/worker): expired sessions, abandoned carts
  (30 d), stale notifications (2 y), old audit (7 y), media purge on delete.
- Backup dumps (§70) inherit the same retention via the anonymized rows.
