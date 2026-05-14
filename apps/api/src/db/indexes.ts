import {
  getAdminSessionsCollection,
  getOwnerCredentialsCollection,
  getPostsCollection,
} from "./collections.js";

export async function ensureMongoIndexes(): Promise<void> {
  try {
    await Promise.all([
      getPostsCollection().createIndexes([
        { key: { slug: 1 }, unique: true, name: "posts_slug_unique" },
        {
          key: { status: 1, publishedAt: 1 },
          name: "posts_status_publishedAt",
        },
        { key: { tags: 1 }, name: "posts_tags" },
        { key: { contentSha256: 1 }, name: "posts_contentSha256" },
      ]),
      getOwnerCredentialsCollection().createIndexes([
        {
          key: { credentialId: 1 },
          unique: true,
          name: "owner_credentials_credentialId_unique",
        },
      ]),
      getAdminSessionsCollection().createIndexes([
        {
          key: { sessionIdHash: 1 },
          unique: true,
          name: "admin_sessions_sessionIdHash_unique",
        },
        {
          key: { expiresAt: 1 },
          expireAfterSeconds: 0,
          name: "admin_sessions_expiresAt_ttl",
        },
      ]),
    ]);
    console.log("[mi-log-api] MongoDB indexes ready");
  } catch {
    console.error("[mi-log-api] MongoDB indexes failed");
    throw new Error("MongoDB indexes failed");
  }
}
