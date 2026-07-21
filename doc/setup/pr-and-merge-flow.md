# Pull request & merge flow

How code moves from a developer branch into production on **Matchy+** ([matchy-plus/matchy-plus](https://github.com/matchy-plus/matchy-plus)).

Enforcement:

1. **Process** — rules below (always).
2. **CI + PR Guard** — checks on every PR (see workflows under `.github/workflows/`).
3. **Branch protection** — when the org has **GitHub Team** (or higher); setup guide: [branch-protection.md](./branch-protection.md).

See also [CONTRIBUTING.md](../CONTRIBUTING.md).

## The four branch kinds

| Branch | Who commits here? | Role |
| --- | --- | --- |
| `feature/*`, `fix/*`, `chore/*`, … | One developer | Isolated work |
| `dev` | Via PR only | Team integration |
| `staging` | Via promotion PR only | QA / pre-production |
| `main` | Via promotion PR only | Production |

```mermaid
flowchart LR
  F["feature/* / fix/* / …"] -->|PR + review| D[dev]
  D -->|promotion PR| S[staging]
  S -->|promotion PR| M[main]
```

**Never push straight to `dev`, `staging`, or `main`.** Always open a pull request.

## Rules

1. Open a PR for every change that lands on `dev`, `staging`, or `main`.
2. **Do not merge your own PR.** A teammate reviews and merges.
3. Features/fixes target **`dev` only** — never open a feature PR into `main`.
4. Promotion is always **one hop**: `dev` → `staging`, then `staging` → `main`.
5. Merge only when **CI** and **PR Guard** are green (and required reviews when protection is on).

GitHub may show banners like “`dev` is N commits ahead of `main`” and offer **Compare & pull request**. That is normal after merges into `dev`. Do **not** use that shortcut to jump `dev` → `main`; use the promotion steps below.

## Path A — Daily feature / fix work

### 1. Branch from latest `dev`

```bash
git checkout dev
git pull origin dev
git checkout -b feature/short-description
# or: git checkout -b fix/short-description
```

### 2. Develop and verify

```bash
pnpm install   # if needed
pnpm lint
pnpm test
```

Commit with the project convention (`pnpm commit` / conventional commits).

### 3. Push and open a PR into `dev`

```bash
git push -u origin HEAD
```

On GitHub: **compare `feature/...` → `dev`** (not `main`).

Fill the [PR template](../.github/pull_request_template.md).

### 4. Review and merge

| Role | Action |
| --- | --- |
| Author | Respond to review, push fixes |
| Reviewer | Approve and **merge** when checks are green |
| Author | Delete the feature branch after merge (GitHub checkbox / auto-delete) |

After merge, the feature lives on `dev`. It is **not** in staging or production yet.

```mermaid
sequenceDiagram
  participant Dev as Developer
  participant GH as GitHub
  participant Rev as Reviewer

  Dev->>GH: Push feature/* and open PR → dev
  Dev->>Rev: Request review
  Note over GH: CI + PR Guard run
  Rev->>GH: Review / approve
  Rev->>GH: Merge PR (not the author)
  Note over GH: Feature branch may be deleted
  Note over GH: Changes are on dev only
```

## Path B — Promote to staging (QA)

When `dev` has a set of changes ready to test in staging:

1. Open a PR: **`dev` → `staging`**.
2. Title/body should say this is a **promotion** (use the template’s staging checkbox).
3. A teammate (or release owner) reviews and merges.
4. Verify the staging environment / behaviour.

Do not add unrelated commits on the promotion PR; it should only bring `dev` forward into `staging`.

## Path C — Promote to production

When staging is verified:

1. Open a PR: **`staging` → `main`**.
2. Get explicit approval from a release owner.
3. A reviewer merges.
4. Confirm production looks healthy.

```mermaid
flowchart TB
  subgraph daily [Daily]
    A[feature / fix branch] --> B[PR into dev]
    B --> C[Reviewer merges]
  end

  subgraph promote [Promotion]
    C --> D[PR: dev → staging]
    D --> E[QA on staging]
    E --> F[PR: staging → main]
    F --> G[Production]
  end
```

## What each PR type should look like

| PR | Base ← Head | Who opens | Who merges |
| --- | --- | --- | --- |
| Feature / fix | `dev` ← `feature/*` (etc.) | Author | **Someone else** |
| Staging promotion | `staging` ← `dev` | Anyone / release owner | Prefer non-author |
| Production promotion | `main` ← `staging` | Release owner | Prefer non-author |

## Common GitHub UI situations

| You see | Meaning | Do this |
| --- | --- | --- |
| “`dev` had recent pushes” / Compare & pull request | `dev` moved; GitHub offers a PR vs default branch | Ignore unless you intentionally want a promotion; never skip to `main` for features |
| “This branch is N commits ahead of `main`” while viewing `dev` | Integration work has not been promoted yet | Promote via `dev` → `staging` → `main` when ready |
| Merge button available on your own PR | Protection not active yet, or you are an admin bypass | **Do not click it**; ask a teammate |
| PR Guard failed | Wrong base/head for the topology | Retarget the PR (e.g. feature → `dev`, not `main`) |

## Checklist before you ask for a merge

- [ ] Correct base branch (`dev` for features; promotion only for the hops above)
- [ ] PR template filled (summary, ticket, checkboxes)
- [ ] Local lint/tests run; CI + PR Guard green
- [ ] Reviewer requested
- [ ] You will **not** merge it yourself

## Related docs

- [CONTRIBUTING.md](../CONTRIBUTING.md) — short rules
- [Branch protection](./branch-protection.md) — GitHub Team + protect `main` / `staging` / `dev`
- [Development Workflow](./development.md) — daily commands
- [Getting Started](./getting-started.md) — clone and run the stack
