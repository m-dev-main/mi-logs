# Desktop Application Checklist

## Goal

Turn mi-log into a macOS desktop application where the owner-facing admin panel,
release controls, readonly static serving, and Tor lifecycle are controlled from
one local app.

The target runtime model is:

```txt
Desktop app open
  -> admin UI available after biometric login
  -> local API available only to the app/control plane
  -> readonly static release server running on 127.0.0.1:4080
  -> Tor onion service running and forwarding only to 127.0.0.1:4080

Desktop app closed
  -> app-managed API/static/Tor processes stopped
  -> onion blog unavailable
```

## Non-Negotiable Security Invariant

Tor must target only the readonly static release server, never the dynamic API.

```txt
HiddenServicePort 80 127.0.0.1:4080
```

The admin/API process must stay outside the Tor exposure path. Tor, reverse
proxies, and other local forwarders can make remote traffic appear as loopback
traffic, so loopback alone is not an admin boundary.

## Architecture

| Area | Target |
|---|---|
| Desktop shell | Electron, matching the existing TypeScript, React, and Node stack |
| Public serving | Static release server on `127.0.0.1:4080` |
| Tor exposure | Tor forwards only to `127.0.0.1:4080` |
| Admin access | Desktop app control plane, not normal public browser routing |
| Auth | Biometric/passkey login for every admin session |
| Process lifetime | API, static server, and Tor live while the desktop app is open |
| Public safety | Onion readers can read only exported static release files |

## Phase 1 - Desktop Foundation

- [x] Add `apps/desktop` workspace package.
- [x] Add Electron main process in TypeScript.
- [x] Add preload script with a narrow `contextBridge` API.
- [x] Add default BrowserWindow security settings.
- [x] Load Vite dev URL in development when configured.
- [x] Load built web app from `apps/web/dist` otherwise.
- [x] Add root scripts for desktop build/dev/start.
- [x] Add typecheck/build verification for desktop package.
- [x] Keep existing API and web behavior unchanged.

## Phase 2 - Desktop Control Plane

- [x] Add Electron main-process service manager.
- [x] Start API process from desktop app.
- [x] Start readonly static release server from desktop app.
- [x] Stop app-managed processes on quit.
- [x] Add health probes for API and static release server.
- [x] Add renderer-visible runtime status.
- [x] Add app data directory under macOS Application Support.
- [x] Add logs under app data, not the repository.
- [x] Add stale process cleanup on next launch.

## Phase 3 - Tor Manager

- [x] Detect Tor binary, preferring `/opt/homebrew/bin/tor` on Apple Silicon.
- [x] Support a configured Tor binary path.
- [x] Generate app-owned `torrc`.
- [x] Store hidden service data outside the repository.
- [x] Enforce `HiddenServicePort 80 127.0.0.1:4080`.
- [x] Refuse any Tor target matching the API/admin port.
- [x] Start Tor when serving starts.
- [x] Stop Tor when the desktop app quits.
- [x] Read onion hostname from hidden service directory.
- [x] Show onion hostname in the desktop app.
- [x] Add copy-onion-address control.
- [x] Add Tor log viewer with secret redaction.

## Phase 4 - App-Only Admin Boundary

- [x] Introduce desktop API mode in config.
- [x] Move admin-capable API access behind an Electron main-process proxy.
- [x] Prefer Unix domain socket for macOS admin control traffic.
- [x] Add per-launch admin IPC secret in Electron main memory.
- [x] Keep admin credential/session material out of localStorage.
- [x] Add API middleware for desktop-control requests.
- [x] Keep existing localhost, Host allowlist, passkey session, and CSRF layers.
- [x] Remove normal browser admin route from public production surface.
- [x] Add tests that browser HTTP cannot access admin routes.
- [x] Add tests that onion Host headers cannot access admin/auth JSON.

## Phase 5 - Biometric Login

| Option | Role |
|---|---|
| Existing WebAuthn/passkey | Owner identity and API session proof |
| Native macOS biometric gate | Desktop unlock and privileged action gate |
| Hybrid target | Native unlock before app access, passkey session for admin API |

- [x] Keep current WebAuthn/passkey owner registration.
- [x] Add desktop biometric gate before rendering admin.
- [x] Require biometric re-auth on app launch.
- [x] Require biometric re-auth after idle lock timeout.
- [x] Require biometric re-auth before destructive actions.
- [x] Store unlock state only in memory.
- [x] Add explicit lock button.
- [x] Add session status in desktop chrome.
- [x] Add tests for locked renderer refusing admin IPC calls.

## Phase 6 - Release and Serving Buttons

- [x] Build web.
- [x] Export static release.
- [x] Serve latest release.
- [x] Restart release server.
- [x] Run source audit.
- [x] Run release audit.
- [x] Run runtime audit.
- [x] Generate author key.
- [x] Show author public key.
- [x] Show release manifest hash.
- [x] Copy onion URL.
- [x] Optional: add release to local IPFS.
- [x] Optional: show CID and proof metadata.

## Phase 7 - Packaging

- [x] Add app icon.
- [x] Add Electron packaging config.
- [x] Package arm64 macOS build for MacBook Pro M3 Pro.
- [x] Decide whether Tor is external or bundled as a sidecar.
- [x] Add first-run setup screen.
- [x] Validate MongoDB availability.
- [x] Validate Tor availability.
- [x] Validate author key presence.
- [x] Validate owner passkey registration state.
- [x] Ensure packaged app never includes private repo secrets.

## Acceptance Tests

- [x] Desktop app launches.
- [x] Biometric login gates admin.
- [x] Admin works inside desktop app.
- [x] Admin does not work from a normal browser.
- [x] Release export works from a desktop button.
- [x] Static server serves `releases/latest/public`.
- [x] Tor starts with the desktop app.
- [x] Onion points only to static release server.
- [x] Quitting the app stops app-managed serving processes.
- [x] Onion cannot access `/admin`.
- [x] Onion cannot access `/api/v1/auth/session`.
- [x] Drafts never appear in release artifacts.
- [x] Audit buttons produce readable results.

Evidence is recorded in [17_DESKTOP_ACCEPTANCE_REPORT.md](./17_DESKTOP_ACCEPTANCE_REPORT.md).
