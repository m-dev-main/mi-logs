import type { NextFunction, Request, Response } from "express";
import { config } from "../config/env.js";
import { AppError } from "../errors/AppError.js";

const LOCALHOST_ADDRESSES = new Set([
  "127.0.0.1",
  "::1",
  "::ffff:127.0.0.1",
  "localhost",
]);

function stripIpv6Zone(address: string): string {
  const zoneIndex = address.indexOf("%");
  return zoneIndex === -1 ? address : address.slice(0, zoneIndex);
}

function isLoopbackAddress(address: string): boolean {
  const normalized = stripIpv6Zone(address.trim().toLowerCase());

  if (LOCALHOST_ADDRESSES.has(normalized)) {
    return true;
  }

  return normalized.startsWith("127.");
}

function canonicalHostHeader(raw: string): string {
  return raw.trim().toLowerCase();
}

function expandLoopbackHostPortVariants(hostname: string, port: string): string[] {
  const h = hostname.trim().toLowerCase();
  const variants = new Set<string>();
  variants.add(`${h}:${port}`);
  if (h === "localhost") {
    variants.add(`127.0.0.1:${port}`);
  }
  if (h === "127.0.0.1") {
    variants.add(`localhost:${port}`);
  }
  return [...variants];
}

function defaultPortForUrlProtocol(protocol: string): string {
  if (protocol === "https:") {
    return "443";
  }
  if (protocol === "http:") {
    return "80";
  }
  return "";
}

function buildAllowedAdminHosts(): ReadonlySet<string> {
  const allowed = new Set<string>();
  const apiPort = String(config.API_PORT);

  for (const host of ["127.0.0.1", "localhost", "[::1]"]) {
    allowed.add(`${host}:${apiPort}`);
  }

  const originUrl = new URL(config.WEBAUTHN_ORIGIN);
  const originPort =
    originUrl.port || defaultPortForUrlProtocol(originUrl.protocol);
  if (originPort !== "") {
    for (const hostPort of expandLoopbackHostPortVariants(
      originUrl.hostname,
      originPort,
    )) {
      allowed.add(hostPort);
    }
  }

  const bind = config.API_HOST.trim().toLowerCase();
  if (
    bind !== "" &&
    bind !== "127.0.0.1" &&
    bind !== "localhost" &&
    bind !== "::1" &&
    bind !== "[::1]"
  ) {
    allowed.add(`${bind}:${apiPort}`);
  }

  return allowed;
}

const ALLOWED_ADMIN_HOSTS = buildAllowedAdminHosts();

export function requireLocalhost(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  // Intentionally ignores X-Forwarded-For; localhost-only is the boundary here.
  const remoteAddress = req.socket.remoteAddress ?? req.ip;

  if (!remoteAddress || !isLoopbackAddress(remoteAddress)) {
    next(
      new AppError({
        message: "Localhost access required",
        statusCode: 403,
        code: "LOCALHOST_ONLY",
        expose: true,
      }),
    );
    return;
  }

  const rawHost = req.headers.host;
  if (typeof rawHost !== "string" || rawHost.length === 0) {
    next(
      new AppError({
        message: "A local Host header is required for admin and auth routes",
        statusCode: 403,
        code: "LOCAL_ADMIN_HOST_REQUIRED",
        expose: true,
      }),
    );
    return;
  }

  if (!ALLOWED_ADMIN_HOSTS.has(canonicalHostHeader(rawHost))) {
    next(
      new AppError({
        message:
          "Admin and auth routes must be requested with a direct local API or dev-server Host",
        statusCode: 403,
        code: "LOCAL_ADMIN_HOST_REQUIRED",
        expose: true,
      }),
    );
    return;
  }

  next();
}
