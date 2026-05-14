# mi-log — Project Contract

## 1. Project Goal

**mi-log** is a **local-first MERN publishing node** for a beautiful read-only blog that can be served without DNS through a Tor onion service.

This project is not a normal SaaS blog platform.

It is a personal publishing system where:

- writing stays locally controlled
- public readers get only read-only access
- admin remains localhost-only
- identity is eventually cryptographic
- DNS is not required
- cloud services are not required in v0
- the system can later archive releases through IPFS/content addressing

## 2. Product Identity

Working name:

```txt
mi-log
```

Core sentence:

```txt
A local-first, self-owned, cryptographically grounded publishing node.
```

## 3. Non-Negotiable Principles

1. **No DNS dependency** for the canonical access path.
2. **No cloud dependency in v0**.
3. **No public admin panel**.
4. **No public write API**.
5. **No analytics**.
6. **No third-party auth provider**.
7. **No remote fonts**.
8. **No CDN assets**.
9. **No MongoDB Atlas in v0**.
10. **Local MongoDB only**.
11. **No password login in final auth model**.
12. **WebAuthn/passkeys for owner auth later**.
13. **Tor exposes only the public reader surface**.
14. **Admin stays localhost-only**.
15. **IPFS is optional archive layer, not required for app startup**.
16. **The app should remain understandable by one technical person reading the repo**.

## 4. What the Public Can Access

Allowed public reader surface:

```txt
GET /
GET /post/:slug
GET /about
GET /proof
GET /api/v1/posts
GET /api/v1/posts/:slug
```

The public reader surface may later be exposed through Tor.

## 5. What the Public Must Never Access

Forbidden public surface:

```txt
/admin
/admin/*
/api/v1/admin/*
/api/v1/auth/*
MongoDB
logs
private keys
draft posts
local config
source maps in production unless explicitly enabled
```

## 6. v0 Stack

| Layer | Decision |
|---|---|
| Language | TypeScript |
| Backend | Node.js + Express |
| Frontend | React + Vite |
| Database | Local MongoDB |
| Mongo access | Official MongoDB Node driver |
| Styling | Custom CSS |
| UI library | None |
| Auth provider | None |
| Public hosting path | Tor onion service |
| Admin access | Localhost-only |
| Package manager | pnpm |
| Monorepo | pnpm workspaces |

## 7. Explicitly Not in v0

- public comments
- public user accounts
- public login
- payments
- newsletter sending
- email login
- OAuth
- password login
- analytics
- CDN
- remote fonts
- MongoDB Atlas
- Docker requirement
- Kubernetes
- multi-author support
- public admin access
- server-side dynamic personalization for readers

## 8. Cursor Role

Cursor is the implementation worker, not the architect.

Cursor may:

- implement the exact task given
- modify only allowed files
- report issues
- suggest follow-up tasks

Cursor must not:

- redesign architecture
- add dependencies without explicit permission
- expose admin publicly
- introduce cloud services
- add analytics
- invent features outside the task

## 9. Source of Truth Order

When there is a conflict, follow this order:

1. `docs/00_PROJECT_CONTRACT.md`
2. `docs/01_ARCHITECTURE_LOCK.md`
3. `docs/04_DECISIONS.md`
4. Current task prompt
5. Existing implementation

Implementation must bend to the docs, not the opposite.

## 10. Success Definition

The project is successful when:

- a reader can open the blog through a Tor onion address
- the reader can only read published posts
- unpublished drafts are never exposed
- the owner can write locally
- admin is not reachable from public routes
- the app runs without cloud services
- the repo explains itself clearly
- future work can proceed in small patch-controlled tasks
