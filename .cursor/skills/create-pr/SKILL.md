---
name: create-pr
description: >-
  Open a GitHub pull request for calisthenics-trainer. Use when the user asks
  to create a PR, open a pull request, or ship the current work.
---

# Create a pull request

Work from the repo root on Windows PowerShell. Do not use a bash heredoc. Do not update git config, skip hooks, or force-push.

## Before committing

Run these in parallel:

- `git status --short`
- `git diff` and `git diff --staged`
- `git log -8 --oneline`
- `git fetch origin` and `git status -sb` so the branch is compared with `origin/main`

If application code changed, run `npm test` and stop if it fails. The Pages workflow runs `npm ci`, `npm test`, and `npm run build` only after a push to `main`.

Leave secrets, `.env` files, and credential files unstaged. If there is nothing to commit, do not create an empty commit.

## Branch

Base the work on the latest `origin/main`. If the current branch is `main` or its pull request is already merged, create a new branch:

```powershell
git checkout -b feature/short-topic origin/main
```

Keep uncommitted work. The branch name is lowercase and uses hyphens.

## Commit

Match recent history: one or two sentences that say why the change exists. Write the message to `.git/COMMIT_MSG_TMP.txt`, then:

```powershell
git add <paths>
git commit -F .git/COMMIT_MSG_TMP.txt
Remove-Item .git/COMMIT_MSG_TMP.txt
```

One commit per concern. Stage only files that belong in that commit.

## Open the pull request

Push and create the pull request against `main`. Write the body to `.git/PR_BODY.md` and delete it after `gh` accepts it.

```powershell
git push -u origin HEAD
gh pr create --base main --title "Short sentence" --body-file .git/PR_BODY.md
Remove-Item .git/PR_BODY.md
```

Use this body:

```markdown
## Summary
- What changed and why, in one to three bullets

## Test plan
- [x] `npm test`
- [ ] Check that matters for this change
```

Reply with the pull request URL. If the change needs the GitHub Pages deploy, say that the workflow runs after the pull request is merged to `main`.
