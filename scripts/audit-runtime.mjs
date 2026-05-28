const dynamicBaseUrl = "http://127.0.0.1:4000";
const staticBaseUrl = "http://127.0.0.1:4080";

const requiredHeaders = [
  ["x-content-type-options", "nosniff"],
  ["referrer-policy", "no-referrer"],
  ["x-frame-options", "DENY"],
  ["permissions-policy", "geolocation=(), camera=(), microphone=()"],
];

const checks = [
  { label: "dynamic GET /health", baseUrl: dynamicBaseUrl, path: "/health", status: 200 },
  {
    label: "dynamic GET /api/v1/posts without session",
    baseUrl: dynamicBaseUrl,
    path: "/api/v1/posts",
    status: 200,
  },
  {
    label: "dynamic GET /api/v1/proof without session",
    baseUrl: dynamicBaseUrl,
    path: "/api/v1/proof",
    status: 200,
  },
  {
    label: "dynamic GET /api/v1/admin/posts without session",
    baseUrl: dynamicBaseUrl,
    path: "/api/v1/admin/posts",
    statuses: [401, 403],
    validateJson: (json, response) =>
      response.status === 401 || json?.error?.code === "DESKTOP_CONTROL_REQUIRED",
  },
  {
    label: "dynamic GET /api/v1/auth/session unauthenticated",
    baseUrl: dynamicBaseUrl,
    path: "/api/v1/auth/session",
    statuses: [200, 403],
    validateJson: (json, response) =>
      response.status === 200
        ? json?.data?.authenticated === false
        : json?.error?.code === "DESKTOP_CONTROL_REQUIRED",
  },
  { label: "static GET /", baseUrl: staticBaseUrl, path: "/", status: 200 },
  {
    label: "static GET /mi-log-data/posts.json",
    baseUrl: staticBaseUrl,
    path: "/mi-log-data/posts.json",
    status: 200,
  },
  {
    label: "static GET /sovereign-manifest.json",
    baseUrl: staticBaseUrl,
    path: "/sovereign-manifest.json",
    status: 200,
  },
  {
    label: "static GET /api/v1/admin/posts",
    baseUrl: staticBaseUrl,
    path: "/api/v1/admin/posts",
    status: 404,
  },
  {
    label: "static GET /api/v1/auth/session",
    baseUrl: staticBaseUrl,
    path: "/api/v1/auth/session",
    status: 404,
  },
];

function headerFailures(response) {
  return requiredHeaders.flatMap(([name, expected]) => {
    const actual = response.headers.get(name);
    return actual === expected ? [] : [`${name} expected ${expected}, got ${actual}`];
  });
}

function reportPass(message) {
  console.log(`PASS ${message}`);
}

function reportFail(message) {
  console.error(`FAIL ${message}`);
}

const failures = [];

for (const check of checks) {
  const url = `${check.baseUrl}${check.path}`;

  try {
    const response = await fetch(url, { headers: { Accept: "application/json" } });
    const issues = [];

    const expectedStatuses = check.statuses ?? [check.status];
    if (!expectedStatuses.includes(response.status)) {
      issues.push(
        `status expected ${expectedStatuses.join(" or ")}, got ${response.status}`,
      );
    }

    issues.push(...headerFailures(response));

    if (check.validateJson) {
      let json = null;
      try {
        json = await response.json();
      } catch {
        issues.push("response was not valid JSON");
      }

      if (json !== null && !check.validateJson(json, response)) {
        issues.push("JSON validation failed");
      }
    } else {
      await response.arrayBuffer();
    }

    if (issues.length === 0) {
      reportPass(check.label);
    } else {
      reportFail(`${check.label}: ${issues.join("; ")}`);
      failures.push({ label: check.label, issues });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "request failed";
    reportFail(`${check.label}: ${message}`);
    failures.push({ label: check.label, issues: [message] });
  }
}

if (failures.length === 0) {
  reportPass("runtime audit passed");
  process.exit(0);
}

reportFail(`runtime audit found ${failures.length} failing check(s)`);
process.exit(1);
