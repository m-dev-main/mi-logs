# Security and Privacy Model

## 1. Main Threat Model

### 1.1 Loopback forwarders (Tor misconfiguration, local reverse proxies)

A **loopback TCP connection does not always mean “human at this laptop opened a browser to the API.”** Processes on the same machine—including Tor when an onion service maps to a local port—often connect to `127.0.0.1` from the server’s perspective. If the API were mistakenly targeted by `HiddenServicePort`, **admin/auth routes could see `remoteAddress` as loopback while the HTTP `Host` reflects the public onion name** (or another forwarded hostname).

Therefore:

- **Tor must target only the readonly static release port** (default `127.0.0.1:4080`), never the API port (default `4000`).
- **Admin and auth routes require both** a loopback peer **and** an allowed local `Host` header (API bind host/port and the configured `WEBAUTHN_ORIGIN` host/port for the Vite dev proxy). This blocks the common accidental misconfiguration where Tor reaches the API with a non-local `Host`.
- **Admin write routes** additionally require a valid **admin session** (and CSRF where applicable). Passkey verification still binds cryptographic assertions to configured local WebAuthn origins.

A determined attacker who can send arbitrary HTTP to a loopback listener could still spoof `Host`; mitigating that class of threat requires **not exposing the API on the Tor path** (architecture) and keeping passkey verification strict—not treating “loopback socket” as equivalent to “owner intent.”

## 1.2 Main protections (summary)

The project protects against:

- DNS name dependency
- registrar/domain account dependency
- public IP exposure to readers through Tor
- public admin panel attacks
- public write endpoint abuse
- third-party analytics tracking
- cloud database dependency
- remote font/CDN requests
- accidental draft exposure

The project does not fully protect against:

- malware on owner laptop
- physical compromise of owner device
- writing-style identification
- posting-time inference
- image metadata leaks
- owner voluntarily revealing identity
- Tor-level global traffic correlation by powerful adversaries
- compromise of the onion service private key
- compromise of MongoDB local data

## 2. Public Surface

The public reader should only be able to:

- read published post list
- read published post detail
- read static pages
- read proof page later

The public reader should not be able to:

- create content
- modify content
- login
- see drafts
- access admin
- access database
- view logs

## 3. Admin Protection Layers

Admin protection stack:

```txt
loopback TCP peer (socket; not sufficient alone under local forwarders)
      ↓
allowed local Host header (admin/auth routes)
      ↓
WebAuthn/passkey owner session (mutations require session + CSRF in v0)
      ↓
HttpOnly SameSite session cookie
      ↓
CSRF protection for mutations
```

Localhost-only (loopback **and** local `Host`) is not a replacement for authentication, but it is an important boundary—especially because Tor or another local proxy can make remote-originated traffic appear as a loopback connection.

## 4. Tor Privacy

Tor onion service helps hide:

- server IP from readers
- physical server network location
- need for DNS
- need for public IP
- need for router port forwarding

Tor does not hide:

- writing style
- content clues
- posting schedule
- image metadata
- local device compromise
- private key leaks

## 5. Reader Privacy

Reader privacy goals:

- no analytics
- no third-party scripts
- no remote fonts
- no CDN assets
- no tracking pixels
- no cookies for public reading
- no public reader login in v0

## 6. Owner Privacy

Owner privacy rules:

- avoid personal metadata in posts unless intentional
- strip EXIF metadata from images before publishing
- avoid posting according to a predictable location/time pattern if anonymity matters
- do not commit `.env`
- do not commit private keys
- backup onion private key securely
- backup author signing key securely
- keep laptop secure

## 7. Logging

Allowed logs:

- process startup/shutdown
- route/method/status
- request duration
- non-sensitive error codes

Avoid logging:

- full IP addresses where unnecessary
- user-agent by default
- request bodies
- cookies
- auth tokens
- MongoDB URI
- private keys
- post drafts unless debugging locally and intentionally

## 8. Markdown Security

Markdown rendering must:

- sanitize generated HTML
- reject script tags
- reject dangerous attributes like `onerror`
- reject `javascript:` URLs
- avoid raw HTML unless explicitly sanitized

## 9. Secrets

Never commit:

```txt
.env
private keys
onion service private key
author private key
session secrets
MongoDB credentials if any
```

`.gitignore` must cover:

```txt
.env
.env.*
!.env.example
keys/private/
logs/
```

## 10. Local Backup Risk

Local backups are owner-controlled recovery artifacts and may include private
author signing keys. They must be treated as secret material:

- store backups offline/private
- never commit `backups/`
- do not sync backups to cloud services by default
- do not share backups with public release artifacts
- remember that restoring keys can replace author identity if explicitly allowed

`admin_sessions` should not be backed up by default. Sessions are runtime state,
not owner recovery state.

## 11. Production Error Policy

Production responses must not expose:

- stack traces
- file paths
- environment variables
- database details
- dependency internals

Use stable error codes instead.
