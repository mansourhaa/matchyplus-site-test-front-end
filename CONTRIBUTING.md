# Contributing

Repo: **[matchy-plus/matchy-plus](https://github.com/matchy-plus/matchy-plus)** (organization).

**Full walkthrough:** [doc/setup/pr-and-merge-flow.md](./doc/setup/pr-and-merge-flow.md)  
**Locking branches:** [doc/setup/branch-protection.md](./doc/setup/branch-protection.md)

## Branch flow

```text
feature/* or fix/*  →  dev  →  staging  →  main
                         ↑         ↑         ↑
                      daily work   QA     production
```

| Branch | Purpose |
| --- | --- |
| `feature/*`, `fix/*`, `chore/*`, … | Your work in progress |
| `dev` | Integration branch for the team |
| `staging` | Pre-production / QA environment |
| `main` | Production |

## Rules

1. **Never push directly** to `dev`, `staging`, or `main`. Always open a PR.
2. **Do not merge your own PR** unless you are a **repository / org admin**. Everyone else requests a review; a teammate (or CODEOWNER) merges after approval.
3. **Work branches** start from the latest `dev`.
4. **Only promotion PRs** go up the chain: `dev` → `staging`, then `staging` → `main`.
5. Wait for **CI** (`Lint, Format, Test & Build`) and **PR Guard** (`Enforce branch topology`) before merge.

Branch protection on private org repos requires **GitHub Team**. Until that is enabled, the rules above are still mandatory — see [branch-protection.md](./doc/setup/branch-protection.md).

## Day-to-day steps

### 1. Start from `dev`

```bash
git checkout dev
git pull origin dev
git checkout -b feature/short-description
# or: git checkout -b fix/short-description
```

### 2. Develop and verify locally

```bash
pnpm install
pnpm lint
pnpm test
```

Commit with the project convention (`pnpm commit` / conventional commits).

### 3. Open a PR into `dev`

1. Push your branch and open a PR **targeting `dev`**.
2. Fill in the PR template (summary, ticket link, checklist).
3. Request at least one reviewer (CODEOWNERS may auto-request).
4. Address review comments; push more commits as needed.
5. **Let the reviewer merge** when checks are green and the review is approved (admins may self-merge).

### 4. Promote to staging

When `dev` is ready for QA: open **`dev` → `staging`**, get review, merge, verify staging.

### 5. Promote to production

When staging is verified: open **`staging` → `main`**, get release-owner approval, merge, verify production.

## CI

GitHub Actions runs on PRs to `dev` / `staging` / `main` and on pushes to `staging` / `main` (image publish). Workflow: [`.github/workflows/ci.yml`](./.github/workflows/ci.yml). Topology checks: [`.github/workflows/pr-guard.yml`](./.github/workflows/pr-guard.yml).

## Quick do / don’t

| Do | Don’t |
| --- | --- |
| Branch from `dev` | Commit straight to `dev` / `staging` / `main` |
| PR into `dev` for features/fixes | Open feature PRs straight to `main` |
| Get a teammate to merge (non-admins) | Non-admins: click **Merge** on your own PR |
| Link the ticket in the PR | Leave the template blank |
| Wait for CI + PR Guard | Merge with failing checks |

## Need setup help?

See [Getting Started](./doc/setup/getting-started.md) and [Development Workflow](./doc/setup/development.md).
