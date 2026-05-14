import { readdir, readFile } from "node:fs/promises";
import { join, relative, resolve } from "node:path";

const repoRoot = resolve(".");

const excludedDirectories = new Set([
  ".git",
  "coverage",
  "dist",
  "docs",
  "node_modules",
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

const forbiddenPatterns = [
  { label: "Mongoose dependency/import", pattern: /\bmongoose\b/i },
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
  { label: "Bootstrap UI dependency", pattern: /\bbootstrap\b/i },
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

function reportPass(message) {
  console.log(`PASS ${message}`);
}

function reportFail(message) {
  console.error(`FAIL ${message}`);
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

if (failures.length === 0) {
  reportPass(`source audit passed (${files.length} files checked)`);
  process.exit(0);
}

reportFail(`source audit found ${failures.length} issue(s)`);
for (const failure of failures) {
  console.error(`- ${failure.label}: ${failure.file} (${failure.match})`);
}
process.exit(1);
