# API Contract

## 1. API Version Prefix

All API routes use:

```txt
/api/v1
```

## 2. Response Shape

Success:

```json
{
  "data": {}
}
```

Success with pagination:

```json
{
  "data": [],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 0,
    "hasNextPage": false
  }
}
```

Error:

```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "Human readable message"
  }
}
```

## 3. Public Routes

### GET `/health`

Purpose:

```txt
Process health check.
```

Response:

```json
{
  "ok": true
}
```

### GET `/api/v1/status`

Response:

```json
{
  "app": "mi-log-api",
  "status": "ok"
}
```

### GET `/api/v1/posts`

Returns published posts only.

Query params:

| Param | Type | Default |
|---|---|---|
| page | number | 1 |
| limit | number | 10 |
| tag | string | optional |

Response:

```json
{
  "data": [
    {
      "title": "Example",
      "slug": "example",
      "excerpt": "Example excerpt",
      "tags": ["example"],
      "publishedAt": "2026-05-14T00:00:00.000Z",
      "contentSha256": "...",
      "canonicalVersion": 1
    }
  ],
  "meta": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "hasNextPage": false
  }
}
```

### GET `/api/v1/posts/:slug`

Returns one published post.

Response:

```json
{
  "data": {
    "title": "Example",
    "slug": "example",
    "excerpt": "Example excerpt",
    "bodyHtml": "<p>Example</p>",
    "tags": ["example"],
    "publishedAt": "2026-05-14T00:00:00.000Z",
    "contentSha256": "...",
    "canonicalVersion": 1
  }
}
```

If draft/missing:

```json
{
  "error": {
    "code": "POST_NOT_FOUND",
    "message": "Post not found"
  }
}
```

## 4. Admin Routes

All admin routes require localhost-only access.

Later they also require WebAuthn admin session.

### GET `/api/v1/admin/posts`

Returns all posts including drafts.

### GET `/api/v1/admin/posts/:id`

Returns one post by id.

### POST `/api/v1/admin/posts`

Creates draft.

Body:

```json
{
  "title": "New Post",
  "slug": "new-post",
  "excerpt": "",
  "bodyMarkdown": "",
  "tags": []
}
```

### PATCH `/api/v1/admin/posts/:id`

Updates draft/published post.

### POST `/api/v1/admin/posts/:id/publish`

Publishes post.

Validation:

- title required
- slug required
- excerpt required
- bodyMarkdown required
- bodyHtml generated server-side
- publishedAt set if absent

### POST `/api/v1/admin/posts/:id/unpublish`

Moves post back to draft.

### DELETE `/api/v1/admin/posts/:id`

Deletes post.

v0 behavior:

```txt
Hard delete allowed locally.
```

Later behavior may switch to archive.

## 5. Auth Routes Planned

Localhost-only:

```txt
POST /api/v1/auth/webauthn/register/options
POST /api/v1/auth/webauthn/register/verify
POST /api/v1/auth/webauthn/login/options
POST /api/v1/auth/webauthn/login/verify
POST /api/v1/auth/logout
GET  /api/v1/auth/session
```

Rules:

- no password fallback
- no OAuth
- no email login
- session cookie is HttpOnly
- session cookie is SameSite=Strict
- auth routes remain localhost-only

## 6. Security Headers

Planned baseline:

```txt
X-Content-Type-Options: nosniff
Referrer-Policy: no-referrer
X-Frame-Options: DENY
Permissions-Policy: geolocation=(), camera=(), microphone=()
Content-Security-Policy: strict local policy later
```

## 7. CORS

Development allowed origin:

```txt
http://127.0.0.1:5173
```

Avoid broad CORS:

```txt
Access-Control-Allow-Origin: *
```

Admin routes must not be exposed through broad CORS.
