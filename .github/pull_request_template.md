## Summary

<!-- What does this PR change, and why? -->

## Ticket / task

<!-- Link the Linear / Jira / GitHub issue (required when one exists). -->

- Ticket:

## Target branch check

Confirm this PR targets the correct branch (PR Guard enforces this in CI):

- [ ] `feature/*` / `fix/*` / `chore/*` / … → **`dev`**
- [ ] `dev` → **`staging`** (promotion for QA)
- [ ] `staging` → **`main`** (production promotion)

## Checklist

- [ ] I have tested this locally (`pnpm lint`, `pnpm test`, and relevant manual checks)
- [ ] This PR only contains changes related to the ticket / summary
- [ ] I have requested at least one reviewer (CODEOWNERS may auto-request)
- [ ] CI (`Lint, Format, Test & Build`) and PR Guard are expected to pass

## Self-merge policy

**Do not merge your own pull request** unless you are a **repository / org admin**.

Non-admins: a teammate (or CODEOWNER) must review and merge. Authors may rebase, push fixes, and respond to review comments.

Admins may merge their own PRs when needed (prefer a second pair of eyes for `staging` → `main` promotions).
