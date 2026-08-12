# Security Scanning & Dependency Policy (§83-84)

How Pokémon Vault keeps dependencies and containers safe, and how the CI
pipeline catches vulnerabilities before they merge.

## 1. CI security pipeline (`.github/workflows/ci.yml` → `security` job)

| Scan | Tool | What it catches | Fails on |
|---|---|---|---|
| Secret scanning | **Gitleaks** | committed secrets (API keys, tokens, `.env`) | any finding |
| Dependency advisories | **pnpm audit** | known-vulnerable packages from the npm advisory DB | high/critical |
| Filesystem vulns | **Trivy (fs)** | vulnerable deps/files across the repo (SARIF → CodeQL) | CRITICAL/HIGH |
| Container scanning | **Trivy (image)** | OS + app-layer vulns in the built `--target production` images | CRITICAL/HIGH, unfixed ignored |
| SAST | **CodeQL** | code-level injection/security bugs (JS/TS) | any finding |
| Env/secret guard | `guard-env.sh` | `.env` tracked, live secret patterns in git | any finding |

`integration-build` builds the three production images and immediately scans
them with Trivy (image) — a vulnerable image cannot pass the PR gate.

## 2. Dependency pinning / constraining

- **Lockfile is the source of truth**: `pnpm-lock.yaml` is committed; every
  install in CI/CD uses `pnpm install --frozen-lockfile`. Nothing installs
  "whatever is latest" — exact resolved versions are locked.
- **Ranges are constrained**: packages use caret ranges (e.g. `^7.9.1`),
  which Dependabot updates deliberately; the lockfile pins the exact version.
- **Node/pnpm pinned**: `engines` (`node >=22.12`, `pnpm >=9`) + root
  `packageManager: pnpm@10.12.1`; containers build with Node 22 and a pinned
  pnpm via corepack.
- **`pnpm audit` gate**: the PR pipeline fails if `pnpm audit --prod
  --audit-level high` reports high/critical advisories — no vulnerable
  dependency is merged silently.
- **Dependabot** (`.github/dependabot.yml`) proposes weekly updates with
  `versioning-strategy: increase` (respects ranges/lockfile) and labels
  `dependencies`/`security`.

## 3. No blind major auto-upgrades (§84)

- Dependabot **ignores semver-major** updates (`update-types:
  ["version-update:semver-major"]` for every npm workspace). A major bump is
  only applied by a human opening the upgrade, reviewing breaking changes,
  and letting the PR pipeline + staging verify it.
- Policy: majors are deliberate, reviewed, and staged — never automatic.
- Security-critical major upgrades (e.g. a framework with a CVE) are handled
  via a tracked manual PR; the advisory is visible to `pnpm audit` in the
  meantime and the PR gate documents the exception.

## 4. Local checks

```bash
pnpm audit --prod --audit-level high      # dependency advisories
bash infrastructure/scripts/guard-env.sh  # no .env / secrets in git
# full pipeline in CI: gitleaks + trivy fs + trivy image + codeql + audit
```

## 5. Remediation flow

1. A scan fails → the PR is blocked with the SARIF/audit report attached.
2. Patch within the current major (`pnpm update <pkg>` + tests) for
   high/critical advisories.
3. If no patched minor exists, open a deliberate major-upgrade PR (human
   review + staging) and document it.
4. Rotate any secret Gitleaks finds and scrub the history.
