import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const repoRoot = resolve(".");

const excludedDirectories = new Set([
  ".git",
  "coverage",
  "dist",
  "dist-desktop",
  "docs",
  "node_modules",
  "release",
  "releases",
]);

const excludedFiles = new Set([
  "pnpm-lock.yaml",
  "scripts/audit-source.mjs",
  "scripts/audit-release.mjs",
  "scripts/audit-runtime.mjs",
  "scripts/audit-all.mjs",
]);

const sourceExtensions = new Set([
  ".cjs",
  ".css",
  ".html",
  ".js",
  ".json",
  ".jsx",
  ".md",
  ".mjs",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

const mongooseDependencyPattern =
  /(?:from\s+["']mongoose["']|import\s+mongoose\b|require\(\s*["']mongoose["']\)|\bmongoose\.(connect|createConnection|model|Schema)\b)/i;

const forbiddenPatterns = [
  { label: "Mongoose dependency/import", pattern: mongooseDependencyPattern },
  { label: "MongoDB Atlas URI", pattern: /mongodb\+srv:\/\//i },
  {
    label: "0.0.0.0 default binding",
    pattern:
      /(?:host|hostname|API_HOST|STATIC_HOST|WEB_HOST)\s*[:=]\s*["']0\.0\.0\.0["']|listen\([^)]*["']0\.0\.0\.0["']/i,
  },
  { label: "Google Fonts", pattern: /fonts\.googleapis/i },
  { label: "Google Analytics", pattern: /google-analytics/i },
  { label: "gtag analytics", pattern: /\bgtag\s*\(/i },
  { label: "Plausible analytics", pattern: /\bplausible\b/i },
  { label: "Segment analytics", pattern: /\bsegment\b/i },
  { label: "Mixpanel analytics", pattern: /\bmixpanel\b/i },
  { label: "Tailwind UI dependency", pattern: /\btailwind\b/i },
  {
    label: "Bootstrap UI dependency",
    pattern:
      /(?:from\s+["']bootstrap(?:\/|["'])|require\(\s*["']bootstrap(?:\/|["'])|["']bootstrap["'])/i,
  },
  { label: "Material UI dependency", pattern: /\bmaterial-ui\b|["']@mui\//i },
  { label: "shadcn UI dependency", pattern: /\bshadcn\b/i },
  {
    label: "localStorage secret storage",
    pattern:
      /localStorage[\s\S]{0,80}(?:secret|token|key|session|credential)|(?:secret|token|key|session|credential)[\s\S]{0,80}localStorage/i,
  },
  {
    label: "sessionStorage secret storage",
    pattern:
      /sessionStorage[\s\S]{0,80}(?:secret|token|key|session|credential)|(?:secret|token|key|session|credential)[\s\S]{0,80}sessionStorage/i,
  },
];

const publicSafetyDocPaths = [
  "docs/00_PROJECT_CONTRACT.md",
  "docs/01_ARCHITECTURE_LOCK.md",
  "docs/04_DECISIONS.md",
  "docs/08_SECURITY_PRIVACY_MODEL.md",
  "docs/09_LOCAL_DEV_AND_RUNTIME.md",
  "docs/10_TOR_AND_PUBLISHING_MODEL.md",
  "docs/12_ACCEPTANCE_CHECKLIST.md",
];

const publicSafetyDirectories = new Set(["docs", "examples"]);

function findLikelyRealV3Onion(content) {
  const re = /\b([a-z2-7]{56})\.onion\b/g;
  let m;
  while ((m = re.exec(content)) !== null) {
    const host = m[1];
    if (/^(.)\1{55}$/.test(host)) {
      continue;
    }
    return m[0];
  }
  return null;
}

const publicSafetyChecks = [
  {
    label: "PEM private key marker",
    run: (content) => content.match(/-----BEGIN [A-Z ]*PRIVATE KEY-----/)?.[0] ?? null,
  },
  {
    label: "macOS home path (/Users/...)",
    run: (content) => content.match(/\/Users\/[^/\s"'`]+/)?.[0] ?? null,
  },
  {
    label: "shell/email prompt trace",
    run: (content) => (/\bm@toodles\b/.test(content) ? "m@toodles" : null),
  },
  {
    label: "historically leaked example onion (remove before publish)",
    run: (content) =>
      content.match(/qu5w6f7m64se75kyjqfpnvtzij5uelp7xaaf32nsc25tzfbcr2rp2tyd\.onion/)?.[0] ?? null,
  },
  {
    label: "example personal backup path",
    run: (content) => content.match(/backups\/mi-log-backup(?:\/|\b|$)/)?.[0] ?? null,
  },
  {
    label: "likely real Tor v3 hostname (56-char .onion, not uniform placeholder)",
    run: (content) => findLikelyRealV3Onion(content),
  },
];

function extensionOf(path) {
  const index = path.lastIndexOf(".");
  return index === -1 ? "" : path.slice(index);
}

async function listSourceFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    const rel = relative(repoRoot, path);

    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name)) {
        files.push(...(await listSourceFiles(path)));
      }
      continue;
    }

    if (
      entry.isFile() &&
      !excludedFiles.has(rel) &&
      sourceExtensions.has(extensionOf(entry.name))
    ) {
      files.push(path);
    }
  }

  return files;
}

async function listPublicSafetyFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    const path = join(dir, entry.name);
    const rel = relative(repoRoot, path);

    if (entry.isDirectory()) {
      if (!excludedDirectories.has(entry.name) || publicSafetyDirectories.has(entry.name)) {
        files.push(...(await listPublicSafetyFiles(path)));
      }
      continue;
    }

    if (
      entry.isFile() &&
      !excludedFiles.has(rel) &&
      sourceExtensions.has(extensionOf(entry.name))
    ) {
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

async function collectPublicSafetyPaths(files) {
  const relSet = new Set(publicSafetyDocPaths);
  for (const file of files) {
    const rel = relative(repoRoot, file);
    if (
      rel === ".env.example" ||
      rel === "CONTRIBUTING.md" ||
      rel === "README.md" ||
      rel === "SECURITY.md" ||
      rel.startsWith("apps/") ||
      rel.startsWith("packages/")
    ) {
      relSet.add(rel);
    }
  }
  for (const file of await listPublicSafetyFiles(repoRoot)) {
    const rel = relative(repoRoot, file);
    if (
      rel === "README.md" ||
      rel === "CONTRIBUTING.md" ||
      rel === "SECURITY.md" ||
      rel.startsWith("docs/") ||
      rel.startsWith("examples/")
    ) {
      relSet.add(rel);
    }
  }
  return relSet;
}

function runPublicSafetyScan(content) {
  for (const { label, run } of publicSafetyChecks) {
    const match = run(content);
    if (match) {
      return { label, match: String(match).replace(/\s+/g, " ") };
    }
  }
  return null;
}

const files = await listSourceFiles(repoRoot);
const failures = [];

for (const file of files) {
  const rel = relative(repoRoot, file);
  const content = await readFile(file, "utf8");

  for (const { label, pattern } of forbiddenPatterns) {
    const match = content.match(pattern);
    if (match) {
      failures.push({ file: rel, label, match: match[0].replace(/\s+/g, " ") });
    }
  }
}

const safetyPaths = await collectPublicSafetyPaths(files);
for (const rel of safetyPaths) {
  let content;
  try {
    content = await readFile(join(repoRoot, rel), "utf8");
  } catch {
    continue;
  }
  const hit = runPublicSafetyScan(content);
  if (hit) {
    failures.push({ file: rel, label: `public safety: ${hit.label}`, match: hit.match });
  }
}

if (failures.length === 0) {
  reportPass(
    `source audit passed (${files.length} source files; public safety scan on ${safetyPaths.size} paths)`,
  );
  process.exit(0);
}

reportFail(`source audit found ${failures.length} issue(s)`);
for (const failure of failures) {
  console.error(`- ${failure.label}: ${failure.file} (${failure.match})`);
}
process.exit(1);
