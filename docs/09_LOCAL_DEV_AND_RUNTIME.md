# Local Development and Runtime

## 1. Supported environments

Typical setups include macOS, Linux, or Windows with WSL. Use a local MongoDB instance and the ports documented below; adjust paths (for example Tor `torrc` and `HiddenServiceDir`) to match your OS and package manager.

## 2. Required Local Tools

Expected v0 tools:

```txt
node
pnpm
mongodb-community
git
```

Later:

```txt
tor
ipfs
```

## 3. Package Manager

Use:

```txt
pnpm
```

Do not switch package managers without explicit decision.

## 4. Environment Variables

`.env.example` should include:

```txt
NODE_ENV=development

API_HOST=127.0.0.1
API_PORT=4000

STATIC_RELEASE_DIR=releases/latest/public
STATIC_HOST=127.0.0.1
STATIC_PORT=4080

WEB_HOST=127.0.0.1
WEB_PORT=5173
WEB_ORIGIN=http://127.0.0.1:5173

MONGO_URI=mongodb://127.0.0.1:27017
MONGO_DB_NAME=mi_log

EXPOSE_ADMIN=false

OWNER_REGISTRATION_TOKEN=<generate locally; omit from Git>
```

**First-owner passkey:** `OWNER_REGISTRATION_TOKEN` must be set before the owner registers the first credential. Paste the same value into the admin UI registration field once; restart the API after changing `.env`. After registration, rotate or unset the token as you prefer.

**Admin/auth HTTP boundary:** Calls to `/api/v1/admin/*` and `/api/v1/auth/*` must use a `Host` header of `127.0.0.1`, `localhost`, or `[::1]` with an optional TCP port — not an onion hostname — so accidental Tor forwarding to the API port does not classify remote readers as localhost.

## 5. Local MongoDB

Default MongoDB:

```txt
mongodb://127.0.0.1:27017
```

Rules:

- no MongoDB Atlas in v0
- no public MongoDB binding
- no credentials required for initial local dev unless explicitly configured later

## 6. Development Commands

Target root scripts:

```txt
pnpm dev
pnpm dev:api
pnpm dev:web
pnpm build
pnpm typecheck
pnpm lint
```

## 7. Runtime Ports

| Service | Host | Port |
|---|---|---:|
| API | 127.0.0.1 | 4000 |
| Readonly release server | 127.0.0.1 | 4080 |
| Vite web | 127.0.0.1 | 5173 |
| MongoDB | 127.0.0.1 | 27017 |
| Tor onion | Tor-managed | 80 external onion |

## 8. Binding Rule

Default host must be:

```txt
127.0.0.1
```

Do not default to:

```txt
0.0.0.0
```

## 9. Dev Startup Target

After foundation tasks:

```txt
pnpm dev
```

should run:

- API on `127.0.0.1:4000`
- web on `127.0.0.1:5173`

## 10. Production Local Mode

Later target:

```txt
pnpm build
pnpm start
```

should:

- build React app
- build API
- serve public frontend through Express
- keep admin blocked from public/non-local access

## 11. Readonly Release Serving

Static release serving is separate from normal development mode:

```txt
pnpm release
pnpm serve:release
```

Default static serving:

```txt
STATIC_RELEASE_DIR=releases/latest/public
STATIC_HOST=127.0.0.1
STATIC_PORT=4080
```

Rules:

- the static release server must bind to `127.0.0.1` by default
- `STATIC_HOST=0.0.0.0` is rejected
- it does not connect to MongoDB
- it does not initialize admin, auth, session, proof, or post API routers
- it serves only the readonly exported release artifact
- `/api/*` and `/admin/*` must not return dynamic admin/auth JSON
