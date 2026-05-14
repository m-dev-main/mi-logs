import { readdir, readFile, stat } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const releaseRoot = resolve("releases/latest");
const manifestPath = join(releaseRoot, "sovereign-manifest.json");
const signaturePath = join(releaseRoot, "sovereign-manifest.sig");
const authorPublicKeyPath = join(releaseRoot, "author.pub");
const ipfsCidPath = join(releaseRoot, "ipfs-cid.txt");

const forbiddenPatterns = [
  { label: "draft seed slug", pattern: /draft-seed-post/ },
  { label: "archived seed slug", pattern: /archived-seed-post/ },
  { label: "raw markdown field", pattern: /\bbodyMarkdown\b/ },
  { label: "admin API path", pattern: /\/api\/v1\/admin/ },
  { label: "auth API path", pattern: /\/api\/v1\/auth/ },
  { label: "WebAuthn admin code", pattern: /WebAuthn/ },
  { label: "passkey admin code", pattern: /Passkey/i },
  { label: "author private key filename", pattern: /author\.key/ },
  {
    label: "private key marker",
    pattern: /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  },
  { label: "MongoDB URI", pattern: /mongodb(?:\+srv)?:\/\// },
  { label: "localhost admin origin", pattern: /https?:\/\/(?:localhost|127\.0\.0\.1):(?:4000|5173)\/admin/ },
  { label: "admin route", pattern: /["'`]\/admin(?:\/|["'`])/ },
];

const textExtensions = new Set([
  ".css",
  ".html",
  ".js",
  ".json",
  ".sig",
  ".txt",
]);

function extensionOf(path) {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index);
}

async function listFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) {
      files.push(...(await listFiles(path)));
      continue;
    }
    if (entry.isFile()) {
      files.push(path);
    }
  }

  return files;
}

function reportPass(message) {
  console.log(`PASS ${message}`);
}

function reportFail(message) {
  console.error(`FAIL ${message}`);
}

async function readOptionalText(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

let files;
try {
  const releaseStat = await stat(releaseRoot);
  if (!releaseStat.isDirectory()) {
    throw new Error("not a directory");
  }
  files = await listFiles(releaseRoot);
} catch {
  reportFail("releases/latest is missing; run pnpm release first");
  process.exit(1);
}

const failures = [];

for (const file of files) {
  const rel = relative(releaseRoot, file);

  if (rel.endsWith(".map")) {
    failures.push({ file: rel, label: "source map file", match: rel });
    continue;
  }

  if (!textExtensions.has(extensionOf(rel))) {
    continue;
  }

  const content = await readFile(file, "utf8");
  for (const { label, pattern } of forbiddenPatterns) {
    const match = content.match(pattern);
    if (match) {
      failures.push({ file: rel, label, match: match[0] });
    }
  }
}

const manifestRaw = await readOptionalText(manifestPath);
if (manifestRaw === null) {
  failures.push({
    file: "sovereign-manifest.json",
    label: "missing manifest",
    match: "missing",
  });
} else {
  try {
    const manifest = JSON.parse(manifestRaw);
    const ipfsCid = (await readOptionalText(ipfsCidPath))?.trim() ?? null;

    if (ipfsCid !== null && manifest.ipfsCid !== ipfsCid) {
      failures.push({
        file: "sovereign-manifest.json",
        label: "IPFS CID mismatch",
        match: `manifest=${manifest.ipfsCid ?? "null"} file=${ipfsCid}`,
      });
    }
  } catch {
    failures.push({
      file: "sovereign-manifest.json",
      label: "invalid manifest JSON",
      match: "parse failed",
    });
  }
}

const authorPublicKey = await readOptionalText(authorPublicKeyPath);
const signature = await readOptionalText(signaturePath);
if (authorPublicKey !== null && (signature === null || signature.trim() === "")) {
  failures.push({
    file: "sovereign-manifest.sig",
    label: "missing manifest signature for published author key",
    match: "empty signature",
  });
}

if (failures.length === 0) {
  reportPass(`release audit passed (${files.length} files checked)`);
  process.exit(0);
}

reportFail(`release audit found ${failures.length} issue(s)`);
for (const failure of failures) {
  console.error(`- ${failure.label}: ${failure.file} (${failure.match})`);
}
process.exit(1);
