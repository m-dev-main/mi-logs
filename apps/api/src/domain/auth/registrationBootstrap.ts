import { timingSafeEqual } from "node:crypto";
import type { Request } from "express";
import { config } from "../../config/env.js";
import { AppError } from "../../errors/AppError.js";

export function bearerTokenFromAuthorization(req: Request): string | null {
  const raw = req.headers.authorization;

  if (typeof raw !== "string") {
    return null;
  }

  const match = /^Bearer\s+([\s\S]+)$/i.exec(raw.trim());

  if (!match?.[1]) {
    return null;
  }

  const token = match[1].trim();

  return token.length > 0 ? token : null;
}

/** First-time owner passkey registration requires a server-side secret plus matching Bearer header. */
export function assertOwnerRegistrationBootstrap(req: Request): void {
  const expected = config.OWNER_REGISTRATION_TOKEN;
  const submitted = bearerTokenFromAuthorization(req);

  if (!expected || expected.length === 0) {
    throw new AppError({
      statusCode: 503,
      code: "OWNER_REGISTRATION_TOKEN_MISSING",
      message:
        "First-time registration is disabled until OWNER_REGISTRATION_TOKEN is set in the API environment. Use a strong random string (never commit it). Restart the API, then retry with Authorization: Bearer <token>.",
      expose: true,
    });
  }

  if (
    submitted === null ||
    submitted.length !== expected.length ||
    !timingSafeEqual(Buffer.from(submitted, "utf8"), Buffer.from(expected, "utf8"))
  ) {
    throw new AppError({
      statusCode: 403,
      code: "OWNER_REGISTRATION_SECRET_INVALID",
      message:
        "Provide Authorization: Bearer with the OWNER_REGISTRATION_TOKEN value from your local server environment.",
      expose: true,
    });
  }
}
