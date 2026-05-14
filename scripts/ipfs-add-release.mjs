import { createHash, createPrivateKey, sign } from "node:crypto";
import { spawn } from "node:child_process";
import {
  access,
  constants,
  readFile,
  rm,
  stat,
  writeFile,
} from "node:fs/promises";
import { join, resolve } from "node:path";

const releaseRoot = resolve("releases/latest");
const publicRoot = join(releaseRoot, "public");
const manifestPath = join(releaseRoot, "sovereign-manifest.json");
const signaturePath = join(releaseRoot, "sovereign-manifest.sig");
const authorPublicKeyPath = join(releaseRoot, "author.pub");
const releaseSha256Path = join(releaseRoot, "release-sha256.txt");
const ipfsCidPath = join(releaseRoot, "ipfs-cid.txt");

const mirroredProofFiles = [
  "sovereign-manifest.json",
  "sovereign-manifest.sig",
  "author.pub",
  "release-sha256.txt",
  "ipfs-cid.txt",
];

function fail(message) {
  console.error(`[mi-log-ipfs] ${message}`);
  process.exit(1);
}

async function ensureDirectory(path, message) {
  try {
    const info = await stat(path);
    if (!info.isDirectory()) {
      fail(message);
    }
  } catch {
    fail(message);
  }
}

async function readOptionalFile(path) {
  try {
    return await readFile(path, "utf8");
  } catch (error) {
    if (error.code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

function prettyJson(value) {
  return `${JSON.stringify(value, null, 2)}\n`;
}

function computeReleaseSha256({ manifestJson, signatureFile, authorPublicKeyFile }) {
  const hash = createHash("sha256");

  hash.update("sovereign-manifest.json\0", "utf8");
  hash.update(manifestJson, "utf8");
  hash.update("\0sovereign-manifest.sig\0", "utf8");
  hash.update(signatureFile, "utf8");

  if (authorPublicKeyFile !== null) {
    hash.update("\0author.pub\0", "utf8");
    hash.update(authorPublicKeyFile, "utf8");
  }

  return hash.digest("hex");
}

function signManifest(manifest, privateKeyPem) {
  const key = createPrivateKey(privateKeyPem);
  return sign(null, Buffer.from(canonicalJson(manifest), "utf8"), key).toString(
    "base64",
  );
}

async function removeMirroredProofFiles() {
  await Promise.all(
    mirroredProofFiles.map((fileName) =>
      rm(join(publicRoot, fileName), { force: true }),
    ),
  );
}

function parseDirectoryCid(output) {
  const addedLines = output
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("added "));

  for (let index = addedLines.length - 1; index >= 0; index -= 1) {
    const parts = addedLines[index].split(/\s+/);
    if (parts.length >= 3) {
      return parts[1];
    }
  }

  return null;
}

function runIpfsAdd() {
  return new Promise((resolve, reject) => {
    const child = spawn("ipfs", ["add", "-r", "releases/latest/public"], {
      cwd: process.cwd(),
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });
    child.on("error", (error) => {
      if (error.code === "ENOENT") {
        reject(new Error("local ipfs CLI not found; install IPFS and rerun pnpm ipfs:add-release."));
        return;
      }
      reject(error);
    });
    child.on("close", (code) => {
      if (code !== 0) {
        reject(
          new Error(
            `ipfs add failed with exit code ${code}${stderr ? `: ${stderr.trim()}` : ""}`,
          ),
        );
        return;
      }
      resolve(stdout);
    });
  });
}

async function writeUpdatedProofFiles(ipfsCid) {
  const manifestRaw = await readFile(manifestPath, "utf8");
  const manifest = JSON.parse(manifestRaw);
  manifest.ipfsCid = ipfsCid;

  const manifestJson = prettyJson(manifest);
  const privateKeyPath = resolve(
    process.env.AUTHOR_KEY_DIR ?? "keys/private",
    "author.key",
  );
  const privateKey = await readOptionalFile(privateKeyPath);
  const authorPublicKey = await readOptionalFile(authorPublicKeyPath);
  const signatureFile = privateKey
    ? `${signManifest(manifest, privateKey)}\n`
    : "";
  const releaseSha256 = computeReleaseSha256({
    manifestJson,
    signatureFile,
    authorPublicKeyFile: authorPublicKey,
  });

  await writeFile(manifestPath, manifestJson, "utf8");
  await writeFile(signaturePath, signatureFile, "utf8");
  await writeFile(ipfsCidPath, `${ipfsCid}\n`, "utf8");
  await writeFile(releaseSha256Path, `${releaseSha256}\n`, "utf8");

  return {
    signed: privateKey !== null,
    releaseSha256,
  };
}

await ensureDirectory(publicRoot, "releases/latest/public is missing; run pnpm release first.");

try {
  await access(manifestPath, constants.R_OK);
} catch {
  fail("sovereign-manifest.json is missing; run pnpm release first.");
}

try {
  await removeMirroredProofFiles();
  const output = await runIpfsAdd();
  const ipfsCid = parseDirectoryCid(output);

  if (ipfsCid === null) {
    fail("could not parse directory CID from local ipfs add output.");
  }

  const result = await writeUpdatedProofFiles(ipfsCid);

  console.log(`[mi-log-ipfs] release CID: ${ipfsCid}`);
  console.log(`[mi-log-ipfs] signed: ${result.signed ? "true" : "false"}`);
  console.log(`[mi-log-ipfs] release sha256: ${result.releaseSha256}`);
} catch (error) {
  const message = error instanceof Error ? error.message : "IPFS archival failed.";
  fail(message);
}
