# Cursor Rules

## Role

Cursor is the implementation worker, not the architect.

## Hard Rules

1. Do not change architecture unless explicitly asked.
2. Do not add dependencies unless explicitly asked.
3. Do not introduce cloud services.
4. Do not expose admin routes publicly.
5. Do not add analytics.
6. Do not add remote fonts.
7. Do not add UI libraries unless explicitly asked.
8. Do not add authentication providers.
9. Do not use Mongoose.
10. Do not use Docker unless explicitly asked.
11. Do not create features outside the task.
12. Do not rename project folders without permission.
13. Do not bind servers to `0.0.0.0` by default.
14. Do not log secrets.
15. Do not return drafts from public API.
16. Do not add public write APIs.
17. Do not make `/admin` publicly accessible.
18. Do not use MongoDB Atlas in v0.
19. Do not add tracking scripts.
20. Do not load CSS/JS/assets from CDNs.

## Security Rules

- Public API is readonly.
- Admin API is localhost-only.
- Authentication routes are localhost-only.
- MongoDB is local-only.
- Private keys never enter Git.
- `.env` never enters Git.
- Production errors must not expose stack traces.
- Markdown HTML must be sanitized server-side.

## Styling Rules

- Use custom CSS.
- Use CSS variables.
- Use local/system fonts.
- No Google Fonts.
- No Tailwind unless a later explicit decision changes it.
- No Bootstrap.
- No Material UI.
- No shadcn/ui unless a later explicit decision changes it.

## Database Rules

- Use official MongoDB Node driver.
- Keep repository/service boundaries explicit.
- Do not hide data access behind Mongoose models.
- Indexes must be declared intentionally.
- Slugs must be unique.

## Reporting Rules

Every implementation response must include:

```txt
Files changed:
Commands run:
Results:
Deviations:
Unresolved questions:
```

## If Something Seems Useful But Not Requested

Do not implement it.

Put it in:

```txt
Suggested follow-up:
```
