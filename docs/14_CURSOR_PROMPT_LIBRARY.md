# Cursor Prompt Library

## Prompt A — Install Docs Lock

Use this first if docs are not yet in the repo.

```txt
Task ID: T000

Goal:
Install the project architecture docs lock.

Allowed files:
- docs/00_PROJECT_CONTRACT.md
- docs/01_ARCHITECTURE_LOCK.md
- docs/02_CURSOR_OPERATING_PROTOCOL.md
- docs/03_CURSOR_RULES.md
- docs/04_DECISIONS.md
- docs/05_ROADMAP_AND_TASKS.md
- docs/06_DATA_MODEL.md
- docs/07_API_CONTRACT.md
- docs/08_SECURITY_PRIVACY_MODEL.md
- docs/09_LOCAL_DEV_AND_RUNTIME.md
- docs/10_TOR_AND_PUBLISHING_MODEL.md
- docs/11_UI_DESIGN_SYSTEM.md
- docs/12_ACCEPTANCE_CHECKLIST.md
- docs/13_REPO_AUDIT_TEMPLATE.md
- docs/14_CURSOR_PROMPT_LIBRARY.md

Forbidden changes:
- Do not modify app code.
- Do not add dependencies.
- Do not delete existing files.
- Do not redesign folder structure.
- Do not run formatters.

Implementation:
Create the docs exactly from the provided content.

Acceptance criteria:
- all listed docs exist
- no app source files changed
- no package files changed
- no dependencies changed

Return:
1. Files changed
2. Confirmation no app code changed
3. Any existing repo drift noticed, but do not fix it
```

## Prompt B — Audit Current Drift

```txt
Task ID: T001

Goal:
Audit the current repo against the docs. Do not modify files.

Read:
- docs/00_PROJECT_CONTRACT.md
- docs/01_ARCHITECTURE_LOCK.md
- docs/02_CURSOR_OPERATING_PROTOCOL.md
- docs/03_CURSOR_RULES.md
- docs/04_DECISIONS.md
- docs/12_ACCEPTANCE_CHECKLIST.md

Allowed files:
- none

Forbidden changes:
- Do not edit files.
- Do not install dependencies.
- Do not run formatters.
- Do not refactor.
- Do not fix anything.

Audit for:
1. folder structure drift
2. dependency drift
3. public/admin boundary drift
4. DNS/cloud dependency drift
5. MongoDB/Mongoose drift
6. remote font/CDN/analytics drift
7. server binding drift
8. TypeScript/script drift
9. undocumented architecture decisions
10. security/privacy drift

Return:
1. Drift found
2. Severity for each drift: low/medium/high/critical
3. Files involved
4. Suggested correction tasks
5. No files modified
```

## Prompt C — Correction Task Template

```txt
Task ID: T00X

Goal:
Correct only the specific drift listed below.

Drift to fix:
[PASTE EXACT DRIFT ITEM]

Read first:
- docs/00_PROJECT_CONTRACT.md
- docs/01_ARCHITECTURE_LOCK.md
- docs/03_CURSOR_RULES.md
- docs/04_DECISIONS.md

Allowed files:
- [EXACT FILES]

Forbidden changes:
- Do not modify unrelated files.
- Do not add dependencies.
- Do not change architecture.
- Do not introduce cloud services.
- Do not expose admin publicly.
- Do not add analytics.
- Do not add remote fonts.
- Do not use Mongoose.

Implementation:
[EXACT FIX]

Acceptance criteria:
- [ ] drift is corrected
- [ ] no unrelated files changed
- [ ] commands pass

Commands to run:
- pnpm typecheck
- pnpm build

Return:
1. Files changed
2. Summary
3. Commands run/results
4. Deviations
5. Unresolved questions
```

## Prompt D — Parallel Batch Planning

```txt
Task ID: PLAN-PARALLEL-001

Goal:
Create a safe parallel execution plan from the roadmap. Do not modify files.

Read:
- docs/05_ROADMAP_AND_TASKS.md
- docs/02_CURSOR_OPERATING_PROTOCOL.md
- docs/03_CURSOR_RULES.md

Allowed files:
- none

Forbidden changes:
- Do not modify files.

Return:
1. Tasks that can run in parallel
2. Tasks that must run sequentially
3. File overlap risks
4. Recommended next 3 task prompts
```
