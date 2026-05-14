# Decisions Log

| ID | Decision | Status | Reason |
|---|---|---|---|
| D001 | Admin is localhost-only | Locked | Reduces public attack surface |
| D002 | No DNS for canonical route | Locked | Avoids scarce name ownership layer |
| D003 | Local MongoDB only in v0 | Locked | Avoids cloud DB dependency |
| D004 | No public write API in v0 | Locked | Keeps public surface readonly |
| D005 | No analytics | Locked | Preserves reader privacy |
| D006 | No remote fonts/CDN | Locked | Avoids third-party requests |
| D007 | No Mongoose | Locked | Keeps DB layer explicit |
| D008 | TypeScript everywhere | Locked | Stronger contracts |
| D009 | Custom CSS | Locked | Avoids UI framework dependency |
| D010 | React + Vite frontend | Locked | Beautiful UI with manageable complexity |
| D011 | Express backend | Locked | Small, understandable API layer |
| D012 | pnpm workspaces | Locked | Clean monorepo structure |
| D013 | Tor onion service as public route | Locked | No DNS or public IP requirement |
| D014 | WebAuthn/passkeys for owner auth | Planned | Enables Touch ID/passkey login |
| D015 | No password login | Planned | Avoids password storage/recovery burden |
| D016 | IPFS archive layer | Planned | Content-addressed release memory |
| D017 | Public comments excluded from v0 | Locked | Avoids moderation/spam/privacy complexity |
| D018 | Public user accounts excluded from v0 | Locked | Avoids Web2 platform complexity |
| D019 | API binds to 127.0.0.1 by default | Locked | Avoids accidental LAN/public exposure |
| D020 | Admin routes must remain blocked even if served by same Express app | Locked | Tor may forward to Express |
| D021 | No Docker requirement in v0 | Locked | Keeps local development simpler |
| D022 | Drafts never returned by public API | Locked | Prevents accidental leak |
| D023 | Markdown editor first | Locked | Keeps writing format portable |
| D024 | Rich text editor excluded from v0 | Locked | Avoids heavy editor dependency |
| D025 | Source maps disabled in production by default | Planned | Reduces implementation leakage |
| D026 | Static readonly release server uses `127.0.0.1:4080` | Locked | Keeps public release serving separate from dynamic admin-capable API |
| D027 | Tor should target the static release server, not the dynamic API | Locked | Prevents onion exposure of admin/auth-capable runtime paths |
| D028 | Backups include the private author key when present and must stay local/offline | Locked | Backup artifacts can contain secret signing material |
| D029 | IPFS remains an optional local CLI archive layer | Locked | Content-addressed archival must not become a startup, cloud, or runtime dependency |

## Decision Status Values

| Status | Meaning |
|---|---|
| Locked | Do not change without explicit architecture update |
| Planned | Not implemented yet, but direction is chosen |
| Open | Still requires decision |
| Rejected | Explicitly not part of project |
