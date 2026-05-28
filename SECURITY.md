# Security

mi-log is a local-first publishing node. Its public surface is the readonly
static release output, while authoring, admin, auth, database, and private keys
remain local.

## Sensitive Material

Never publish or attach:

- `.env` files or real owner registration tokens
- author signing private keys
- Tor hidden-service private keys
- live onion hostnames before the operator intentionally shares them
- MongoDB dumps, local backups, logs, or personal drafts

## Public-Repository Check

Run this before pushing to a public remote:

```sh
pnpm audit:source
```

The source audit scans for common project-policy violations plus public-safety
leaks such as home-directory paths, private key markers, personal prompt traces,
and likely real Tor v3 hostnames.

## Reporting

For a security issue in a public fork, open a private advisory or contact the
maintainer through the private channel listed by that fork. Do not place secrets,
private keys, or live onion hostnames in public issues.
