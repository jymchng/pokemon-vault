-- ============================================================================
-- Least-privilege DB role (§55)
-- ============================================================================
-- The application NEVER connects as the database owner / superuser. Migrations
-- and schema changes run as an admin/owner role; the API and worker run as the
-- `pv_app` role below, which has CRUD on tables + sequences only — no DDL, no
-- CREATE on the schema, no role/database privileges.
--
-- Run as the owner/superuser (e.g. psql -U postgres -d pokemon_vault -f roles.sql
-- with :'app_password' set via psql -v app_password='...').

-- 1. Role (idempotent). Least privilege: LOGIN only — no SUPERUSER/CREATEDB/
--    CREATEROLE/BYPASSRLS, no INHERIT (grants are explicit).
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'pv_app') THEN
    CREATE ROLE pv_app LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT
      PASSWORD :'app_password';
  END IF;
END
$$;

-- 2. Revoke the historical public schema CREATE grant (public-schema attack).
REVOKE CREATE ON SCHEMA public FROM PUBLIC;

-- 3. Connect + schema usage.
GRANT CONNECT ON DATABASE pokemon_vault TO pv_app;
GRANT USAGE ON SCHEMA public TO pv_app;

-- 4. CRUD on existing tables/sequences.
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO pv_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO pv_app;

-- 5. Future tables/sequences created by the migration owner get the same grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO pv_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO pv_app;

-- 6. Explicitly ensure pv_app cannot mutate schema objects.
REVOKE CREATE ON SCHEMA public FROM pv_app;

-- Verification (expect: NO SUPERUSER, NO CREATEDB, NO CREATEROLE):
--   \du pv_app
-- The app role must be used in DATABASE_URL (never the owner / postgres).
