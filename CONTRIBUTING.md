# Contributing

mi-log is MIT-licensed and intended to stay free to use, inspect, fork, and
modify.

## Public Safety Boundary

Before opening a pull request or publishing a fork, run:

```sh
pnpm typecheck
pnpm test
pnpm audit:source
```

If release artifacts are present or you changed release code, also run:

```sh
pnpm release
pnpm audit:release
```

Do not commit:

- `.env` or any real environment override
- author private keys
- Tor hidden-service keys or live onion hostnames
- local backups, logs, releases, packaged apps, or generated `dist` output
- personal drafts or machine-specific paths

## Development Notes

- Keep admin/auth behavior localhost-only unless the project contract changes.
- Keep Tor pointed at the readonly static release server, not the API.
- Keep public release output free of drafts, archived posts, private markdown,
  admin state, and source maps.
- Prefer small changes with verification commands included in the pull request.
