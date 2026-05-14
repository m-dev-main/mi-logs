import { createHash } from "node:crypto";
import {
  access,
  constants,
  cp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import type { PublicPostDetail, PublicPostListItem } from "@mi-log/shared";
import { getPostsCollection } from "../../db/collections.js";
import {
  getAuthorPublicKeyPath,
  readAuthorPrivateKey,
  readAuthorPublicKey,
} from "./authorKeys.js";
import { signCanonicalJson, type JsonValue } from "./signing.js";

export type SovereignManifestPost = {
  slug: string;
  contentSha256: string;
  canonicalVersion: number;
  publishedAt: string;
};

export type SovereignManifest = {
  project: "mi-log";
  releaseVersion: 1;
  generatedAt: string;
  posts: SovereignManifestPost[];
  onion: null;
  ipfsCid: string | null;
};

type ReleasePublicPost = PublicPostDetail;

type StaticPublicData = {
  posts: PublicPostListItem[];
  details: Record<string, ReleasePublicPost>;
};

type ReleasePostDocument = {
  title: string;
  slug: string;
  excerpt: string;
  bodyHtml: string;
  tags: string[];
  publishedAt: Date | string;
  contentSha256: string;
  canonicalVersion: number;
};

export type ExportReleaseOptions = {
  repoRoot?: string;
  publicBuildDir?: string;
  releaseDir?: string;
};

export type ExportReleaseResult = {
  releasePath: string;
  publicPath: string;
  publishedPostCount: number;
  signed: boolean;
  authorPublicKeyCopied: boolean;
  releaseSha256: string;
};

function toIsoString(value: Date | string): string {
  return value instanceof Date ? value.toISOString() : value;
}

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function findRepoRoot(start = process.env.INIT_CWD ?? process.cwd()): Promise<string> {
  let current = resolve(start);

  while (true) {
    if (await exists(join(current, "pnpm-workspace.yaml"))) {
      return current;
    }

    const parent = dirname(current);
    if (parent === current) {
      throw new Error("Could not locate repository root.");
    }
    current = parent;
  }
}

export function prettyJson(value: unknown): string {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function sortReleasePosts(posts: ReleasePostDocument[]): ReleasePostDocument[] {
  return [...posts].sort((a, b) => {
    const publishedCompare = toIsoString(a.publishedAt).localeCompare(
      toIsoString(b.publishedAt),
    );

    return publishedCompare === 0 ? a.slug.localeCompare(b.slug) : publishedCompare;
  });
}

async function fetchPublishedReleasePosts(): Promise<ReleasePostDocument[]> {
  const posts = await getPostsCollection()
    .find({ status: "published", publishedAt: { $ne: null } })
    .project<ReleasePostDocument>({
      _id: 0,
      title: 1,
      slug: 1,
      excerpt: 1,
      bodyHtml: 1,
      tags: 1,
      publishedAt: 1,
      contentSha256: 1,
      canonicalVersion: 1,
    })
    .toArray();

  return sortReleasePosts(posts);
}

function buildManifest(posts: ReleasePostDocument[]): SovereignManifest {
  const generatedAt =
    posts.length === 0
      ? "1970-01-01T00:00:00.000Z"
      : toIsoString(posts[posts.length - 1].publishedAt);

  return {
    project: "mi-log",
    releaseVersion: 1,
    generatedAt,
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

function buildStaticPublicData(posts: ReleasePostDocument[]): StaticPublicData {
  const details: Record<string, ReleasePublicPost> = {};
  const listItems = posts.map((post) => {
    const listItem: PublicPostListItem = {
      title: post.title,
      slug: post.slug,
      excerpt: post.excerpt,
      tags: post.tags,
      publishedAt: toIsoString(post.publishedAt),
      contentSha256: post.contentSha256,
      canonicalVersion: post.canonicalVersion,
    };

    details[post.slug] = {
      ...listItem,
      bodyHtml: post.bodyHtml,
    };

    return listItem;
  });

  return {
    posts: listItems,
    details,
  };
}

async function readAuthorPublicKeyFromConfiguredPath(): Promise<string | null> {
  const publicKey = await readAuthorPublicKey();
  if (publicKey === null) {
    return null;
  }

  // Ensure the configured public key path is readable before publishing it.
  await readFile(getAuthorPublicKeyPath(), "utf8");
  return publicKey;
}

export function computeReleaseSha256(input: {
  manifestJson: string;
  signatureFile: string;
  authorPublicKeyFile: string | null;
}): string {
  const hash = createHash("sha256");

  hash.update("sovereign-manifest.json\0", "utf8");
  hash.update(input.manifestJson, "utf8");
  hash.update("\0sovereign-manifest.sig\0", "utf8");
  hash.update(input.signatureFile, "utf8");

  if (input.authorPublicKeyFile !== null) {
    hash.update("\0author.pub\0", "utf8");
    hash.update(input.authorPublicKeyFile, "utf8");
  }

  return hash.digest("hex");
}

export async function writeReleaseProofFiles(
  releasePath: string,
  manifest: SovereignManifest,
): Promise<{
  signed: boolean;
  authorPublicKeyCopied: boolean;
  releaseSha256: string;
}> {
  const manifestJson = prettyJson(manifest);
  const [privateKey, authorPublicKey] = await Promise.all([
    readAuthorPrivateKey(),
    readAuthorPublicKeyFromConfiguredPath(),
  ]);
  const signature = privateKey
    ? signCanonicalJson(manifest as unknown as JsonValue, privateKey)
    : null;
  const signatureFile = signature === null ? "" : `${signature}\n`;
  const releaseSha256 = computeReleaseSha256({
    manifestJson,
    signatureFile,
    authorPublicKeyFile: authorPublicKey,
  });

  await writeFile(join(releasePath, "sovereign-manifest.json"), manifestJson, "utf8");
  await writeFile(join(releasePath, "sovereign-manifest.sig"), signatureFile, "utf8");

  if (authorPublicKey !== null) {
    await writeFile(join(releasePath, "author.pub"), authorPublicKey, "utf8");
  }

  await writeFile(
    join(releasePath, "release-sha256.txt"),
    `${releaseSha256}\n`,
    "utf8",
  );

  return {
    signed: signature !== null,
    authorPublicKeyCopied: authorPublicKey !== null,
    releaseSha256,
  };
}

export async function exportRelease(
  options: ExportReleaseOptions = {},
): Promise<ExportReleaseResult> {
  const repoRoot = options.repoRoot ?? (await findRepoRoot());
  const releasePath = options.releaseDir ?? join(repoRoot, "releases", "latest");
  const publicPath = join(releasePath, "public");
  const publicBuildDir = options.publicBuildDir ?? join(repoRoot, "apps", "web", "dist");

  if (!(await exists(publicBuildDir))) {
    throw new Error("Web build output not found; run pnpm build:web before exporting.");
  }

  const posts = await fetchPublishedReleasePosts();
  const manifest = buildManifest(posts);

  await rm(releasePath, { recursive: true, force: true });
  await mkdir(releasePath, { recursive: true });
  await cp(publicBuildDir, publicPath, { recursive: true });

  await mkdir(join(publicPath, "mi-log-data"), { recursive: true });
  await writeFile(
    join(publicPath, "mi-log-data", "posts.json"),
    prettyJson(buildStaticPublicData(posts)),
    "utf8",
  );
  const proofResult = await writeReleaseProofFiles(releasePath, manifest);

  return {
    releasePath,
    publicPath,
    publishedPostCount: posts.length,
    signed: proofResult.signed,
    authorPublicKeyCopied: proofResult.authorPublicKeyCopied,
    releaseSha256: proofResult.releaseSha256,
  };
}
