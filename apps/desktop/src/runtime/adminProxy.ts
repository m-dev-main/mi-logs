import { request as httpRequest } from "node:http";

export type DesktopAdminProxyRequest = Readonly<{
  path: string;
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  headers?: Record<string, string>;
  body?: unknown;
}>;

export type DesktopAdminProxyResponse = Readonly<{
  status: number;
  ok: boolean;
  headers: Record<string, string>;
  body: unknown;
}>;

type DesktopAdminProxyOptions = Readonly<{
  beforeRequest?: () => void;
  controlSecret: string;
  socketPath: string;
}>;

const ALLOWED_PREFIXES = ["/api/v1/auth/", "/api/v1/admin/"];

function normalizePath(path: string): string {
  if (!path.startsWith("/")) {
    throw new Error("Admin proxy path must be absolute.");
  }

  if (!ALLOWED_PREFIXES.some((prefix) => path.startsWith(prefix))) {
    throw new Error("Admin proxy only accepts auth and admin API paths.");
  }

  return path;
}

function normalizeHeaderRecord(
  headers: Record<string, string> | undefined,
): Record<string, string> {
  const normalized: Record<string, string> = {};

  for (const [key, value] of Object.entries(headers ?? {})) {
    const lower = key.toLowerCase();
    if (lower === "host" || lower === "cookie") {
      continue;
    }
    if (typeof value === "string") {
      normalized[key] = value;
    }
  }

  return normalized;
}

function parseCookiePair(header: string): [string, string] | null {
  const [pair] = header.split(";");
  const equals = pair.indexOf("=");
  if (equals <= 0) {
    return null;
  }

  return [pair.slice(0, equals), pair.slice(equals + 1)];
}

function parseJsonBody(text: string): unknown {
  if (text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

export class DesktopAdminProxy {
  private readonly beforeRequest: (() => void) | undefined;
  private readonly controlSecret: string;
  private readonly socketPath: string;
  private readonly cookies = new Map<string, string>();

  constructor(options: DesktopAdminProxyOptions) {
    this.beforeRequest = options.beforeRequest;
    this.controlSecret = options.controlSecret;
    this.socketPath = options.socketPath;
  }

  async request(
    input: DesktopAdminProxyRequest,
  ): Promise<DesktopAdminProxyResponse> {
    this.beforeRequest?.();

    const path = normalizePath(input.path);
    const method = input.method ?? "GET";
    const serializedBody =
      input.body === undefined ? undefined : JSON.stringify(input.body);
    const headers = normalizeHeaderRecord(input.headers);

    if (serializedBody !== undefined && !headers["Content-Type"]) {
      headers["Content-Type"] = "application/json";
    }

    if (serializedBody !== undefined) {
      headers["Content-Length"] = String(Buffer.byteLength(serializedBody));
    }

    headers["Host"] = "localhost";
    headers["X-MI-LOG-DESKTOP-CONTROL"] = this.controlSecret;

    const cookieHeader = this.cookieHeader();
    if (cookieHeader) {
      headers["Cookie"] = cookieHeader;
    }

    return await new Promise<DesktopAdminProxyResponse>((resolve, reject) => {
      const req = httpRequest(
        {
          headers,
          method,
          path,
          socketPath: this.socketPath,
        },
        (res) => {
          const chunks: Buffer[] = [];

          res.on("data", (chunk: Buffer) => {
            chunks.push(chunk);
          });

          res.on("end", () => {
            this.captureCookies(res.headers["set-cookie"]);
            const rawBody = Buffer.concat(chunks).toString("utf8");
            const responseHeaders = this.responseHeaders(res.headers);

            resolve({
              status: res.statusCode ?? 0,
              ok: Boolean(res.statusCode && res.statusCode >= 200 && res.statusCode < 300),
              headers: responseHeaders,
              body: parseJsonBody(rawBody),
            });
          });
        },
      );

      req.on("error", reject);

      if (serializedBody !== undefined) {
        req.write(serializedBody);
      }

      req.end();
    });
  }

  private cookieHeader(): string | null {
    if (this.cookies.size === 0) {
      return null;
    }

    return [...this.cookies.entries()]
      .map(([name, value]) => `${name}=${value}`)
      .join("; ");
  }

  private captureCookies(setCookie: string[] | undefined): void {
    if (!setCookie) {
      return;
    }

    for (const header of setCookie) {
      const parsed = parseCookiePair(header);
      if (!parsed) {
        continue;
      }

      const [name, value] = parsed;
      if (value === "") {
        this.cookies.delete(name);
      } else {
        this.cookies.set(name, value);
      }
    }
  }

  private responseHeaders(
    headers: Record<string, string | string[] | undefined>,
  ): Record<string, string> {
    const normalized: Record<string, string> = {};

    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase() === "set-cookie" || value === undefined) {
        continue;
      }

      normalized[key] = Array.isArray(value) ? value.join(", ") : value;
    }

    return normalized;
  }
}
