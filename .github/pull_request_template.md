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

## Do not self-merge

**Do not merge your own pull request.**

A teammate (or CODEOWNER) must review and merge. Authors may rebase, push fixes, and respond to review comments. For `dev` → `staging` / `staging` → `main` promotions, prefer a release owner who is not the author.
