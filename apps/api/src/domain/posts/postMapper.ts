import type { Post, PublicPostDetail, PublicPostListItem } from "@mi-log/shared";

export function toPublicPostListItem(post: Post): PublicPostListItem {
  if (post.publishedAt === null) {
    throw new Error("Published post list item requires publishedAt");
  }

  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    tags: post.tags,
    publishedAt: post.publishedAt,
    contentSha256: post.contentSha256,
    canonicalVersion: post.canonicalVersion,
  };
}

export function toPublicPostDetail(post: Post): PublicPostDetail {
  return {
    ...toPublicPostListItem(post),
    bodyHtml: post.bodyHtml,
  };
}
