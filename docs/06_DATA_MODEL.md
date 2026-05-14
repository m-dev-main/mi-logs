# Data Model

## 1. Collections

Initial MongoDB collections:

```txt
posts
owner_credentials
admin_sessions
```

`owner_credentials` and `admin_sessions` are planned for WebAuthn/passkey phase.

## 2. Post Document

Canonical TypeScript shape:

```ts
export type PostStatus = "draft" | "published" | "archived";

export interface Post {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  bodyMarkdown: string;
  bodyHtml: string;
  status: PostStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  contentSha256: string;
  canonicalVersion: number;
}
```

## 3. Post Rules

### Draft

Required:

- `_id`
- `title`
- `slug`
- `status`
- `createdAt`
- `updatedAt`
- `canonicalVersion`

Allowed empty:

- `excerpt`
- `bodyMarkdown`
- `bodyHtml`
- `publishedAt`

Public visibility:

```txt
Never public
```

### Published

Required:

- `title`
- `slug`
- `excerpt`
- `bodyMarkdown`
- `bodyHtml`
- `publishedAt`
- `contentSha256`

Public visibility:

```txt
Visible through public readonly API
```

### Archived

Default public visibility:

```txt
Hidden
```

## 4. Slug Rules

- Slug must be unique.
- Slug generated from title if omitted.
- Slug should be lowercase.
- Slug should use hyphens.
- Slug should not include unsafe URL characters.
- Duplicate slug should return validation error.

## 5. Content Hash

`contentSha256` is computed from normalized post content.

Recommended normalized input:

```txt
title + "\n" + excerpt + "\n" + bodyMarkdown
```

Rules:

- recompute on post update
- recompute before publishing
- expose hash publicly for published post detail
- do not treat hash as secret

## 6. Indexes

Required indexes:

```txt
posts.slug unique
posts.status + posts.publishedAt
posts.tags
posts.contentSha256
```

Planned auth indexes:

```txt
owner_credentials.credentialId unique
admin_sessions.sessionIdHash unique
admin_sessions.expiresAt TTL
```

## 7. Public DTOs

### Post List Item

```ts
export interface PublicPostListItem {
  title: string;
  slug: string;
  excerpt: string;
  tags: string[];
  publishedAt: string;
  contentSha256: string;
  canonicalVersion: number;
}
```

### Post Detail

```ts
export interface PublicPostDetail extends PublicPostListItem {
  bodyHtml: string;
}
```

Public DTOs must not include:

- raw Mongo `_id` unless intentionally mapped to string `id`
- drafts
- admin-only metadata
- local file paths
- internal errors

## 8. Admin DTOs

Admin DTO may include:

```ts
export interface AdminPost extends Post {}
```

But admin DTO is only available through localhost-only admin API.
