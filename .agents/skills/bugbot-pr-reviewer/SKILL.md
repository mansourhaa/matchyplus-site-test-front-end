---
name: bugbot-pr-reviewer
description: Use this skill when the user asks to review a PR, check for bugs in a pull request, or hunt down bugs in a diff. Trigger on "review PR", "check PR", or "bugbot".
---

# BugBot PR Reviewer

## Purpose
This skill provides rigorous, automated code review for GitHub Pull Requests. It acts as an expert code reviewer to analyze diffs for logic flaws, security vulnerabilities, and anti-patterns before code is merged.

## Instructions
Step-by-step instructions for the agent:
1. **Extract Context:** Identify the repository name and PR number from the user's prompt.
2. **Fetch the Diff:** Execute the `fetch_pr_diff` tool (or run `gh pr diff <PR_NUMBER> --repo <REPO>`) to retrieve the code changes.
3. **Analyze the Code:** Review the diff specifically looking for:
   - Logic errors and unhandled edge cases.
   - Security vulnerabilities (e.g., injection risks, exposed secrets).
   - Performance bottlenecks and severe anti-patterns.
4. **Verify (Optional):** If needed, use your `run_command` permission to run local linters or unit tests to confirm a suspected bug.
5. **Format Output:** Compile your findings strictly according to the PR Review structured schema. 

## Rules
- **No hallucinations:** If the code is solid, approve the PR with an empty bug list. Do not invent trivial issues just to populate the report.
- **Actionable fixes:** Every bug report MUST include a specific, copy-pasteable `suggested_fix`.
- **Read-only execution:** Do not commit or push changes. You may run tests, but do not modify source code files outside of isolated test environments.
- **Severity mapping:** Reserve `Critical` severity for security vulnerabilities or guaranteed runtime crashes.

## End State
The task is complete when the PR has been completely read, tested (if applicable), and a structured summary containing the approval status and a detailed list of bugs is presented to the user.