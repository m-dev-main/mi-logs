import type { ProofManifest } from "@mi-log/shared";
import { getPostsCollection } from "../../db/collections.js";

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

export async function generateProofManifest(): Promise<ProofManifest> {
  const posts = await getPostsCollection()
    .find({ status: "published" })
    .sort({ slug: 1 })
    .project<{
      slug: string;
      contentSha256: string;
      canonicalVersion: number;
      publishedAt: Date | string;
    }>({
      _id: 0,
      slug: 1,
      contentSha256: 1,
      canonicalVersion: 1,
      publishedAt: 1,
    })
    .toArray();

  return {
    project: "mi-log",
    generatedAt: new Date().toISOString(),
    version: 1,
    posts: posts.map((post) => ({
      slug: post.slug,
      contentSha256: post.contentSha256,
      canonicalVersion: post.canonicalVersion,
      publishedAt: toIsoString(post.publishedAt),
    })),
    onion: null,
    ipfsCid: null,
  };
}
