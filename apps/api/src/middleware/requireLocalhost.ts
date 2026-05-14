import type { NextFunction, Request, Response } from "express";
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

export function requireLocalhost(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  // Intentionally ignores X-Forwarded-For; localhost-only is the boundary here.
  const remoteAddress = req.socket.remoteAddress ?? req.ip;

  if (remoteAddress && isLoopbackAddress(remoteAddress)) {
    next();
    return;
  }

  next(
    new AppError({
      message: "Localhost access required",
      statusCode: 403,
      code: "LOCALHOST_ONLY",
      expose: true,
    }),
  );
}
