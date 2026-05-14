# mi-log

**mi-log** is a local-first, self-owned publishing node: you run it on your machine, keep drafts and data under your control, and can expose a read-only public surface later (for example via Tor) without treating DNS as the canonical access path.

- **Local-first:** MongoDB, API, and admin-facing work stay on localhost.
- **No DNS philosophy:** Reachability does not depend on owning a domain name for the core model.
- **Localhost-only admin:** Administrative routes and auth stay off the public surface.

**Documentation is the source of truth.** Start with `docs/00_PROJECT_CONTRACT.md` and `docs/01_ARCHITECTURE_LOCK.md`.

**Current status:** v0 local acceptance pass verified for source, release, runtime boundary, and backup audits.

**v0 closure note:** Automated v0 acceptance passes. Remaining unverified items are optional/manual: live Tor, IPFS CLI archival, and the final browser passkey pass.

## v0 status

Implemented:

- Local-first MERN monorepo with `apps/api`, `apps/web`, and `packages/shared`.
- Express API on `127.0.0.1:4000` with readonly public posts/proof routes and localhost-only admin/auth routes.
- React/Vite public reader UI with home, post detail, about, proof, and local admin routes.
- Local MongoDB post storage with draft, published, and archived post states; public APIs return only published content.
- Markdown rendering and server-side HTML sanitization.
- Readonly release export in `releases/latest`, including static post data, manifest, signature, author public key, and release SHA-256.
- Readonly static release server on `127.0.0.1:4080`; this is the intended v0 Tor target.
- Local backup and backup audit tooling. Backups include MongoDB recovery data and may include the private author key.

Intentionally not implemented or not verified in this pass:

- Live Tor onion hostname generation and Tor Browser access.
- IPFS archival through the local `ipfs` CLI.
- Remote pinning, cloud upload, Tor automation, IPFS daemon automation, analytics, CDN assets, public comments, public accounts, and public write APIs.
- Browser WebAuthn owner registration/login flow was not re-run during this acceptance pass; keep those manual checks separate from automated audits.

Local commands:

```sh
pnpm typecheck
pnpm audit:source
pnpm release
pnpm audit:release
pnpm audit:all
pnpm backup:local
pnpm audit:backup backups/<created-folder>
pnpm dev
pnpm serve:release
pnpm audit:runtime
```

Safety warnings:

- Point Tor at `127.0.0.1:4080`, the readonly static release server, not the dynamic API on `127.0.0.1:4000`.
- Keep `.env`, `keys/private`, `releases`, `backups`, `node_modules`, and `dist` out of Git.
- Treat `backups/` as private/offline material because backups may contain `keys/private/author.key`.
- Do not share dynamic admin/auth routes publicly; the static release server intentionally returns 404 for `/api/*` and `/admin/*`.
- IPFS is optional local archival only. It is not required for app startup, release export, or Tor serving.

## Required tools

- Node.js
- pnpm
- mongodb-community (local)

See `docs/09_LOCAL_DEV_AND_RUNTIME.md` for environment variables and workflow targets.

## Local dev port conflicts

The API must bind to `127.0.0.1:4000` and the web dev server must bind to
`127.0.0.1:5173`. Stale dev processes can keep those ports open and cause
`EADDRINUSE` when `pnpm dev` starts.

Check the local listeners on macOS:

```sh
lsof -nP -iTCP:4000 -sTCP:LISTEN
lsof -nP -iTCP:5173 -sTCP:LISTEN
```

If a stale process owns one of those ports, stop it with:

```sh
kill <PID>
```

You can also print both listeners with:

```sh
pnpm dev:ports
```

## Local API seed verification

Start local MongoDB, seed deterministic posts, then run the API:

```sh
brew services start mongodb-community || true
pnpm seed:api:posts
pnpm dev:api
```

In another terminal, verify the public readonly API:

```sh
curl "http://127.0.0.1:4000/api/v1/status"
curl "http://127.0.0.1:4000/api/v1/posts"
curl "http://127.0.0.1:4000/api/v1/posts/hello-from-mi-log"
curl "http://127.0.0.1:4000/api/v1/posts/draft-seed-post"
curl "http://127.0.0.1:4000/api/v1/posts/archived-seed-post"
curl "http://127.0.0.1:4000/api/v1/posts?page=abc"
```

The public list/detail should expose only the published `hello-from-mi-log` seed post. The draft and archived seed slugs must return `POST_NOT_FOUND`.

## Release export

The readonly release artifact is generated locally from the public frontend build
and published MongoDB posts only:

```sh
pnpm generate:author-key
pnpm release
```

`pnpm release` runs `pnpm build:web` and then exports to `releases/latest`:

```txt
releases/latest/
  public/
  sovereign-manifest.json
  sovereign-manifest.sig
  author.pub
  release-sha256.txt
```

Included:

- the static public reader app in `releases/latest/public`
- `releases/latest/public/mi-log-data/posts.json` with published post list/detail data
- `sovereign-manifest.json` with published post hashes only
- `sovereign-manifest.sig` when `keys/private/author.key` exists
- `author.pub` when the configured public author key exists
- `release-sha256.txt`, computed from the manifest, signature, and public key data

Excluded:

- drafts and archived posts
- `bodyMarkdown`
- admin/auth/session collections and API data
- MongoDB dumps
- private keys, including `keys/private/author.key`
- cloud uploads, IPFS publishing, Tor config, analytics, and remote assets

Inspect the proof files with:

```sh
cat releases/latest/sovereign-manifest.json
cat releases/latest/sovereign-manifest.sig
cat releases/latest/author.pub
cat releases/latest/release-sha256.txt
```

`releases/latest` is a readonly public artifact. It is not an admin surface, and
must not be used for writing, auth, sessions, or private administration.

## Readonly release serving

Serve the exported public artifact without MongoDB, admin APIs, auth routes, or
session state:

```sh
pnpm release
pnpm serve:release
open http://127.0.0.1:4080
```

Defaults:

```txt
STATIC_RELEASE_DIR=releases/latest/public
STATIC_HOST=127.0.0.1
STATIC_PORT=4080
```

The static server only serves the readonly release files. `/api/*` and
`/admin/*` return static 404 responses instead of dynamic API JSON.

## Tor exposure later

For v0 onion exposure, point Tor at the readonly static release server:

```txt
HiddenServicePort 80 127.0.0.1:4080
```

This keeps the public path DNS-free and avoids public IP or router port
forwarding. The dynamic API and admin UI remain local-only and outside the Tor
exposure path.

## Optional IPFS archive

IPFS is optional archive memory for a readonly release. Tor is the live presence
path; IPFS records an immutable content address for an exported public artifact.

Prerequisite:

```sh
ipfs version
```

Archive the current release with the local IPFS CLI:

```sh
pnpm release
pnpm ipfs:add-release
```

On success, the command writes `releases/latest/ipfs-cid.txt`, updates
`sovereign-manifest.json` with `ipfsCid`, re-signs the manifest when the local
author private key exists, and recomputes `release-sha256.txt`.

This project does not include remote pinning, cloud upload, daemon management, or
any IPFS requirement for normal app startup or release export.

## Hardening audits

Run source and release artifact checks before sharing a release:

```sh
pnpm audit:source
pnpm audit:release
pnpm audit:all
```

`pnpm audit:all` runs typecheck, release export, source audit, and release audit.
It does not start long-running servers.

Runtime boundary checks require both servers to already be running:

```sh
pnpm dev
pnpm serve:release
pnpm audit:runtime
```

The runtime audit checks safe headers, public readonly routes, unauthenticated
admin behavior, and static server 404s for admin/auth API paths.

## Local backup and recovery

Local backups are owner-controlled archives for recovery. They may contain
private keys and must be stored offline/private, never committed.

Backed up:

- MongoDB `posts`
- MongoDB `owner_credentials`
- `keys/author.pub` when present
- `keys/private/author.key` when present
- `releases/latest` when present

Not backed up by default:

- `admin_sessions`
- cloud storage or remote sync state
- Tor onion private key in this phase

Create and audit a local backup:

```sh
pnpm backup:local
pnpm audit:backup backups/<created-folder>
```

Restore requires an explicit confirmation environment variable:

```sh
MI_LOG_RESTORE_CONFIRM=restore-mi-log pnpm restore:local backups/<created-folder>
```

Existing key files are not overwritten unless
`MI_LOG_RESTORE_OVERWRITE_KEYS=true` is also set. Restore output never prints
private key contents.

## Temporary admin verification checklist

Use `http://localhost:5173/admin` for passkey verification when
`WEBAUTHN_RP_ID=localhost`. If you use `http://127.0.0.1:5173`, align
`WEBAUTHN_ORIGIN` and `WEBAUTHN_RP_ID` with that host before registering.

```sh
brew services start mongodb-community || true
pnpm dev
open http://localhost:5173/admin
```

Then verify the local owner flow:

1. Register a passkey.
2. Confirm the admin UI loads.
3. Logout.
4. Login with the passkey.
5. Create a post.
6. Edit the post.
7. Publish the post.
8. Verify the public page reflects the published state.
9. Unpublish the post.
10. Delete the post.
