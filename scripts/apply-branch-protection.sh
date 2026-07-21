#!/usr/bin/env bash
# Apply branch protection for matchy-plus/matchy-plus.
#
# Prerequisites:
#   1. Org on GitHub Team (or higher) — Free private repos cannot protect branches
#   2. gh auth with Administration permission on the repo (classic: repo scope;
#      fine-grained: Administration=Read and write, Contents, Pull requests, Metadata)
#   3. CI + PR Guard workflows already running (so required checks exist)
#
# Usage:
#   ./scripts/apply-branch-protection.sh
#   REPO=matchy-plus/matchy-plus ./scripts/apply-branch-protection.sh

set -euo pipefail

REPO="${REPO:-matchy-plus/matchy-plus}"

# Status check names must match the job `name:` fields in the workflows.
REQUIRED_CHECKS='["Lint, Format, Test & Build","Enforce branch topology"]'

protect_branch() {
  local branch="$1"
  local reviews="$2"

  echo "→ Protecting ${REPO}:${branch} (approvals=${reviews})"

  gh api \
    --method PUT \
    -H "Accept: application/vnd.github+json" \
    "repos/${REPO}/branches/${branch}/protection" \
    --input - <<EOF
{
  "required_status_checks": {
    "strict": true,
    "contexts": ${REQUIRED_CHECKS}
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "required_approving_review_count": ${reviews},
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "require_last_push_approval": true
  },
  "restrictions": null,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true,
  "lock_branch": false,
  "allow_fork_syncing": false
}
EOF
}

echo "Repo settings: squash-only merges, delete branch on merge"
gh api --method PATCH "repos/${REPO}" \
  -F allow_squash_merge=true \
  -F allow_merge_commit=false \
  -F allow_rebase_merge=false \
  -F delete_branch_on_merge=true \
  -F allow_auto_merge=true \
  -F allow_update_branch=true \
  >/dev/null

# Full chain: feature → dev → staging → main
protect_branch "dev" 1
protect_branch "staging" 1
protect_branch "main" 1

echo
echo "Done. Verify at: https://github.com/${REPO}/settings/branches"
echo "If API returns 403 Upgrade…, the org needs GitHub Team for private branch protection."
