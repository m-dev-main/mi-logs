import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const CSRF_HEADER_NAME = "x-mi-log-csrf";

export function createOpaqueToken(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token, "utf8").digest("base64url");
}

export function safeTokenEquals(a: string, b: string): boolean {
  const left = Buffer.from(a, "utf8");
  const right = Buffer.from(b, "utf8");

  if (left.byteLength !== right.byteLength) {
    return false;
  }

  return timingSafeEqual(left, right);
}
