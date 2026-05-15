import type { Post, PublicPostDetail, PublicPostListItem } from "@mi-log/shared";
import { MongoServerError, ObjectId } from "mongodb";
import { AppError } from "../../errors/AppError.js";
import { computeContentSha256 } from "./contentHash.js";
import { renderMarkdownToHtml } from "./markdown.js";
import { toPublicPostDetail, toPublicPostListItem } from "./postMapper.js";
import {
  createDraftPost,
  countPublishedPosts,
  deletePost as deletePostFromRepository,
  findPostByIdForAdmin,
  findPublishedPostBySlug,
  listAllPostsForAdmin,
  listPublishedPosts,
  publishPost as publishPostInRepository,
  unpublishPost as unpublishPostInRepository,
  updatePostForAdmin,
} from "./postRepository.js";
import { normalizeSlug } from "./slug.js";
import {
  adminPostNotFound,
  assertAdminCanPublishPost,
  invalidAdminPostInput,
  parseCreateDraftInput,
  parseUpdatePostInput,
  type AdminPostInput,
} from "./postValidation.js";

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;
const MAX_LIMIT = 50;

export type PublicPostListQuery = {
  page?: unknown;
  limit?: unknown;
  tag?: unknown;
  q?: unknown;
};

export type PublicPostListResult = {
  data: PublicPostListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
};

export type AdminPostDeleteResult = {
  deleted: true;
};

function invalidQuery(message: string): AppError {
  return new AppError({
    message,
    statusCode: 400,
    code: "INVALID_QUERY",
    expose: true,
  });
}

function readSingleQueryValue(value: unknown, fieldName: string): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw invalidQuery(`${fieldName} must be a single value`);
  }

  return value.trim();
}

function parsePositiveInteger(value: unknown, fieldName: string): number | undefined {
  const normalized = readSingleQueryValue(value, fieldName);

  if (normalized === undefined || normalized.length === 0) {
    return undefined;
  }

  if (!/^\d+$/.test(normalized)) {
    throw invalidQuery(`${fieldName} must be a positive integer`);
  }

  const parsed = Number(normalized);

  if (!Number.isSafeInteger(parsed) || parsed < 1) {
    throw invalidQuery(`${fieldName} must be a positive integer`);
  }

  return parsed;
}

function normalizeListQuery(query: PublicPostListQuery) {
  const page = parsePositiveInteger(query.page, "page") ?? DEFAULT_PAGE;
  const requestedLimit =
    parsePositiveInteger(query.limit, "limit") ?? DEFAULT_LIMIT;
  const limit = Math.min(requestedLimit, MAX_LIMIT);
  const tag = readSingleQueryValue(query.tag, "tag");
  const q = readSingleQueryValue(query.q, "q");

  return {
    page,
    limit,
    tag: tag && tag.length > 0 ? tag : undefined,
    q: q && q.length > 0 ? q : undefined,
  };
}

export async function listPublicPosts(
  query: PublicPostListQuery,
): Promise<PublicPostListResult> {
  const options = normalizeListQuery(query);
  const [posts, total] = await Promise.all([
    listPublishedPosts(options),
    countPublishedPosts({ tag: options.tag, q: options.q }),
  ]);

  return {
    data: posts.map(toPublicPostListItem),
    meta: {
      page: options.page,
      limit: options.limit,
      total,
      hasNextPage: options.page * options.limit < total,
    },
  };
}

export async function getPublicPostBySlug(
  slug: string,
): Promise<PublicPostDetail> {
  const post = await findPublishedPostBySlug(slug.trim());

  if (!post) {
    throw new AppError({
      message: "Post not found",
      statusCode: 404,
      code: "POST_NOT_FOUND",
      expose: true,
    });
  }

  return toPublicPostDetail(post);
}

function assertValidPostId(id: string): void {
  if (!ObjectId.isValid(id)) {
    throw invalidAdminPostInput("id must be a valid post id");
  }
}

function isDuplicateSlugError(error: unknown): boolean {
  return error instanceof MongoServerError && error.code === 11000;
}

function slugAlreadyExists(): AppError {
  return new AppError({
    message: "Slug already exists",
    statusCode: 409,
    code: "SLUG_ALREADY_EXISTS",
    expose: true,
  });
}

function normalizeAdminSlug(value: string): string {
  try {
    return normalizeSlug(value);
  } catch {
    throw invalidAdminPostInput("slug must contain at least one URL-safe character");
  }
}

function buildContentFields(input: {
  title: string;
  excerpt: string;
  bodyMarkdown: string;
}): Pick<Post, "bodyHtml" | "contentSha256"> {
  return {
    bodyHtml: renderMarkdownToHtml(input.bodyMarkdown),
    contentSha256: computeContentSha256(input),
  };
}

function contentChanged(existing: Post, input: AdminPostInput): boolean {
  return (
    (input.title !== undefined && input.title !== existing.title) ||
    (input.excerpt !== undefined && input.excerpt !== existing.excerpt) ||
    (input.bodyMarkdown !== undefined &&
      input.bodyMarkdown !== existing.bodyMarkdown)
  );
}

async function withDuplicateSlugMapping<T>(operation: () => Promise<T>): Promise<T> {
  try {
    return await operation();
  } catch (error) {
    if (isDuplicateSlugError(error)) {
      throw slugAlreadyExists();
    }

    throw error;
  }
}

function mergePostForUpdate(existing: Post, input: AdminPostInput): Post {
  const nextTitle = input.title ?? existing.title;
  const nextExcerpt = input.excerpt ?? existing.excerpt;
  const nextBodyMarkdown = input.bodyMarkdown ?? existing.bodyMarkdown;
  const changedContent = contentChanged(existing, input);
  const contentFields = changedContent
    ? buildContentFields({
        title: nextTitle,
        excerpt: nextExcerpt,
        bodyMarkdown: nextBodyMarkdown,
      })
    : {
        bodyHtml: existing.bodyHtml,
        contentSha256: existing.contentSha256,
      };

  return {
    ...existing,
    title: nextTitle,
    slug:
      input.slug !== undefined ? normalizeAdminSlug(input.slug) : existing.slug,
    excerpt: nextExcerpt,
    bodyMarkdown: nextBodyMarkdown,
    bodyHtml: contentFields.bodyHtml,
    status: input.status ?? existing.status,
    tags: input.tags ?? existing.tags,
    updatedAt: new Date().toISOString(),
    publishedAt:
      input.status === "draft"
        ? null
        : input.status === "published" && existing.publishedAt === null
          ? new Date().toISOString()
          : existing.publishedAt,
    contentSha256: contentFields.contentSha256,
    canonicalVersion: changedContent
      ? existing.canonicalVersion + 1
      : existing.canonicalVersion,
  };
}

function toRepositoryUpdate(post: Post) {
  return {
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    bodyMarkdown: post.bodyMarkdown,
    bodyHtml: post.bodyHtml,
    status: post.status,
    tags: post.tags,
    updatedAt: new Date(post.updatedAt),
    publishedAt: post.publishedAt === null ? null : new Date(post.publishedAt),
    contentSha256: post.contentSha256,
    canonicalVersion: post.canonicalVersion,
  };
}

export async function listAdminPosts(): Promise<Post[]> {
  return listAllPostsForAdmin();
}

export async function getAdminPost(id: string): Promise<Post> {
  assertValidPostId(id);

  const post = await findPostByIdForAdmin(id);

  if (!post) {
    throw adminPostNotFound();
  }

  return post;
}

export async function createDraft(input: unknown): Promise<Post> {
  const parsed = parseCreateDraftInput(input);
  const title = parsed.title ?? "";
  const excerpt = parsed.excerpt ?? "";
  const bodyMarkdown = parsed.bodyMarkdown ?? "";
  const now = new Date();
  const contentFields = buildContentFields({ title, excerpt, bodyMarkdown });

  return withDuplicateSlugMapping(() =>
    createDraftPost({
      title,
      slug: normalizeAdminSlug(parsed.slug ?? title),
      excerpt,
      bodyMarkdown,
      bodyHtml: contentFields.bodyHtml,
      status: "draft",
      tags: parsed.tags ?? [],
      createdAt: now,
      updatedAt: now,
      publishedAt: null,
      contentSha256: contentFields.contentSha256,
      canonicalVersion: 1,
    }),
  );
}

export async function updatePost(id: string, input: unknown): Promise<Post> {
  assertValidPostId(id);
  const parsed = parseUpdatePostInput(input);
  const existing = await getAdminPost(id);
  const next = mergePostForUpdate(existing, parsed);

  if (next.status === "published") {
    assertAdminCanPublishPost(next);
  }

  const updated = await withDuplicateSlugMapping(() =>
    updatePostForAdmin(id, toRepositoryUpdate(next)),
  );

  if (!updated) {
    throw adminPostNotFound();
  }

  return updated;
}

export async function publishPost(id: string): Promise<Post> {
  assertValidPostId(id);
  const existing = await getAdminPost(id);
  const contentFields = buildContentFields({
    title: existing.title,
    excerpt: existing.excerpt,
    bodyMarkdown: existing.bodyMarkdown,
  });
  const next: Post = {
    ...existing,
    ...contentFields,
    status: "published",
    updatedAt: new Date().toISOString(),
    publishedAt: existing.publishedAt ?? new Date().toISOString(),
  };

  assertAdminCanPublishPost(next);

  const updated = await withDuplicateSlugMapping(() =>
    publishPostInRepository(id, toRepositoryUpdate(next)),
  );

  if (!updated) {
    throw adminPostNotFound();
  }

  return updated;
}

export async function unpublishPost(id: string): Promise<Post> {
  assertValidPostId(id);
  await getAdminPost(id);

  const updated = await unpublishPostInRepository(id, {
    updatedAt: new Date(),
  });

  if (!updated) {
    throw adminPostNotFound();
  }

  return updated;
}

export async function deletePost(id: string): Promise<AdminPostDeleteResult> {
  assertValidPostId(id);

  const deleted = await deletePostFromRepository(id);

  if (!deleted) {
    throw adminPostNotFound();
  }

  return { deleted: true };
}
