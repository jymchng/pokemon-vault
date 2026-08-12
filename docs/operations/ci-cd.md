# CI/CD (§77-79)

GitHub Actions pipelines. **No laptop deploys** — only CI/CD and CI-run
Terraform touch the environments.

## PR pipeline — `.github/workflows/ci.yml`

Order (each job `needs` the previous gate):

```
install → lint-typecheck → unit-tests (Postgres+Redis services)
       → integration-build (pnpm -r build + docker build --target production
                            for api/worker/web + guard-env.sh)
       → security (Dependabot lockfile check + Gitleaks secret scan +
                   Trivy fs scan (SARIF→CodeQL) + CodeQL)
       → guard-env (no .env, no live secrets in git)
```

Merging to `main` requires this pipeline green (branch protection: require
`CI — Pull Request` status check + no merge while running).

## CD pipeline — `.github/workflows/cd.yml`

On push to `main`:

```
build-images: immutable images → GHCR (git SHA tag; never latest-only)
deploy-staging: Terraform apply (staging) with SHA images → ECS stable wait
                → smoke /api/v1/health/ready (assert status=ok)
deploy-prod:    environment 'production' = MANUAL APPROVAL gate
                → Terraform apply (prod) → ECS stable → health check
                → post-deploy monitor (CloudWatch 5xx in the window)
```

- **Image tags**: `ghcr.io/jymchng/pokemon-vault/{api,worker,web}:<git-sha>`
  plus `<branch>` convenience ref. Every image is immutable — the tag always
  identifies the exact commit. `latest` is never used for deploys.
- **Approvals**: `deploy-prod` uses a GitHub `environment: production` with a
  required reviewer — staging must pass smoke before an approver can release.
- **AWS access**: OIDC `configure-aws-credentials` (no long-lived keys);
  `AWS_ROLE_ARN_STAGING` / `AWS_ROLE_ARN_PRODUCTION` are environment secrets.
- **Rollback**: re-run Terraform with the previous immutable SHA
  (`docs/operations/disaster-recovery.md` §7); a `rollback` job exists for
  `workflow_dispatch`.

## Dependency + secret hygiene

- `.github/dependabot.yml`: weekly automated updates for the npm workspaces +
  GitHub Actions, with `security` labels.
- Gitleaks + `guard-env.sh` run on every PR — any committed secret blocks merge.
- Trivy scans the repo filesystem for known-vulnerable dependencies at
  CRITICAL/HIGH, uploading SARIF to the security tab.

## Verify locally

```bash
# YAML + actionlint (actionlint is available at /tmp/actionlint)
python3 -c "import yaml; [yaml.safe_load(open(f)) for f in
  ['.github/workflows/ci.yml','.github/workflows/cd.yml','.github/dependabot.yml']]"
actionlint .github/workflows/*.yml
```
