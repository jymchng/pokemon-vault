# Alerting & Incident Response (§69)

Prometheus + Alertmanager rules and the runbook for the Pokémon Vault API,
worker, and infrastructure. **Alert data never contains PII** — labels are
service/queue/route/metric names only.

## 1. Alert rules (Prometheus)

| Alert | Expression | For | Severity | Runbook |
|---|---|---|---|---|
| `Api5xxSpike` | `sum(rate(http_errors_total[5m])) / max(sum(rate(http_requests_total[5m])), 1) > 0.05` | 5m | critical | [§2 API 5xx](#2-api-5xx-spike) |
| `ApiHighLatency` | `histogram_quantile(0.95, sum by (le, route)(rate(http_request_duration_seconds_bucket[5m]))) > 1` | 10m | warning | [§3 latency](#3-high-latency) |
| `DbDown` | `up{job="api"} == 1 and (rate(db_query_duration_seconds_count[5m]) == 0)` | 5m | critical | [§4 DB](#4-database) |
| `DbHighLatency` | `histogram_quantile(0.95, sum by (le)(rate(db_query_duration_seconds_bucket[5m]))) > 1` | 10m | warning | [§4 DB](#4-database) |
| `RedisDown` | `redis_up == 0` (or `rate(redis_command_duration_seconds_count[5m]) == 0` with api up) | 2m | critical | [§5 Redis](#5-redis) |
| `QueueDepthHigh` | `queue_depth{state="waiting"} > 500` | 10m | warning | [§6 queues](#6-queues) |
| `QueueFailedSpike` | `sum(increase(queue_job_failures_total[15m])) > 50` | — | warning | [§6 queues](#6-queues) |
| `WorkerDown` | `absent(up{service="worker"})` | 5m | critical | [§6 queues](#6-queues) |
| `WebhookStale` | `time() - max(payment_webhook_last_seen_seconds) > 300` | — | warning | [§7 webhook](#7-webhooks) |
| `InventoryReservationFailed` | `increase(inventory_reservations_failed_total[15m]) > 10` | — | warning | [§8 inventory](#8-inventory) |
| `CertExpiring` | `probe_ssl_earliest_cert_expiry - time() < 14*86400` (blackbox exporter) | — | warning | [§9 certs](#9-certificates) |

## 2. API 5xx spike

- **Check**: `log_entries` for `level:error` + `http 5xx` in the window; match
  by `request_id` to trace the failing route/DB query.
- **Common**: DB connectivity loss, a bad deploy, an upstream payment/email
  outage, a code bug.
- **Act**: read the deploy dashboard — if a recent deploy correlates, roll back
  (§80-82); check Sentry for the newest error group; page the on-call.
- **Resolve when**: 5xx rate < 1% for 15 consecutive minutes.

## 3. High latency

- **Check**: `http_request_duration_seconds` by route; `db_query_duration_seconds`
  and `redis_command_duration_seconds` for the same window.
- **Common**: missing index, N+1, lock contention, Redis slow commands, DB CPU.
- **Act**: pull the slow query log; add/verify indexes (§95); scale DB or workers;
  trace the hot route with OpenTelemetry.
- **Resolve when**: p95 < 500ms for 15 minutes.

## 4. Database

- **Down**: verify the DB is reachable from the app VPC (private networking,
  §55); check the DB instance status in the console; restore from the latest
  encrypted backup if a volume was lost (§33, §70).
- **High latency**: check CPU/IOPS, `pg_stat_activity` for long queries and
  locks; kill runaway queries; add indexes.
- **Resolve when**: readiness (`/health/ready`) returns 200 and p95 DB latency
  < 250ms.

## 5. Redis

- **Down**: `redis-cli ping` from the app host; check memory (`maxmemory`) and
  evictions; Redis is used for BullMQ + throttling — a failure degrades but
  does not hard-crash the API (BullMQ retries; throttler falls back in-memory).
- **Resolve when**: `PING` → `PONG` and queue workers re-connect.

## 6. Queues / worker

- **Depth high**: inspect the queue backlog in BullMQ board; check the worker
  process (CPU, error log); confirm the worker is consuming (`Worker ready`).
- **Failed spike**: open the dead-letter queue `dlq_<queue>`; replay idempotent
  jobs (§45 idempotency); fix the handler; bump worker concurrency if saturated.
- **Worker down**: verify the deployment/ECS task is up; check startup logs;
  restart; alert if it happens repeatedly (crash loop).
- **Resolve when**: waiting depth < 100 and `queue_job_failures_total` delta is 0
  for 15 minutes.

## 7. Webhooks

- **Stale**: Stripe webhook deliveries to `/api/v1/payments/webhooks/stripe` have
  stopped. Check the Stripe dashboard for delivery attempts, verify the endpoint
  URL + secret, and confirm the API is healthy. Payments pending on webhooks
  will auto-expire; monitor `payment_failed_total`.

## 8. Inventory reservations

- **Spike**: reservations failing en masse usually means stock checks broke or
  the DB is slow/contended. Check `inventory_reservations_failed_total` route
  attribution and `db_query_duration_seconds`; verify the DB CHECK constraint
  and the FOR UPDATE path still work (§18-19).

## 9. Certificates

- **Expiring**: blackbox `probe_ssl_earliest_cert_expiry` < 14 days. Renew via
  the certificate manager (ACM/Terraform); validate the new cert is served;
  alert resolves when expiry > 30 days.

## 10. Response procedure (summary)

1. **Acknowledge** the alert within 15 minutes (on-call rotation).
2. **Triage**: classify severity; open the runbook section above.
3. **Mitigate** (rollback / scale / kill runaway job) before root-causing.
4. **Root-cause** using correlated `request_id` logs + Sentry + traces.
5. **Fix + verify**: deploy the fix, confirm metrics recover, close the alert.
6. **Postmortem**: document timeline, impact, and preventions (tests, alerts).

## 11. Alerting config (reference)

- `infrastructure/prometheus/alerting-rules.yml` (rules above)
- Alertmanager routes to email/PagerDuty/Slack per severity.
- Run locally: `docker compose -f docker-compose.obs.yml up -d` (Prometheus +
  Alertmanager + Grafana scraping `http://api:3001/metrics`).
