---
name: daily-pr-review
description: Comprehensive workflow to review all open Pull Requests, verify mandatory branch/commit policies, validate Linear issue alignment via Linear MCP, run automated code & bug reviews, and generate structured review files.
triggers:
  - manual
  - daily
---

# Daily Pull Request Review Workflow

## Overview
This workflow automates the systematic review of all open Pull Requests in the repository. It enforces repository branch integrity, author commit rules, Linear issue alignment via Linear MCP, rigorous code quality / bug reviews, and generates persistent review artifacts under `doc/reviews/PR_<PR_NUMBER>_REVIEW.md` following `doc/reviews/PR_REVIEW_TEMPLATE.md`.

> [!IMPORTANT]
> **Synchronous Execution Policy**: Do not run background processes or background tasks (`&`, async execution, detached subshells, etc.). Execute all terminal commands and MCP tool calls synchronously, waiting for each result before proceeding.

---

## Required Tools & Memory Setup

1. **Agent Memory & Context (`/agent-memory-systems`)**:
   - Fetch previous review context from existing reviews in `doc/reviews/`.
   - Retrieve known repository patterns, architecture rules (`.agents/AGENTS.md`), and author history.

2. **Automated Review Engines (`/bugbot-pr-reviewer` & `/code-reviewer`)**:
   - Load `bugbot-pr-reviewer` logic to inspect diffs for logic bugs, unhandled edge cases, and security vulnerabilities.
   - Load `code-reviewer` scripts (`scripts/pr_analyzer.py`, `scripts/code_quality_checker.py`, and `scripts/review_report_generator.py`) to run static analysis and check against `references/coding_standards.md` and `references/code_review_checklist.md`.

3. **Linear MCP Integration**:
   - Initialize the **Linear MCP** connection.
   - Use `linear_search_issues` or `linear_get_issue` to cross-reference PR context against ticket acceptance criteria.
   - Use `linear_create_comment` to post tracking updates.

---

## Execution Workflow

### Step 0: PR Discovery
1. List all open pull requests synchronously using GitHub CLI:
   ```bash
   gh pr list --state open --json number,title,headRefName,baseRefName,author,url,mergeable,mergeStateStatus
   ```
2. Iterate through each open PR sequentially.

---

### Step 1: Verify Approval Eligibility (Mandatory Blockers)

Evaluate each PR against non-negotiable repository gates. If any check fails, immediately set the review status to **DO NOT APPROVE** with the explicit blocker reason documented:

1. **Target Base Branch Check**:
   - Verify the PR targets `dev`.
   - If `baseRefName != "dev"`, mark as **DO NOT APPROVE** (Reason: PR must target `dev`).
2. **Merge Conflict Check**:
   - Check if the PR has merge conflicts with `dev` (`mergeable != "MERGEABLE"` or `mergeStateStatus == "DIRTY"`).
   - If merge conflicts exist, mark as **DO NOT APPROVE** (Reason: Merge conflicts with base branch `dev`).
3. **Author Commit Integrity Check**:
   - Inspect the commit log for the PR:
     ```bash
     gh pr view <PR_NUMBER> --json commits
     ```
   - Verify that every commit is authored solely by the PR author.
   - Check for any co-authors, secondary author signatures, or unauthorized author emails.
   - Ensure the repository **No AI Attribution Rule** is upheld (no AI tool co-authors or attribution trailers).
   - If any commit was authored or co-authored by someone other than the PR author, mark as **DO NOT APPROVE**.

---

### Step 2: Linear Issue Alignment (via Linear MCP)

1. **Extract Linear Issue Identifier**:
   - Search for the Linear issue key (e.g., `ENG-123`, `PROJ-456`) in:
     - Branch name (e.g., `feat/ENG-123-user-auth` or `feat/contact-footer-ENG-42`)
     - PR title
     - PR description body
2. **Handle Missing Linkage**:
   - If no valid Linear issue ID is found or linked, mark as **DO NOT APPROVE** due to missing Linear linkage.
3. **Fetch & Verify Linear Issue**:
   - Call `call_mcp_tool` with `ServerName: "linear"` and `ToolName: "linear_get_issue"` (or `linear_search_issues`):
     ```json
     {
       "ServerName": "linear",
       "ToolName": "linear_get_issue",
       "Arguments": {
         "id": "<ISSUE_ID>"
       }
     }
     ```
   - **Acceptance Criteria Verification**: Compare the PR diff and description against the requirements/acceptance criteria defined in the Linear issue description.
   - **Status Verification**: Ensure the Linear issue is in an active state (*In Progress*, *In Review*, or equivalent).
4. **Post Tracking Update**:
   - Post an update comment on the Linear issue with the review tracking status:
     ```json
     {
       "ServerName": "linear",
       "ToolName": "linear_create_comment",
       "Arguments": {
         "issueId": "<ISSUE_ID>",
         "body": "PR #<PR_NUMBER> review initiated. Base branch: <TARGET>, Status: <STATUS>."
       }
     }
     ```

---

### Step 3: Conduct Code & Bug Review

1. **Fetch PR Diff & Inspect Code**:
   ```bash
   gh pr diff <PR_NUMBER>
   ```
2. **Execute Static Analysis & Quality Checks**:
   - Run `pr_analyzer.py` on the modified files:
     ```bash
     python .agents/skills/code-reviewer/scripts/pr_analyzer.py <CHANGED_PATH>
     ```
   - Run `code_quality_checker.py` for anti-pattern detection:
     ```bash
     python .agents/skills/code-reviewer/scripts/code_quality_checker.py <CHANGED_PATH>
     ```
3. **Bug & Security Scanning (`/bugbot-pr-reviewer`)**:
   - Scan for logic bugs, race conditions, edge-case mishandling, and unhandled errors.
   - Verify full adherence to architectural boundaries in `.agents/AGENTS.md` (Layering: routes → schemas → services → types).
   - Check error handling: ensure all route handlers and async service methods are wrapped in `try/catch`.
   - Check API typing: ensure named request/response types are used (no inline anonymous objects).
   - Check security & auth: token verification, role hierarchy, and sanitization.
4. **Local Lint & Test Verification (on Reviewed Tip)**:
   - Check out the PR branch tip locally to run scoped tests:
     ```bash
     pnpm --filter <touched_package> lint
     pnpm --filter <touched_package> test
     ```

---

### Step 4: Generate Review Artifact

1. **Read Template**:
   - Read `doc/reviews/PR_REVIEW_TEMPLATE.md`.
2. **Populate Review Content**:
   - PR Metadata: PR number, title, source branch, target branch (`dev`), reviewed commit SHA, PR URL.
   - Overall Assessment & Verdict: **Approve**, **Request changes**, or **DO NOT APPROVE** (if blockers failed).
   - Linear Alignment: Linear issue ID, status, title, acceptance criteria checklist, and sync state.
   - What Changed & What's Solid.
   - Bugs Table: Severity (`critical`, `high`, `medium`, `low`), location (`file#Lline`), finding description, reproduction/confirmation steps, and suggested fix.
   - Non-blocking Notes / Suggestions.
   - Lint & Test Results table.
   - Final Verdict Summary.
3. **Persist Review Artifact**:
   - Write the review artifact directly to `doc/reviews/PR_<PR_NUMBER>_REVIEW.md`.
   - Ensure markdown links point directly to code lines using `file:///` format or GitHub permalinks.

---

## Review Checklist Summary

| Checkpoint | Requirement | Failure Action |
|---|---|---|
| **Base Branch** | Must be `dev` | Mark **DO NOT APPROVE** |
| **Mergeability** | Clean merge with `dev`, no conflicts | Mark **DO NOT APPROVE** |
| **Commit Authorship** | 100% authored by PR author, no AI attribution | Mark **DO NOT APPROVE** |
| **Linear Linkage** | Valid Linear issue ID present & active | Mark **DO NOT APPROVE** |
| **Scope Match** | PR delivers on Linear acceptance criteria | Mark **Request changes** |
| **Code Quality / Bugs** | Zero critical/high bugs, full try/catch & schema typing | Mark **Request changes** |
| **Lint & Tests** | Clean test & lint runs on touched packages | Mark **Request changes** |
| **Artifact Created** | Saved at `doc/reviews/PR_<PR_NUMBER>_REVIEW.md` | Required |
