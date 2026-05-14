# Repo Audit Template

Use this whenever drift is suspected.

## Audit Task Prompt

```txt
Task ID: AUDIT-001

Goal:
Audit the current repo against the architecture docs. Do not modify files.

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
5. Do not implement corrections
```

## Drift Severity

| Severity | Meaning |
|---|---|
| Low | Cosmetic or documentation mismatch |
| Medium | Maintainability issue |
| High | Architecture/security boundary issue |
| Critical | Public exposure/secrets/cloud dependency/admin leak |

## Audit Output Shape

```txt
Drift found:

1. [Severity] Description
   Files:
   - path
   Why it matters:
   Suggested correction task:

No files modified.
```
