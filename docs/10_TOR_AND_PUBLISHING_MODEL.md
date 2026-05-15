# Tor and Publishing Model

## 1. Purpose

Tor provides DNS-free public reachability.

The blog should be accessible through an onion address without:

- domain registration
- DNS
- public IPv4
- router port forwarding
- cloud hosting

## 2. Onion Service Concept

Target mapping:

```txt
reader using Tor Browser
      ↓
your-onion-address.onion
      ↓
Tor network
      ↓
HiddenServicePort 80 127.0.0.1:4080
      ↓
readonly static release server
```

## 3. Tor Must Expose Only Public Reader Surface

**Invariant:** Tor must target **only** the readonly static release server on **`127.0.0.1:${STATIC_PORT}`** (default port **4080**). The API (`API_PORT`, default **4000**) must **not** be the `HiddenServicePort` target.

Why: Tor’s hidden service connects to your local target from **inside the machine**, so the API often sees **`remoteAddress` on the loopback** even when the HTTP client is remote. Relying on “localhost-only” by socket alone would be misleading. The API additionally requires an **allowed local `Host`** on admin/auth routes so a misconfigured onion mapping (e.g. `Host: …onion`) is rejected while normal local admin traffic (`127.0.0.1:4000`, or the Vite dev `Host` from `WEBAUTHN_ORIGIN`) still works.

For v0, Tor should point at the readonly static release server:

```txt
HiddenServicePort 80 127.0.0.1:4080
```

The dynamic API remains the local writing and admin system. It can use MongoDB,
admin routes, auth/session routes, and publishing workflows on localhost, but it
must not be the Tor exposure target for v0.

Live v0 Tor target:

```txt
HiddenServicePort 80 127.0.0.1:4080
```

The release server is the public artifact server. It serves exported static files
from `releases/latest/public`, including static post data and public proof files,
and does not initialize MongoDB, admin APIs, auth/session APIs, or write routes.

Admin remains localhost-only and outside the Tor exposure path.

## 4. Intended torrc Snippet

For Homebrew Tor on Apple Silicon macOS:

```txt
HiddenServiceDir /opt/homebrew/var/lib/tor/mi-log/
HiddenServicePort 80 127.0.0.1:4080
```

Intel Homebrew path may differ:

```txt
/usr/local/etc/tor/torrc
/usr/local/var/lib/tor/
```

Apple Silicon Homebrew path is usually:

```txt
/opt/homebrew/etc/tor/torrc
/opt/homebrew/var/lib/tor/
```

## 5. Onion Hostname

After Tor starts, hostname should be readable at:

```txt
/opt/homebrew/var/lib/tor/mi-log/hostname
```

This file contains:

```txt
xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx.onion
```

## 6. Onion Private Key

The onion service private key controls the onion identity.

Rules:

- losing it means losing the onion address
- leaking it allows impersonation
- the private key lives under `/opt/homebrew/var/lib/tor/mi-log/`
- do not commit it
- back it up securely
- keep permissions restricted
- local backup tooling does not copy the Tor onion private key yet; back it up
  manually until an explicit Tor-key backup task is added

Warning: do not copy the onion private key into this repository. Back up
`/opt/homebrew/var/lib/tor/mi-log/` securely outside Git.

## 7. Availability Model

When laptop is awake and connected:

```txt
onion blog available
```

When laptop sleeps/offline:

```txt
onion blog unavailable
```

When laptop comes back:

```txt
onion blog becomes available again
```

This is acceptable for v0.

## 8. Cache and Archive Model

Tor is the live presence layer.

IPFS later becomes the archive layer.

```txt
Tor = I am alive here
IPFS = this release can be retrieved by content hash
```

In v0, the separation is:

- Tor serves the current live readonly release from `127.0.0.1:4080`
- IPFS can store an immutable archive CID for `releases/latest/public`
- `sovereign-manifest.json` can record `ipfsCid` after a local IPFS add
- IPFS is optional and not required for app startup, release export, or Tor serving
- no remote pinning service or cloud upload is part of v0

## 9. Operational Privacy Checklist

Before sharing onion address:

- run `pnpm release`
- run `pnpm serve:release`
- verify `/api/v1/admin/posts` returns static 404/fallback, not admin JSON
- verify `/api/v1/auth/session` returns static 404/fallback, not session JSON
- verify posts are readable
- verify manifest/proof files are available
- verify private keys are not in `releases/latest`
- admin routes blocked publicly
- no analytics
- no remote fonts
- no external images
- no source maps in production
- no draft posts exposed
- image metadata stripped
- onion private key backed up
- `.env` not committed
- MongoDB not public

## 10. Static Release Server Commands

Readonly release serving:

```txt
pnpm release
pnpm serve:release
```

Open locally:

```txt
http://127.0.0.1:4080
```

Tor is not required to test the static release server.
