import type { Post } from "@mi-log/shared";
import { ObjectId, type Filter } from "mongodb";
import { getPostsCollection, type PostDocument } from "../../db/collections.js";

export type PublishedPostsOptions = {
  page: number;
  limit: number;
  tag?: string;
  q?: string;
};

export type CreateDraftPostInput = Omit<PostDocument, "_id">;
export type UpdatePostForAdminInput = Partial<Omit<PostDocument, "_id">>;

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function publishedPostsFilter(options: Pick<PublishedPostsOptions, "tag" | "q">): Filter<PostDocument> {
  const search =
    options.q && options.q.length > 0
      ? new RegExp(escapeRegExp(options.q), "i")
      : null;

  return {
    status: "published",
    ...(options.tag ? { tags: options.tag } : {}),
    ...(search
      ? {
          $or: [
            { title: search },
            { excerpt: search },
            { tags: search },
            { bodyMarkdown: search },
            { bodyHtml: search },
          ],
        }
      : {}),
  };
}

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export function toDomainPost(document: PostDocument): Post {
  return {
    _id: document._id.toHexString(),
    title: document.title,
    slug: document.slug,
    excerpt: document.excerpt,
    bodyMarkdown: document.bodyMarkdown,
    bodyHtml: document.bodyHtml,
    status: document.status,
    tags: document.tags,
    createdAt: toIsoString(document.createdAt),
    updatedAt: toIsoString(document.updatedAt),
    publishedAt:
      document.publishedAt === null ? null : toIsoString(document.publishedAt),
    contentSha256: document.contentSha256,
    canonicalVersion: document.canonicalVersion,
  };
}

function objectIdFromString(id: string): ObjectId {
  return new ObjectId(id);
}

export async function listPublishedPosts(
  options: PublishedPostsOptions,
): Promise<Post[]> {
  const skip = (options.page - 1) * options.limit;

  const documents = await getPostsCollection()
    .find(publishedPostsFilter(options))
    .sort({ publishedAt: -1 })
    .skip(skip)
    .limit(options.limit)
    .toArray();

  return documents.map(toDomainPost);
}

export async function countPublishedPosts(
  options: Pick<PublishedPostsOptions, "tag" | "q">,
): Promise<number> {
  return getPostsCollection().countDocuments(publishedPostsFilter(options));
}

export async function findPublishedPostBySlug(slug: string): Promise<Post | null> {
  const document = await getPostsCollection().findOne({
    status: "published",
    slug,
  });

  return document ? toDomainPost(document) : null;
}

export async function listAllPostsForAdmin(): Promise<Post[]> {
  const documents = await getPostsCollection()
    .find({})
    .sort({ updatedAt: -1 })
    .toArray();

  return documents.map(toDomainPost);
}

export async function findPostByIdForAdmin(id: string): Promise<Post | null> {
  const document = await getPostsCollection().findOne({
    _id: objectIdFromString(id),
  });

  return document ? toDomainPost(document) : null;
}

export async function createDraftPost(input: CreateDraftPostInput): Promise<Post> {
  const document: PostDocument = {
    _id: new ObjectId(),
    ...input,
  };

  await getPostsCollection().insertOne(document);

  return toDomainPost(document);
}

export async function updatePostForAdmin(
  id: string,
  input: UpdatePostForAdminInput,
): Promise<Post | null> {
  const document = await getPostsCollection().findOneAndUpdate(
    { _id: objectIdFromString(id) },
    { $set: input },
    { returnDocument: "after" },
  );

  return document ? toDomainPost(document) : null;
}

export async function publishPost(
  id: string,
  input: UpdatePostForAdminInput,
): Promise<Post | null> {
  const document = await getPostsCollection().findOneAndUpdate(
    { _id: objectIdFromString(id) },
    { $set: { ...input, status: "published" } },
    { returnDocument: "after" },
  );

  return document ? toDomainPost(document) : null;
}

export async function unpublishPost(
  id: string,
  input: UpdatePostForAdminInput,
): Promise<Post | null> {
  const document = await getPostsCollection().findOneAndUpdate(
    { _id: objectIdFromString(id) },
    { $set: { ...input, status: "draft", publishedAt: null } },
    { returnDocument: "after" },
  );

  return document ? toDomainPost(document) : null;
}

export async function deletePost(id: string): Promise<boolean> {
  const result = await getPostsCollection().deleteOne({
    _id: objectIdFromString(id),
  });

  return result.deletedCount === 1;
}
