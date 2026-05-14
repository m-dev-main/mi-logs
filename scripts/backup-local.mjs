import { cp, mkdir, readFile, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const requireFromApi = createRequire(resolve("apps/api/package.json"));
const { BSON, MongoClient } = requireFromApi("mongodb");
const { EJSON } = BSON;

const BACKUP_WARNING =
  "This backup may contain private keys. Store offline and never commit.";

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017";
const MONGO_DB_NAME = process.env.MONGO_DB_NAME ?? "mi_log";

function timestampForBackupName(date = new Date()) {
  const pad = (value) => String(value).padStart(2, "0");
  return [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    "-",
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join("");
}

function assertLocalMongoUri(uri) {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error("Backup requires a valid local MongoDB URI.");
  }

  const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (parsed.protocol !== "mongodb:" || !localHosts.has(parsed.hostname)) {
    throw new Error("Backup requires a local mongodb:// URI.");
  }
}

async function readOptionalFile(path) {
  try {
    return await readFile(path);
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

async function copyOptionalFile(source, target, options = {}) {
  const content = await readOptionalFile(source);
  if (content === null) {
    return false;
  }

  await mkdir(dirname(target), { recursive: true });
  await writeFile(target, content, { mode: options.private ? 0o600 : 0o644 });
  return true;
}

async function copyOptionalDirectory(source, target) {
  try {
    await cp(source, target, { recursive: true });
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

function stringifyDocuments(documents) {
  return `${JSON.stringify(EJSON.serialize(documents, { relaxed: false }), null, 2)}\n`;
}

async function backupCollection(db, collectionName, targetPath) {
  const documents = await db.collection(collectionName).find({}).toArray();
  await writeFile(targetPath, stringifyDocuments(documents), "utf8");
  return documents.length;
}

assertLocalMongoUri(MONGO_URI);

const backupRoot = resolve(
  "backups",
  `mi-log-backup-${timestampForBackupName()}`,
);
const mongoDir = join(backupRoot, "mongo");
const keysDir = join(backupRoot, "keys");
const privateKeysDir = join(keysDir, "private");
const releasesDir = join(backupRoot, "releases");

const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5_000 });

try {
  await mkdir(mongoDir, { recursive: true });
  await mkdir(privateKeysDir, { recursive: true, mode: 0o700 });

  await client.connect();
  const db = client.db(MONGO_DB_NAME);

  const postsCount = await backupCollection(db, "posts", join(mongoDir, "posts.json"));
  const ownerCredentialsCount = await backupCollection(
    db,
    "owner_credentials",
    join(mongoDir, "owner_credentials.json"),
  );

  const authorPublicKey = await copyOptionalFile(
    resolve("keys/author.pub"),
    join(keysDir, "author.pub"),
  );
  const authorPrivateKey = await copyOptionalFile(
    resolve("keys/private/author.key"),
    join(privateKeysDir, "author.key"),
    { private: true },
  );
  const releaseLatest = await copyOptionalDirectory(
    resolve("releases/latest"),
    join(releasesDir, "latest"),
  );

  const manifest = {
    project: "mi-log",
    createdAt: new Date().toISOString(),
    includes: {
      posts: postsCount,
      owner_credentials: ownerCredentialsCount,
      authorPublicKey,
      authorPrivateKey,
      releaseLatest,
      adminSessions: false,
    },
    warning: BACKUP_WARNING,
  };

  await writeFile(
    join(backupRoot, "BACKUP_MANIFEST.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  console.log("[mi-log-backup] WARNING: backup may contain private keys.");
  console.log(`[mi-log-backup] backup path: ${backupRoot}`);
  console.log(`[mi-log-backup] posts: ${postsCount}`);
  console.log(`[mi-log-backup] owner_credentials: ${ownerCredentialsCount}`);
  console.log(`[mi-log-backup] author public key: ${authorPublicKey ? "yes" : "no"}`);
  console.log(`[mi-log-backup] author private key: ${authorPrivateKey ? "yes" : "no"}`);
  console.log(`[mi-log-backup] release latest: ${releaseLatest ? "yes" : "no"}`);
  console.log("[mi-log-backup] admin_sessions: no");
} catch (error) {
  const message = error instanceof Error ? error.message : "Backup failed.";
  console.error(`[mi-log-backup] ${message}`);
  process.exitCode = 1;
} finally {
  await client.close();
}
