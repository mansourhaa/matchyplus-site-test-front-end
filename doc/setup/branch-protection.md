# Branch protection (org)

How to lock `dev`, `staging`, and `main` on **[matchy-plus/matchy-plus](https://github.com/matchy-plus/matchy-plus)** so the PR flow is enforced by GitHub, not only by process.

This repo does **not** use GitHub Actions. Verification is local (`pnpm lint`, `pnpm test`). Branch protection covers PRs, reviews, and CODEOWNERS only.

## Why org alone is not enough

Moving the repo under the **matchy-plus** organization does **not** unlock branch protection on a **private** repository while the org is on **GitHub Free**.

| Plan | Private repo branch protection |
| --- | --- |
| GitHub Free (org) | Not available |
| **GitHub Team** (or Enterprise) | Available — required for this repo |

Public repos can use protection on Free; Matchy+ stays private, so **upgrade the org to Team** (or higher) first.

## What we enforce

Once Team is enabled, protect all three integration branches:

| Branch | Rule |
| --- | --- |
| `dev` | PR required · ≥1 approval · CODEOWNERS · no force-push |
| `staging` | Same (only `dev` → `staging` promotions) |
| `main` | Same (only `staging` → `main` promotions) · treat as production |

**Admins** are not forced through the same rules (`enforce_admins: false`) so they can merge their own PRs. Non-admins cannot bypass — they still need review. Prefer a second reviewer on `main` even for admins.

Also recommended repo settings: **squash merge only**, **delete head branch on merge**, **allow auto-merge**.

## Option A — Script (API)

Needs a token that can administer the repo (classic `repo`, or fine-grained **Administration: Read and write** on `matchy-plus/matchy-plus`).

```bash
chmod +x scripts/apply-branch-protection.sh
./scripts/apply-branch-protection.sh
```

If you see `Upgrade to GitHub Pro/Team…` or rulesets 403, finish the org billing upgrade first.

## Option B — GitHub UI

1. Org billing: [https://github.com/organizations/matchy-plus/settings/billing](https://github.com/organizations/matchy-plus/settings/billing) → upgrade to **Team**.
2. Repo → **Settings** → **Branches** → **Add branch protection rule**.
3. For each of `main`, `staging`, `dev`:
   - Branch name pattern: exact branch name
   - Require a pull request before merging
   - Require approvals: **1**
   - Dismiss stale pull request approvals when new commits are pushed
   - Require review from Code Owners
   - Require approval of the most recent push
   - Do **not** require status checks (no GitHub Actions in this repo)
   - Require conversation resolution before merging
   - Leave **Include administrators** unchecked (admins may self-merge / bypass when needed)
   - Block force pushes and deletions
4. Repo → **Settings** → **General** → Pull Requests:
   - Allow squash merging only (disable merge commit + rebase)
   - Automatically delete head branches
   - Allow auto-merge (optional)

## CODEOWNERS

[`.github/CODEOWNERS`](../../.github/CODEOWNERS) currently defaults to `@Khalil-Bchir`. Create an org team (e.g. `maintainers`) and switch the file to `@matchy-plus/maintainers` so reviews scale with the team.

## Soft enforcement until Team is active

Until protection can be turned on:

- Follow [PR & merge flow](./pr-and-merge-flow.md) and [CONTRIBUTING.md](../../CONTRIBUTING.md)
- **Do not self-merge** unless you are a repo/org admin; do not push straight to `dev` / `staging` / `main`
- Run `pnpm lint` and `pnpm test` locally before asking for review
