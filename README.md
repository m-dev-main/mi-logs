# mi-log

## What mi-log is

**mi-log** is a local-first, self-owned publishing node: you run it on your machine, keep drafts and data under your control, and can expose a read-only public surface later (for example via Tor) without treating DNS as the canonical access path.

- **Local-first:** MongoDB, API, and admin-facing work stay on localhost by default.
- **No DNS philosophy:** Reachability does not depend on owning a domain name for the core model.
- **Localhost-only admin:** Administrative routes and auth stay off the public surface you export for Tor.

**Documentation is the source of truth.** Start with `docs/00_PROJECT_CONTRACT.md` and `docs/01_ARCHITECTURE_LOCK.md`.

**Current status:** Automated audits cover source policy, optional release artifacts, and runtime boundaries when servers are running. Tor Browser GUI checks, IPFS archival, and passkey flows remain manual where noted in `docs/12_ACCEPTANCE_CHECKLIST.md`.

## What mi-log is not

- Not a hosted SaaS blog platform or multi-tenant CMS.
- Not a public write API, comments system, or reader accounts product in v0.
- Not dependent on MongoDB Atlas, third-party analytics, remote fonts, or CDN assets for core operation.
- Not a substitute for operational security: you still choose what you publish, how you back up keys, and how you expose Tor.

## Local-first model

| Layer | Role |
| --- | --- |
| Local MongoDB | Authoritative post storage and owner credentials |
| Express API (`127.0.0.1:4000`) | Public readonly post APIs plus localhost-only admin and auth |
| Vite web (`127.0.0.1:5173`) | Reader UI, search, and local admin |
| Static release server (`127.0.0.1:4080`) | Readonly export of the public site; intended Tor target |
| Optional Tor | Maps a v3 onion to the static release port only |

See `docs/08_SECURITY_PRIVACY_MODEL.md` and `docs/10_TOR_AND_PUBLISHING_MODEL.md` for why Tor must not point at the API port.

## Quick start

```sh
corepack enable
pnpm install
cp .env.example .env
brew services start mongodb-community || true
pnpm seed:api:posts
pnpm dev
```

Then open `http://127.0.0.1:5173` for the reader and `http://127.0.0.1:5173/admin` for local admin (see WebAuthn notes below).

## Required local tools

- Node.js (LTS recommended)
- pnpm (repo pins a version in `package.json`)
- Local MongoDB (`mongodb-community` via Homebrew is a common macOS choice)

Optional later: Tor, IPFS CLI — see `docs/10_TOR_AND_PUBLISHING_MODEL.md` and the IPFS section below.

## Environment setup from `.env.example`

Copy `.env.example` to `.env` and adjust only what you need. Defaults bind services to loopback and point the static release server at `releases/latest/public`.

Important variables (full list in `.env.example`):

- `MONGO_URI`, `MONGO_DB_NAME` — local database
- `API_HOST` / `API_PORT`, `WEB_HOST` / `WEB_PORT`, `WEB_ORIGIN` — dev servers
- `STATIC_RELEASE_DIR`, `STATIC_HOST`, `STATIC_PORT` — readonly release serving
- `WEBAUTHN_RP_ID`, `WEBAUTHN_ORIGIN` — must match how you open the admin UI (localhost vs 127.0.0.1)
- `AUTHOR_KEY_DIR`, `AUTHOR_PUBLIC_KEY_PATH` — signing material for manifests (private dir must stay out of Git)

See `docs/09_LOCAL_DEV_AND_RUNTIME.md` for workflow details.

## Local admin safety model

- Admin and auth routes are restricted to localhost peers and allowed local `Host` values (Tor and other local forwarders can appear as loopback; socket source alone is not enough). See `docs/08_SECURITY_PRIVACY_MODEL.md`.
- Mutations require an admin session and CSRF where applicable; passkeys bind to configured WebAuthn origins.
- For passkey checks, align `WEBAUTHN_RP_ID` and `WEBAUTHN_ORIGIN` with the URL you use (`http://localhost:5173` vs `http://127.0.0.1:5173`).

## Release export

The readonly release artifact is generated locally from the public frontend build and published MongoDB posts only:

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

Included: static reader app, `public/mi-log-data/posts.json` for public search data, manifest with published hashes, optional signature and author public key, release hash file.

Excluded: drafts, archived posts, `bodyMarkdown`, admin/auth/session data, MongoDB dumps, private keys, and cloud or analytics plumbing.

Inspect proof files locally (paths only; never paste private keys into issues):

```sh
cat releases/latest/sovereign-manifest.json
cat releases/latest/sovereign-manifest.sig
cat releases/latest/author.pub
cat releases/latest/release-sha256.txt
```

`releases/latest` is a readonly public artifact directory, not an admin surface.

## Readonly release serving

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

The static server returns static 404-style responses for `/api/*` and `/admin/*` instead of dynamic admin JSON.

## Tor readonly serving

Point Tor only at the static release server (example snippet):

```txt
HiddenServiceDir /opt/homebrew/var/lib/tor/mi-log/
HiddenServicePort 80 127.0.0.1:4080
```

On Apple Silicon Homebrew, Tor configuration often lives under `/opt/homebrew/etc/tor/torrc` and service data under `/opt/homebrew/var/lib/tor/`. Intel Homebrew commonly uses `/usr/local/etc/tor/torrc` and `/usr/local/var/lib/tor/`. After Tor starts, the onion hostname appears under your `HiddenServiceDir` (for example `hostname` next to the service key material).

Example placeholder hostnames for documentation only (not real services):

```txt
your-onion-address.onion
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.onion
```

Verify through Tor that `/` and `/proof` serve the static app while `/api/v1/admin/*` and `/api/v1/auth/*` do not return admin or session JSON.

## Optional IPFS archive

```sh
ipfs version
pnpm release
pnpm ipfs:add-release
```

On success, `releases/latest/ipfs-cid.txt` is written and the manifest may record `ipfsCid`. IPFS is optional local archival only.

## Audits

```sh
pnpm typecheck
pnpm audit:source
pnpm release
pnpm audit:release
pnpm audit:all
```

`pnpm audit:all` runs `typecheck`, `audit:source`, and `audit:release`. If `releases/latest` is absent, the release audit is skipped with a clear message (run `pnpm release` first for a full release check).

Runtime checks (requires servers running):

```sh
pnpm dev
pnpm serve:release
pnpm audit:runtime
```

## Local dev port conflicts

```sh
lsof -nP -iTCP:4000 -sTCP:LISTEN
lsof -nP -iTCP:5173 -sTCP:LISTEN
kill <PID>
pnpm dev:ports
```

## Local API seed verification

```sh
brew services start mongodb-community || true
pnpm seed:api:posts
pnpm dev:api
```

```sh
curl "http://127.0.0.1:4000/api/v1/status"
curl "http://127.0.0.1:4000/api/v1/posts"
curl "http://127.0.0.1:4000/api/v1/posts/hello-from-mi-log"
curl "http://127.0.0.1:4000/api/v1/posts/draft-seed-post"
curl "http://127.0.0.1:4000/api/v1/posts/archived-seed-post"
curl "http://127.0.0.1:4000/api/v1/posts?page=abc"
```

The public list and detail should expose only the published `hello-from-mi-log` seed post. Draft and archived seed slugs must return `POST_NOT_FOUND`.

```sh
curl "http://127.0.0.1:4000/api/v1/posts?q=readonly"
curl "http://127.0.0.1:4000/api/v1/posts?tag=verification"
open http://127.0.0.1:5173/search
```

Public responses must not include `bodyMarkdown`.

## Writing flow

1. Open `/admin` locally.
2. Paste markdown into the paste panel.
3. Save with the button or `Cmd/Ctrl+S`.
4. Review the server-rendered preview.
5. Publish once the checklist passes, or use `Cmd/Ctrl+Enter`.
6. Run `pnpm release`.
7. Run `pnpm serve:release` to verify the static export.

## Local backup and recovery

Backups may contain private keys and must stay offline and out of Git.

```sh
pnpm backup:local
pnpm audit:backup backups/<created-folder>
```

Restore (see script output for required env vars):

```sh
MI_LOG_RESTORE_CONFIRM=restore-mi-log pnpm restore:local backups/<created-folder>
```

Existing key files are not overwritten unless `MI_LOG_RESTORE_OVERWRITE_KEYS=true` is set. Restore output never prints private key contents.

## What must never be committed

- `.env` and any `.env.*` except tracked `.env.example`
- `keys/private/` and author signing private material
- Tor onion private keys under your Tor data directory (for example `/opt/homebrew/var/lib/tor/mi-log/` on Apple Silicon Homebrew)
- `releases/` export trees, `backups/`, `node_modules/`, build `dist/` output, `logs/`, and `*.pem` / `keys/*.key` / `keys/*.secret`

Treat `backups/` as confidential. Do not point Tor at `127.0.0.1:4000`; use the static release port.

## Public repository safety note

Before pushing to a public remote, run `pnpm audit:source` and search the working tree for machine-specific paths, real onion hostnames, PEM blocks, and personal identifiers. This repository is intended to be generic; any live onion address, home directory path, or operator-specific backup name belongs only on your machine or in private notes — not in tracked files.

## Safety warnings (summary)

- Point Tor at `127.0.0.1:4080` (readonly static release), not the API on `127.0.0.1:4000`.
- Keep private keys, `.env`, `releases/`, `backups/`, `node_modules/`, and `dist/` out of version control (see `.gitignore`).
- IPFS is optional local archival; it is not required for normal app startup or release export.

## Temporary admin verification checklist

```sh
brew services start mongodb-community || true
pnpm dev
open http://localhost:5173/admin
```

Then verify register, login, CRUD, publish, unpublish, and delete flows against your local data.
