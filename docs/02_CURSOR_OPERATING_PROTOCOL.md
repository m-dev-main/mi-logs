# Cursor Operating Protocol

## 1. Purpose

This document defines how Cursor should work on this repo without architectural drift.

The working model:

```txt
GPT = architect/spec owner/reviewer
Cursor = implementation worker
Repo docs = source of truth
```

## 2. Core Loop

Every implementation should follow this loop:

```txt
1. Read relevant docs
2. Apply one small task
3. Modify only allowed files
4. Run requested checks
5. Report changed files, results, deviations
6. Stop
```

## 3. Cursor Must Read Before Any Task

Unless the task says otherwise, Cursor must read:

```txt
docs/00_PROJECT_CONTRACT.md
docs/01_ARCHITECTURE_LOCK.md
docs/02_CURSOR_OPERATING_PROTOCOL.md
docs/03_CURSOR_RULES.md
docs/04_DECISIONS.md
```

## 4. Task Prompt Shape

Every Cursor task should have this structure:

```txt
Task ID:
Goal:
Context:
Allowed files:
Forbidden changes:
Implementation:
Acceptance criteria:
Commands to run:
Return format:
```

## 5. Allowed Scope

A single task should usually touch:

```txt
1 concept
3-8 files
1 acceptance checklist
```

If a task needs more, split it.

## 6. Forbidden Cursor Behavior

Cursor must not:

- make broad refactors
- change architecture
- add dependencies without approval
- rename folders without approval
- introduce cloud services
- introduce analytics
- introduce external fonts
- expose admin publicly
- create public write routes
- silently change the data model
- turn the project into a general SaaS app

## 7. Dependency Rule

Cursor may suggest dependencies.

Cursor may not install dependencies unless the task explicitly says:

```txt
Dependency additions allowed:
- package-name
```

## 8. Return Format

At the end of every task, Cursor must return:

```txt
1. Files changed
2. Summary of changes
3. Commands run
4. Results
5. Deviations from task
6. Unresolved questions
```

If there are no deviations, say:

```txt
Deviations: none
```

## 9. Drift Detection

Drift exists if implementation violates:

- project contract
- architecture lock
- decisions log
- current task scope
- security/privacy boundaries

When drift is found, stop feature work and create a correction task.

## 10. Parallel Work Rule

Parallel Cursor tasks are allowed only if their allowed file sets do not overlap.

Safe parallel examples:

| Task A | Task B | Safe? |
|---|---:|---:|
| backend health route | frontend CSS tokens | Yes |
| post repository | post API routes | No |
| docs update | frontend component | Usually yes |
| auth middleware | admin API routes | No |

## 11. No Guessing Rule

If a requirement is unclear:

```txt
Stop and ask.
Do not infer.
```

If a safe default is already listed in docs, use it.
