import { readFile, stat } from "node:fs/promises";
import { relative, resolve, sep } from "node:path";

const BACKUP_WARNING =
  "This backup may contain private keys. Store offline and never commit.";

function fail(message) {
  console.error(`FAIL ${message}`);
  process.exitCode = 1;
}

function pass(message) {
  console.log(`PASS ${message}`);
}

async function exists(path) {
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

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

const backupArg = process.argv[2];
if (!backupArg) {
  fail("Usage: pnpm audit:backup backups/<backup-folder>");
  process.exit(1);
}

const backupRoot = resolve(backupArg);
const releaseRoot = resolve("releases/latest");
const relativeToRelease = relative(releaseRoot, backupRoot);
const failures = [];

function addFailure(message) {
  failures.push(message);
}

if (!relativeToRelease.startsWith("..") && relativeToRelease !== "") {
  addFailure("backup path must not be inside releases/latest");
}

const manifestPath = resolve(backupRoot, "BACKUP_MANIFEST.json");
const postsPath = resolve(backupRoot, "mongo", "posts.json");
const ownerCredentialsPath = resolve(backupRoot, "mongo", "owner_credentials.json");
const adminSessionsPath = resolve(backupRoot, "mongo", "admin_sessions.json");
const privateKeyPath = resolve(backupRoot, "keys", "private", "author.key");

let manifest = null;
if (!(await exists(manifestPath))) {
  addFailure("BACKUP_MANIFEST.json is missing");
} else {
  try {
    manifest = await readJson(manifestPath);
  } catch {
    addFailure("BACKUP_MANIFEST.json is not valid JSON");
  }
}

if (!(await exists(postsPath))) {
  addFailure("mongo/posts.json is missing");
}

if (!(await exists(ownerCredentialsPath))) {
  addFailure("mongo/owner_credentials.json is missing");
}

if (await exists(adminSessionsPath)) {
  addFailure("mongo/admin_sessions.json must not exist");
}

if ((await exists(privateKeyPath)) && manifest?.warning !== BACKUP_WARNING) {
  addFailure("manifest warning must clearly mention private key risk");
}

if (manifest?.includes?.adminSessions !== false) {
  addFailure("manifest must record adminSessions: false");
}

if (backupRoot.split(sep).includes("releases")) {
  addFailure("backup path must not be placed under releases");
}

if (failures.length === 0) {
  pass(`backup audit passed: ${backupRoot}`);
  process.exit(0);
}

for (const failure of failures) {
  fail(failure);
}
process.exit(1);
