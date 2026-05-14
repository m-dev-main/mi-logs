import type { PostStatus } from "@mi-log/shared";
import { ObjectId } from "mongodb";
import { config } from "../config/env.js";
import { getPostsCollection, type PostDocument } from "../db/collections.js";
import { ensureMongoIndexes } from "../db/indexes.js";
import { closeMongo, connectMongo } from "../db/mongo.js";
import { computeContentSha256 } from "../domain/posts/contentHash.js";
import { renderMarkdownToHtml } from "../domain/posts/markdown.js";
import { normalizeSlug } from "../domain/posts/slug.js";

const DEV_SEED_TAG = "__dev_seed__";

type SeedPostInput = {
  title: string;
  slug: string;
  excerpt: string;
  bodyMarkdown: string;
  status: PostStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
};

function assertLocalDevelopmentSeedTarget(): void {
  if (config.isProduction) {
    throw new Error("Refusing to seed posts in production.");
  }

  let parsedUri: URL;
  try {
    parsedUri = new URL(config.MONGO_URI);
  } catch {
    throw new Error("Seed posts requires a valid local MongoDB URI.");
  }

  const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (parsedUri.protocol !== "mongodb:" || !localHosts.has(parsedUri.hostname)) {
    throw new Error("Seed posts requires a local MongoDB URI.");
  }
}

function buildSeedPost(input: SeedPostInput): PostDocument {
  const bodyHtml = renderMarkdownToHtml(input.bodyMarkdown);

  return {
    _id: new ObjectId(),
    title: input.title,
    slug: normalizeSlug(input.slug),
    excerpt: input.excerpt,
    bodyMarkdown: input.bodyMarkdown,
    bodyHtml,
    status: input.status,
    tags: [DEV_SEED_TAG, ...input.tags],
    createdAt: new Date(input.createdAt),
    updatedAt: new Date(input.updatedAt),
    publishedAt: input.publishedAt === null ? null : new Date(input.publishedAt),
    contentSha256: computeContentSha256({
      title: input.title,
      excerpt: input.excerpt,
      bodyMarkdown: input.bodyMarkdown,
    }),
    canonicalVersion: 1,
  };
}

const seedPosts = [
  buildSeedPost({
    title: "Hello from mi-log",
    slug: "hello-from-mi-log",
    excerpt: "A deterministic published post for local API verification.",
    bodyMarkdown:
      "# Hello from mi-log\n\nThis local-only seed post verifies the public readonly API.",
    status: "published",
    tags: ["local-dev", "verification"],
    createdAt: "2026-05-14T00:00:00.000Z",
    updatedAt: "2026-05-14T00:00:00.000Z",
    publishedAt: "2026-05-14T00:00:00.000Z",
  }),
  buildSeedPost({
    title: "Draft Seed Post",
    slug: "draft-seed-post",
    excerpt: "A draft post that must stay hidden from the public API.",
    bodyMarkdown:
      "# Draft Seed Post\n\nThis draft seed post must not appear publicly.",
    status: "draft",
    tags: ["local-dev", "hidden"],
    createdAt: "2026-05-14T00:01:00.000Z",
    updatedAt: "2026-05-14T00:01:00.000Z",
    publishedAt: null,
  }),
  buildSeedPost({
    title: "Archived Seed Post",
    slug: "archived-seed-post",
    excerpt: "An archived post that must stay hidden from the public API.",
    bodyMarkdown:
      "# Archived Seed Post\n\nThis archived seed post must not appear publicly.",
    status: "archived",
    tags: ["local-dev", "hidden"],
    createdAt: "2026-05-14T00:02:00.000Z",
    updatedAt: "2026-05-14T00:02:00.000Z",
    publishedAt: "2026-05-14T00:02:00.000Z",
  }),
] satisfies PostDocument[];

async function seedPostsForLocalVerification(): Promise<void> {
  assertLocalDevelopmentSeedTarget();

  await connectMongo();
  try {
    await ensureMongoIndexes();

    const posts = getPostsCollection();
    const deleteResult = await posts.deleteMany({ tags: DEV_SEED_TAG });
    const insertResult = await posts.insertMany(seedPosts);

    console.log(
      `[mi-log-api] seed:posts cleared=${deleteResult.deletedCount} inserted=${insertResult.insertedCount}`,
    );
  } finally {
    await closeMongo();
  }
}

try {
  await seedPostsForLocalVerification();
} catch {
  console.error("[mi-log-api] seed:posts failed");
  await closeMongo();
  process.exit(1);
}
