const ALLOWED_NODE_ENV = new Set(["development", "production", "test"]);

export type NodeEnvKind = "development" | "production" | "test";

export type AppConfig = Readonly<{
  NODE_ENV: NodeEnvKind;
  API_HOST: string;
  API_PORT: number;
  STATIC_RELEASE_DIR: string;
  STATIC_HOST: string;
  STATIC_PORT: number;
  MONGO_URI: string;
  MONGO_DB_NAME: string;
  WEBAUTHN_RP_NAME: string;
  WEBAUTHN_RP_ID: string;
  WEBAUTHN_ORIGIN: string;
  ADMIN_SESSION_TTL_SECONDS: number;
  AUTHOR_KEY_DIR: string;
  AUTHOR_PUBLIC_KEY_PATH: string;
  DESKTOP_CONTROL_SECRET?: string;
  DESKTOP_ADMIN_SOCKET_PATH?: string;
  /** Non-empty enables first-owner passkey bootstrap when Bearer matches */
  OWNER_REGISTRATION_TOKEN?: string;
  isDevelopment: boolean;
  isProduction: boolean;
}>;

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function parseNodeEnv(raw: string | undefined): NodeEnvKind {
  const v = raw === undefined || raw === "" ? "development" : raw.trim();
  if (!ALLOWED_NODE_ENV.has(v)) {
    fail(
      `Config error: NODE_ENV must be development, production, or test (received: ${JSON.stringify(
        raw ?? "",
      )}).`,
    );
  }
  return v as NodeEnvKind;
}

function parseApiHost(raw: string | undefined): string {
  const v = raw === undefined || raw === "" ? "127.0.0.1" : raw.trim();
  if (v === "") {
    fail("Config error: API_HOST must not be empty.");
  }
  if (v === "0.0.0.0") {
    fail(
      "Config error: API_HOST must not be 0.0.0.0; bind to 127.0.0.1 for localhost-only serving.",
    );
  }
  return v;
}

function parseStaticHost(raw: string | undefined): string {
  const v = raw === undefined || raw === "" ? "127.0.0.1" : raw.trim();
  if (v === "") {
    fail("Config error: STATIC_HOST must not be empty.");
  }
  if (v === "0.0.0.0") {
    fail(
      "Config error: STATIC_HOST must not be 0.0.0.0; bind to 127.0.0.1 for readonly release serving.",
    );
  }
  return v;
}

function parseApiPort(raw: string | undefined): number {
  if (raw === undefined || raw === "") {
    return 4000;
  }
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    fail(
      `Config error: API_PORT must be a valid integer in the range 1–65535 (received: ${JSON.stringify(
        raw,
      )}).`,
    );
  }
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    fail(
      `Config error: API_PORT must be between 1 and 65535 inclusive (received: ${n}).`,
    );
  }
  return n;
}

function parseStaticPort(raw: string | undefined): number {
  if (raw === undefined || raw === "") {
    return 4080;
  }
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    fail(
      `Config error: STATIC_PORT must be a valid integer in the range 1–65535 (received: ${JSON.stringify(
        raw,
      )}).`,
    );
  }
  const n = Number(trimmed);
  if (!Number.isInteger(n) || n < 1 || n > 65535) {
    fail(
      `Config error: STATIC_PORT must be between 1 and 65535 inclusive (received: ${n}).`,
    );
  }
  return n;
}

const DEFAULT_MONGO_URI = "mongodb://127.0.0.1:27017";
const DEFAULT_MONGO_DB_NAME = "mi_log";

function parseMongoUri(raw: string | undefined): string {
  if (raw === undefined) {
    return DEFAULT_MONGO_URI;
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    fail("Config error: MONGO_URI must not be empty.");
  }
  return trimmed;
}

function parseMongoDbName(raw: string | undefined): string {
  if (raw === undefined) {
    return DEFAULT_MONGO_DB_NAME;
  }
  const trimmed = raw.trim();
  if (trimmed === "") {
    fail("Config error: MONGO_DB_NAME must not be empty.");
  }
  return trimmed;
}

function parseRequiredString(
  raw: string | undefined,
  name: string,
  defaultValue: string,
): string {
  const value = raw === undefined ? defaultValue : raw.trim();
  if (value === "") {
    fail(`Config error: ${name} must not be empty.`);
  }
  return value;
}

function parseLocalWebAuthnOrigin(raw: string | undefined): string {
  const value = parseRequiredString(
    raw,
    "WEBAUTHN_ORIGIN",
    "http://localhost:5173",
  );

  let url: URL;
  try {
    url = new URL(value);
  } catch {
    fail("Config error: WEBAUTHN_ORIGIN must be a valid URL.");
  }

  const isLocalHost = url.hostname === "localhost" || url.hostname === "127.0.0.1";
  if (!isLocalHost) {
    fail(
      "Config error: WEBAUTHN_ORIGIN must be localhost or 127.0.0.1 for v0 local auth.",
    );
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    fail("Config error: WEBAUTHN_ORIGIN must use http or https.");
  }
  if (url.protocol === "https:" && url.hostname !== "localhost") {
    fail("Config error: WEBAUTHN_ORIGIN only supports local dev origins in v0.");
  }

  return url.origin;
}

function parseLocalRpId(raw: string | undefined): string {
  const value = parseRequiredString(raw, "WEBAUTHN_RP_ID", "localhost");
  if (value !== "localhost" && value !== "127.0.0.1") {
    fail("Config error: WEBAUTHN_RP_ID must be localhost or 127.0.0.1 in v0.");
  }
  return value;
}

function assertWebAuthnLocalPair(origin: string, rpId: string): void {
  const hostname = new URL(origin).hostname;
  if (hostname !== rpId) {
    fail(
      "Config error: WEBAUTHN_ORIGIN hostname must match WEBAUTHN_RP_ID for local passkeys.",
    );
  }
}

function parseOwnerRegistrationToken(
  raw: string | undefined,
): string | undefined {
  if (raw === undefined) {
    return undefined;
  }
  const trimmed = raw.trim();

  return trimmed === "" ? undefined : trimmed;
}

function parseOptionalString(raw: string | undefined): string | undefined {
  if (raw === undefined) {
    return undefined;
  }

  const trimmed = raw.trim();
  return trimmed === "" ? undefined : trimmed;
}

function parseAdminSessionTtl(raw: string | undefined): number {
  if (raw === undefined || raw.trim() === "") {
    return 86_400;
  }
  const trimmed = raw.trim();
  if (!/^\d+$/.test(trimmed)) {
    fail("Config error: ADMIN_SESSION_TTL_SECONDS must be a positive integer.");
  }
  const value = Number(trimmed);
  if (!Number.isSafeInteger(value) || value < 60 || value > 60 * 60 * 24 * 30) {
    fail(
      "Config error: ADMIN_SESSION_TTL_SECONDS must be between 60 and 2592000.",
    );
  }
  return value;
}

function loadConfig(): AppConfig {
  const NODE_ENV = parseNodeEnv(process.env.NODE_ENV);
  const API_HOST = parseApiHost(process.env.API_HOST);
  const API_PORT = parseApiPort(process.env.API_PORT);
  const STATIC_RELEASE_DIR = parseRequiredString(
    process.env.STATIC_RELEASE_DIR,
    "STATIC_RELEASE_DIR",
    "releases/latest/public",
  );
  const STATIC_HOST = parseStaticHost(process.env.STATIC_HOST);
  const STATIC_PORT = parseStaticPort(process.env.STATIC_PORT);
  const MONGO_URI = parseMongoUri(process.env.MONGO_URI);
  const MONGO_DB_NAME = parseMongoDbName(process.env.MONGO_DB_NAME);
  const WEBAUTHN_RP_NAME = parseRequiredString(
    process.env.WEBAUTHN_RP_NAME,
    "WEBAUTHN_RP_NAME",
    "mi-log",
  );
  const WEBAUTHN_RP_ID = parseLocalRpId(process.env.WEBAUTHN_RP_ID);
  const WEBAUTHN_ORIGIN = parseLocalWebAuthnOrigin(process.env.WEBAUTHN_ORIGIN);
  assertWebAuthnLocalPair(WEBAUTHN_ORIGIN, WEBAUTHN_RP_ID);
  const ADMIN_SESSION_TTL_SECONDS = parseAdminSessionTtl(
    process.env.ADMIN_SESSION_TTL_SECONDS,
  );
  const AUTHOR_KEY_DIR = parseRequiredString(
    process.env.AUTHOR_KEY_DIR,
    "AUTHOR_KEY_DIR",
    "keys/private",
  );
  const AUTHOR_PUBLIC_KEY_PATH = parseRequiredString(
    process.env.AUTHOR_PUBLIC_KEY_PATH,
    "AUTHOR_PUBLIC_KEY_PATH",
    "keys/author.pub",
  );
  const DESKTOP_CONTROL_SECRET = parseOptionalString(
    process.env.DESKTOP_CONTROL_SECRET,
  );
  const DESKTOP_ADMIN_SOCKET_PATH = parseOptionalString(
    process.env.DESKTOP_ADMIN_SOCKET_PATH,
  );
  const OWNER_REGISTRATION_TOKEN = parseOwnerRegistrationToken(
    process.env.OWNER_REGISTRATION_TOKEN,
  );

  return Object.freeze({
    NODE_ENV,
    API_HOST,
    API_PORT,
    STATIC_RELEASE_DIR,
    STATIC_HOST,
    STATIC_PORT,
    MONGO_URI,
    MONGO_DB_NAME,
    WEBAUTHN_RP_NAME,
    WEBAUTHN_RP_ID,
    WEBAUTHN_ORIGIN,
    ADMIN_SESSION_TTL_SECONDS,
    AUTHOR_KEY_DIR,
    AUTHOR_PUBLIC_KEY_PATH,
    DESKTOP_CONTROL_SECRET,
    DESKTOP_ADMIN_SOCKET_PATH,
    OWNER_REGISTRATION_TOKEN,
    isDevelopment: NODE_ENV === "development",
    isProduction: NODE_ENV === "production",
  });
}

/** Central application configuration; validated at import time. */
export const config: AppConfig = loadConfig();
