import type { NextFunction, Request, Response } from "express";
import { AppError } from "../errors/AppError.js";

/** Host header values acceptable for localhost-only API routes (RFC 9236-style parsing). */
const ALLOWED_HOSTNAMES = new Set(["127.0.0.1", "localhost", "::1"]);

export function hostnameFromHostHeader(raw: string | undefined): string | null {
  if (raw === undefined) {
    return null;
  }

  const trimmed = raw.trim();

  if (trimmed.startsWith("[")) {
    const closing = trimmed.indexOf("]");
    if (closing === -1) {
      return null;
    }

    const inside = trimmed.slice(1, closing).trim().toLowerCase();

    const rest = trimmed.slice(closing + 1);

    if (rest === "") {
      return inside === "" ? null : inside;
    }

    if (!rest.startsWith(":")) {
      return null;
    }

    const portDigits = rest.slice(1);

    if (portDigits === "" || !/^\d+$/.test(portDigits)) {
      return null;
    }

    return inside === "" ? null : inside;
  }

  const firstColon = trimmed.indexOf(":");

  if (firstColon === -1) {
    const host = trimmed.toLowerCase();

    return host === "" ? null : host;
  }

  const hostPart = trimmed.slice(0, firstColon);

  const portPart = trimmed.slice(firstColon + 1);
  if (portPart === "" || !/^\d+$/.test(portPart)) {
    return null;
  }

  const host = hostPart.toLowerCase();

  return host === "" ? null : host;
}

export function requireLocalApiHost(req: Request, _res: Response, next: NextFunction): void {
  const hostname = hostnameFromHostHeader(req.headers.host);

  if (!hostname || !ALLOWED_HOSTNAMES.has(hostname)) {
    next(
      new AppError({
        message: "This route must be accessed with Host 127.0.0.1 or localhost.",
        statusCode: 403,
        code: "LOCAL_API_HOST_REQUIRED",
        expose: true,
      }),
    );
    return;
  }

  next();
}
