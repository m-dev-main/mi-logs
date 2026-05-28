# Desktop Packaging Notes

## Target

Phase 7 packages the Electron admin shell for arm64 macOS.

```txt
pnpm package-mac
```

The command builds the web renderer, compiles the Electron main/preload code,
and writes unsigned local artifacts under:

```txt
release/desktop/
```

## Runtime Dependencies

The packaged app keeps Tor external in this phase.

| Dependency | Packaging decision | Runtime validation |
|---|---|---|
| Tor | External binary, not bundled | `MI_LOG_TOR_BINARY_PATH`, `TOR_BINARY_PATH`, `/opt/homebrew/bin/tor`, `/usr/local/bin/tor`, `/usr/bin/tor` |
| MongoDB | External local service | Desktop setup check pings `MONGO_URI` and `MONGO_DB_NAME` |
| mi-log workspace | External checkout for API/release scripts | Desktop setup check validates `MI_LOG_WORKSPACE_ROOT` or the discovered workspace |
| Author key | External local secret | Desktop setup check validates private and public key file presence |
| Owner passkey | MongoDB record | Desktop setup check validates owner credential registration state |

Keeping Tor external avoids embedding a network daemon and its lifecycle/security
updates inside the app bundle. The app owns the generated `torrc`, hidden-service
directory, logs, and process lifetime under macOS Application Support.

## Secret Boundary

The packaged app includes:

- compiled Electron desktop code
- built web renderer files as `web-dist`
- app metadata and icon assets

The packaged app must not include:

- `.env` files
- drafts
- release artifacts
- private author keys
- local backups
- Tor hidden-service private keys

Electron Builder is configured from `apps/desktop/package.json` with a narrow
`files` list plus `extraResources` for `apps/web/dist`.
