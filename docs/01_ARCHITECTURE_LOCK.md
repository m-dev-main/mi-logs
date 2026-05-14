# Architecture Lock

## 1. Runtime Topology

Development topology:

```txt
MacBook
  ├─ MongoDB local
  │    └─ 127.0.0.1:27017
  │
  ├─ Express API
  │    └─ 127.0.0.1:4000
  │
  ├─ React/Vite dev server
  │    └─ 127.0.0.1:5173
  │
  └─ Static release server for Tor exposure later
       └─ 127.0.0.1:4080
```

Production-local topology:

```txt
MacBook
  ├─ MongoDB local
  ├─ Express API for local admin/writer workflows
  │    └─ 127.0.0.1:4000
  ├─ Readonly static release server
  │    └─ 127.0.0.1:4080
  └─ Tor onion service
       └─ HiddenServicePort 80 127.0.0.1:4080
```

## 2. Monorepo Layout

Canonical layout:

```txt
mi-log/
  apps/
    api/
      src/
    web/
      src/
  packages/
    shared/
      src/
  scripts/
  docs/
  .env.example
  .gitignore
  package.json
  pnpm-workspace.yaml
  README.md
```

## 3. App Responsibilities

### `apps/api`

Owns:

- Express server
- public readonly post API
- localhost-only admin API
- local MongoDB connection
- Markdown processing
- WebAuthn/passkey verification later
- admin session later
- release manifest generation support later

Must not own:

- analytics
- remote telemetry
- third-party auth
- public write access
- cloud database connection

### `apps/web`

Owns:

- public blog UI
- post listing
- post detail page
- about page
- proof page later
- local admin UI
- Markdown editor later

Must not own:

- secret keys
- database access
- direct file writes
- unsanitized HTML trust decisions

### `packages/shared`

Owns:

- shared TypeScript types
- DTOs
- utility schemas if needed
- constants used by both frontend/backend

Must not own:

- server runtime logic
- browser-specific UI logic
- secrets
- database clients

## 4. Public Reader Boundary

Public readers may only access:

```txt
GET /
GET /post/:slug
GET /about
GET /proof
GET /api/v1/posts
GET /api/v1/posts/:slug
```

Public readers must never access:

```txt
draft posts
admin APIs
auth APIs
local logs
MongoDB
private keys
server internals
```

## 5. Admin Boundary

Admin is always local-first.

Allowed admin origins in v0:

```txt
http://127.0.0.1:5173
http://localhost:5173
http://127.0.0.1:4000
http://localhost:4000
```

Admin routes must be protected by:

1. localhost-only network check
2. WebAuthn/passkey session later
3. CSRF protection later for mutations

Admin route family:

```txt
/admin
/admin/*
/api/v1/admin/*
/api/v1/auth/*
```

## 6. Database Boundary

Database:

```txt
MongoDB local
```

Default URI:

```txt
mongodb://127.0.0.1:27017
```

Default database:

```txt
mi_log
```

Rules:

- Use official MongoDB Node driver.
- Do not use Mongoose.
- Do not use MongoDB Atlas in v0.
- Do not expose MongoDB publicly.
- Fail fast if API requires MongoDB and cannot connect.
- Never log the full MongoDB URI.

## 7. Post Lifecycle

```txt
draft → published → archived
```

Draft:

- visible only in admin
- never returned by public API

Published:

- visible publicly
- has `publishedAt`
- has stable `slug`
- has `contentSha256`

Archived:

- hidden from public by default
- retained locally

## 8. Network Boundary

The app must bind to localhost by default.

Allowed default binding:

```txt
127.0.0.1
```

Forbidden default binding:

```txt
0.0.0.0
```

If future external LAN binding is needed, it must be explicit and documented.

## 9. Tor Boundary

Tor should forward only the readonly static release server.

Target v0 Tor forwarding:

```txt
HiddenServicePort 80 127.0.0.1:4080
```

The dynamic API remains a local writer/admin system on `127.0.0.1:4000`.
The admin-capable dynamic API must not be the Tor target.

## 10. Static vs Dynamic Policy

MERN is allowed for v0, but the public experience should remain readonly.

Dynamic capability is for:

- local admin
- post editing
- publishing workflow
- future proof/manifest generation

Dynamic capability is not for:

- public comments
- public user accounts
- public dashboards
- tracking readers
