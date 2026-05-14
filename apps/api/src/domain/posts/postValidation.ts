import type { Post, PostStatus } from "@mi-log/shared";
import { AppError } from "../../errors/AppError.js";

export type AdminPostInput = {
  title?: string;
  slug?: string;
  excerpt?: string;
  bodyMarkdown?: string;
  tags?: string[];
  status?: PostStatus;
};

function assertPresent(value: string | null, fieldName: string): asserts value is string {
  if (value === null || value.trim().length === 0) {
    throw new AppError({
      message: `Post ${fieldName} is required for publishing`,
      statusCode: 400,
      code: "POST_PUBLISH_VALIDATION_FAILED",
      expose: true,
    });
  }
}

export function assertCanPublishPost(post: Post): void {
  assertPresent(post.title, "title");
  assertPresent(post.slug, "slug");
  assertPresent(post.excerpt, "excerpt");
  assertPresent(post.bodyMarkdown, "bodyMarkdown");
  assertPresent(post.bodyHtml, "bodyHtml");
  assertPresent(post.publishedAt, "publishedAt");
  assertPresent(post.contentSha256, "contentSha256");
}

export function assertPublishedPost(post: Post): void {
  if (post.status !== "published") {
    throw new AppError({
      message: "Post not found",
      statusCode: 404,
      code: "POST_NOT_FOUND",
      expose: true,
    });
  }

  assertCanPublishPost(post);
}

export function invalidAdminPostInput(message: string): AppError {
  return new AppError({
    message,
    statusCode: 400,
    code: "INVALID_ADMIN_POST_INPUT",
    expose: true,
  });
}

export function adminPostNotFound(): AppError {
  return new AppError({
    message: "Admin post not found",
    statusCode: 404,
    code: "ADMIN_POST_NOT_FOUND",
    expose: true,
  });
}

function readOptionalString(
  value: unknown,
  fieldName: string,
): string | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw invalidAdminPostInput(`${fieldName} must be a string`);
  }

  return value.trim();
}

function readOptionalTags(value: unknown): string[] | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (!Array.isArray(value)) {
    throw invalidAdminPostInput("tags must be an array");
  }

  return value.map((tag) => {
    if (typeof tag !== "string") {
      throw invalidAdminPostInput("tags must contain only strings");
    }

    return tag.trim();
  }).filter((tag) => tag.length > 0);
}

function readOptionalStatus(value: unknown): PostStatus | undefined {
  if (value === undefined) {
    return undefined;
  }

  if (value !== "draft" && value !== "published" && value !== "archived") {
    throw invalidAdminPostInput("status must be draft, published, or archived");
  }

  return value;
}

function assertObjectBody(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw invalidAdminPostInput("request body must be an object");
  }

  return value as Record<string, unknown>;
}

export function parseCreateDraftInput(value: unknown): AdminPostInput {
  const body = assertObjectBody(value);
  const title = readOptionalString(body.title, "title");

  if (!title) {
    throw invalidAdminPostInput("title is required");
  }

  return {
    title,
    slug: readOptionalString(body.slug, "slug"),
    excerpt: readOptionalString(body.excerpt, "excerpt") ?? "",
    bodyMarkdown: readOptionalString(body.bodyMarkdown, "bodyMarkdown") ?? "",
    tags: readOptionalTags(body.tags) ?? [],
  };
}

export function parseUpdatePostInput(value: unknown): AdminPostInput {
  const body = assertObjectBody(value);
  const input: AdminPostInput = {
    title: readOptionalString(body.title, "title"),
    slug: readOptionalString(body.slug, "slug"),
    excerpt: readOptionalString(body.excerpt, "excerpt"),
    bodyMarkdown: readOptionalString(body.bodyMarkdown, "bodyMarkdown"),
    tags: readOptionalTags(body.tags),
    status: readOptionalStatus(body.status),
  };

  if (Object.values(input).every((field) => field === undefined)) {
    throw invalidAdminPostInput("at least one post field is required");
  }

  return input;
}

export function assertAdminCanPublishPost(post: Post): void {
  if (post.title.trim().length === 0) {
    throw invalidAdminPostInput("title is required for publishing");
  }

  if (post.slug.trim().length === 0) {
    throw invalidAdminPostInput("slug is required for publishing");
  }

  if (post.excerpt.trim().length === 0) {
    throw invalidAdminPostInput("excerpt is required for publishing");
  }

  if (post.bodyMarkdown.trim().length === 0) {
    throw invalidAdminPostInput("bodyMarkdown is required for publishing");
  }

  if (post.bodyHtml.trim().length === 0) {
    throw invalidAdminPostInput("bodyHtml is required for publishing");
  }

  if (post.contentSha256.trim().length === 0) {
    throw invalidAdminPostInput("contentSha256 is required for publishing");
  }
}
