import {
  chmod,
  copyFile,
  mkdir,
  readFile,
  stat,
} from "node:fs/promises";
import { createRequire } from "node:module";
import { dirname, join, resolve } from "node:path";

const requireFromApi = createRequire(resolve("apps/api/package.json"));
const { BSON, MongoClient } = requireFromApi("mongodb");
const { EJSON } = BSON;

const MONGO_URI = process.env.MONGO_URI ?? "mongodb://127.0.0.1:27017";
const MONGO_DB_NAME = process.env.MONGO_DB_NAME ?? "mi_log";
const RESTORE_CONFIRM = "restore-mi-log";

function fail(message) {
  console.error(`[mi-log-restore] ${message}`);
  process.exit(1);
}

function assertLocalMongoUri(uri) {
  let parsed;
  try {
    parsed = new URL(uri);
  } catch {
    throw new Error("Restore requires a valid local MongoDB URI.");
  }

  const localHosts = new Set(["127.0.0.1", "localhost", "[::1]"]);
  if (parsed.protocol !== "mongodb:" || !localHosts.has(parsed.hostname)) {
    throw new Error("Restore requires a local mongodb:// URI.");
  }
}

async function pathExists(path) {
  try {
    await stat(path);
    return true;
  } catch (error) {
    if (error.code === "ENOENT") {
      return false;
    }
    throw error;
  }
}

async function readBackupDocuments(path) {
  const raw = await readFile(path, "utf8");
  const parsed = JSON.parse(raw);
  const documents = EJSON.deserialize(parsed);

  if (!Array.isArray(documents)) {
    throw new Error(`${path} must contain a JSON array.`);
  }

  return documents;
}

async function restoreCollection(db, collectionName, documents) {
  const collection = db.collection(collectionName);
  await collection.deleteMany({});

  if (documents.length > 0) {
    await collection.insertMany(documents);
  }

  return documents.length;
}

async function restoreOptionalKey(source, target, options = {}) {
  if (!(await pathExists(source))) {
    return "missing";
  }

  const targetExists = await pathExists(target);
  if (targetExists && process.env.MI_LOG_RESTORE_OVERWRITE_KEYS !== "true") {
    return "skipped-existing";
  }

  await mkdir(dirname(target), { recursive: true, mode: options.private ? 0o700 : 0o755 });
  await copyFile(source, target);
  if (options.private) {
    await chmod(target, 0o600);
  }
  return targetExists ? "overwritten" : "restored";
}

const backupArg = process.argv[2];
if (!backupArg) {
  fail("Usage: pnpm restore:local backups/<backup-folder>");
}

if (process.env.MI_LOG_RESTORE_CONFIRM !== RESTORE_CONFIRM) {
  fail("Refusing restore; set MI_LOG_RESTORE_CONFIRM=restore-mi-log.");
}

assertLocalMongoUri(MONGO_URI);

const backupRoot = resolve(backupArg);
const mongoDir = join(backupRoot, "mongo");
const postsPath = join(mongoDir, "posts.json");
const ownerCredentialsPath = join(mongoDir, "owner_credentials.json");

if (!(await pathExists(join(backupRoot, "BACKUP_MANIFEST.json")))) {
  fail("BACKUP_MANIFEST.json is missing.");
}

if (await pathExists(join(mongoDir, "admin_sessions.json"))) {
  fail("Refusing restore from backup containing admin_sessions.json.");
}

const client = new MongoClient(MONGO_URI, { serverSelectionTimeoutMS: 5_000 });

try {
  const [posts, ownerCredentials] = await Promise.all([
    readBackupDocuments(postsPath),
    readBackupDocuments(ownerCredentialsPath),
  ]);

  await client.connect();
  const db = client.db(MONGO_DB_NAME);

  const postsCount = await restoreCollection(db, "posts", posts);
  const ownerCredentialsCount = await restoreCollection(
    db,
    "owner_credentials",
    ownerCredentials,
  );

  const publicKeyStatus = await restoreOptionalKey(
    join(backupRoot, "keys", "author.pub"),
    resolve("keys/author.pub"),
  );
  const privateKeyStatus = await restoreOptionalKey(
    join(backupRoot, "keys", "private", "author.key"),
    resolve("keys/private/author.key"),
    { private: true },
  );

  console.log(`[mi-log-restore] restored posts: ${postsCount}`);
  console.log(`[mi-log-restore] restored owner_credentials: ${ownerCredentialsCount}`);
  console.log("[mi-log-restore] restored admin_sessions: no");
  console.log(`[mi-log-restore] author public key: ${publicKeyStatus}`);
  console.log(`[mi-log-restore] author private key: ${privateKeyStatus}`);
} catch (error) {
  const message = error instanceof Error ? error.message : "Restore failed.";
  console.error(`[mi-log-restore] ${message}`);
  process.exitCode = 1;
} finally {
  await client.close();
}
