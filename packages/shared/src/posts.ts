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

export interface PublicPostListItem {
  title: string;
  slug: string;
  excerpt: string;
  tags: string[];
  publishedAt: string;
  contentSha256: string;
  canonicalVersion: number;
}

export interface PublicPostDetail extends PublicPostListItem {
  bodyHtml: string;
}
