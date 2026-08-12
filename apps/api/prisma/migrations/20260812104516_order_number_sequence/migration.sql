-- Human-readable order numbers (PV-10482, PV-10483, ...): a concurrency-safe
-- PostgreSQL sequence; the app formats it as PV-<n>. Internal PK stays UUID.
CREATE SEQUENCE IF NOT EXISTS "order_number_seq" START WITH 10482;
