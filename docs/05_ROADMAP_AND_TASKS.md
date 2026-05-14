# Roadmap and Task Breakdown

## Phase 0 — Drift Control

Goal:

```txt
Lock architecture before implementation continues.
```

Tasks:

| Task | Goal |
|---|---|
| T000 | Create docs lock |
| T001 | Audit current repo drift |
| T002 | Correct scaffold drift |

## Phase 1 — Backend Foundation

Goal:

```txt
Local Express API running on 127.0.0.1.
```

Tasks:

| Task | Goal |
|---|---|
| T010 | Minimal Express server |
| T011 | Environment config loader |
| T012 | Request logging without PII |
| T013 | Error response shape |
| T014 | Graceful shutdown |
| T015 | Root scripts |

## Phase 2 — Local MongoDB

Goal:

```txt
API connects to local MongoDB safely.
```

Tasks:

| Task | Goal |
|---|---|
| T020 | Mongo connection module |
| T021 | Collections module |
| T022 | Startup indexes |
| T023 | Mongo health status |
| T024 | README local Mongo setup |

## Phase 3 — Post Domain

Goal:

```txt
Posts exist as explicit domain objects.
```

Tasks:

| Task | Goal |
|---|---|
| T030 | Shared post types |
| T031 | Markdown-to-HTML pipeline |
| T032 | HTML sanitization |
| T033 | Content hash generation |
| T034 | Post repository |
| T035 | Post service |

## Phase 4 — Public Readonly API

Goal:

```txt
Published posts are readable publicly.
```

Tasks:

| Task | Goal |
|---|---|
| T040 | GET /api/v1/posts |
| T041 | GET /api/v1/posts/:slug |
| T042 | Pagination |
| T043 | Tag filter |
| T044 | Draft hiding tests |

## Phase 5 — Frontend Foundation

Goal:

```txt
React app shell exists.
```

Tasks:

| Task | Goal |
|---|---|
| T050 | Vite React TypeScript setup |
| T051 | Router setup |
| T052 | API client |
| T053 | Public layout |
| T054 | Admin layout placeholder |

## Phase 6 — Design System

Goal:

```txt
Beautiful but dependency-light UI.
```

Tasks:

| Task | Goal |
|---|---|
| T060 | CSS tokens |
| T061 | Base styles |
| T062 | Prose styles |
| T063 | Button/Card/Chip/Input components |
| T064 | Responsive layout |
| T065 | Dark-first visual polish |

## Phase 7 — Public Blog UI

Goal:

```txt
Readable beautiful public blog.
```

Tasks:

| Task | Goal |
|---|---|
| T070 | Home page |
| T071 | Post detail page |
| T072 | About page |
| T073 | Public tags |
| T074 | Loading/error/empty states |
| T075 | Technical metadata panel |

## Phase 8 — Admin API

Goal:

```txt
Local-only post management.
```

Tasks:

| Task | Goal |
|---|---|
| T080 | requireLocalhost middleware |
| T081 | Admin list posts |
| T082 | Create draft |
| T083 | Update draft |
| T084 | Publish/unpublish |
| T085 | Delete post |
| T086 | Admin validation errors |

## Phase 9 — Admin UI

Goal:

```txt
Local writing interface.
```

Tasks:

| Task | Goal |
|---|---|
| T090 | Admin dashboard |
| T091 | Post list |
| T092 | New post page |
| T093 | Edit post page |
| T094 | Markdown editor |
| T095 | Preview panel |
| T096 | Cmd+S save |

## Phase 10 — WebAuthn/Passkeys

Goal:

```txt
Touch ID/passkey owner login.
```

Tasks:

| Task | Goal |
|---|---|
| T100 | Auth data model |
| T101 | Registration options |
| T102 | Registration verification |
| T103 | Login options |
| T104 | Login verification |
| T105 | Session cookie |
| T106 | Protect admin APIs |
| T107 | Logout/session status |

## Phase 11 — Production Local Serving

Goal:

```txt
Single local server can serve public app.
```

Tasks:

| Task | Goal |
|---|---|
| T110 | Web production build |
| T111 | Express static serving |
| T112 | Router fallback |
| T113 | Hide admin in public mode |
| T114 | Production start script |

## Phase 12 — Tor

Goal:

```txt
Blog reachable through onion address.
```

Tasks:

| Task | Goal |
|---|---|
| T120 | Tor setup docs |
| T121 | Onion hostname docs |
| T122 | Onion key backup docs |
| T123 | Public-only Tor checklist |

## Phase 13 — Proof and Signing

Goal:

```txt
Content can be verified cryptographically.
```

Tasks:

| Task | Goal |
|---|---|
| T130 | Author key generation |
| T131 | Release manifest |
| T132 | Manifest hash |
| T133 | Manifest signature |
| T134 | Proof page |
| T135 | Verification docs |

## Phase 14 — IPFS Archive

Goal:

```txt
Published releases can be content-addressed.
```

Tasks:

| Task | Goal |
|---|---|
| T140 | IPFS docs |
| T141 | Local IPFS publish script |
| T142 | CID capture |
| T143 | Manifest CID update |
| T144 | Re-sign after CID |

## Phase 15 — Hardening

Goal:

```txt
No accidental leaks.
```

Tasks:

| Task | Goal |
|---|---|
| T150 | Security headers |
| T151 | CORS hardening |
| T152 | CSRF for admin mutations |
| T153 | Rate limit auth routes |
| T154 | Production error hygiene |
| T155 | Privacy model docs |
| T156 | Final checklist |

## Parallelization Guidance

Parallel work is allowed only when file sets do not overlap.

Safe parallel examples:

```txt
T010 backend server
T060 CSS tokens
T120 Tor docs
```

Unsafe parallel examples:

```txt
T030 post types
T040 post API
```

because API depends on the data model.
