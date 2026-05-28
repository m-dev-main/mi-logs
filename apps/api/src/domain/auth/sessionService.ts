import type { Request, Response } from "express";
import { parse, serialize } from "cookie";
import { config } from "../../config/env.js";
import { AppError } from "../../errors/AppError.js";
import { createOpaqueToken, hashToken, safeTokenEquals } from "./csrf.js";
import {
  createAdminSession,
  deleteAdminSessionByHash,
  findAdminSessionByHash,
  rotateAdminSessionCsrf,
  touchAdminSession,
} from "./sessionRepository.js";

export const ADMIN_SESSION_COOKIE_NAME = "mi_log_admin_session";
export const DESKTOP_CONTROL_CSRF_TOKEN = "desktop-control";
const DESKTOP_CONTROL_SESSION_ID_HASH = "desktop-control-session";

export type AdminSessionView = {
  authenticated: true;
  registered: true;
  csrfToken: string;
  expiresAt: string;
};

export type AdminSessionStatus =
  | AdminSessionView
  | {
      authenticated: false;
      registered: boolean;
      csrfToken: null;
      expiresAt: null;
    };

export type ValidatedAdminSession = {
  sessionIdHash: string;
  csrfTokenHash: string;
  expiresAt: Date;
};

export function createDesktopControlSession(): ValidatedAdminSession {
  return {
    sessionIdHash: DESKTOP_CONTROL_SESSION_ID_HASH,
    csrfTokenHash: hashToken(DESKTOP_CONTROL_CSRF_TOKEN),
    expiresAt: new Date(Date.now() + config.ADMIN_SESSION_TTL_SECONDS * 1000),
  };
}

export function createDesktopControlSessionView(): AdminSessionView {
  return {
    authenticated: true,
    registered: true,
    csrfToken: DESKTOP_CONTROL_CSRF_TOKEN,
    expiresAt: new Date(
      Date.now() + config.ADMIN_SESSION_TTL_SECONDS * 1000,
    ).toISOString(),
  };
}

function sessionCookieOptions(maxAgeSeconds: number) {
  return {
    httpOnly: true,
    sameSite: "strict" as const,
    secure: false,
    path: "/",
    maxAge: maxAgeSeconds,
  };
}

export function readRawSessionCookie(req: Request): string | null {
  const header = req.headers.cookie;
  if (!header) {
    return null;
  }

  const cookies = parse(header);
  const value = cookies[ADMIN_SESSION_COOKIE_NAME];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function setAdminSessionCookie(res: Response, sessionId: string): void {
  res.setHeader(
    "Set-Cookie",
    serialize(
      ADMIN_SESSION_COOKIE_NAME,
      sessionId,
      sessionCookieOptions(config.ADMIN_SESSION_TTL_SECONDS),
    ),
  );
}

export function clearAdminSessionCookie(res: Response): void {
  res.setHeader(
    "Set-Cookie",
    serialize(ADMIN_SESSION_COOKIE_NAME, "", {
      ...sessionCookieOptions(0),
      expires: new Date(0),
    }),
  );
}

export async function createLoggedInSession(res: Response): Promise<{
  csrfToken: string;
  expiresAt: Date;
}> {
  const sessionId = createOpaqueToken();
  const csrfToken = createOpaqueToken();
  const expiresAt = new Date(
    Date.now() + config.ADMIN_SESSION_TTL_SECONDS * 1000,
  );

  await createAdminSession({
    sessionIdHash: hashToken(sessionId),
    csrfTokenHash: hashToken(csrfToken),
    expiresAt,
  });

  setAdminSessionCookie(res, sessionId);
  return { csrfToken, expiresAt };
}

export async function validateAdminSession(
  req: Request,
): Promise<ValidatedAdminSession | null> {
  const rawSessionId = readRawSessionCookie(req);
  if (!rawSessionId) {
    return null;
  }

  const sessionIdHash = hashToken(rawSessionId);
  const session = await findAdminSessionByHash(sessionIdHash);
  if (!session) {
    return null;
  }

  if (session.expiresAt.getTime() <= Date.now()) {
    await deleteAdminSessionByHash(sessionIdHash);
    return null;
  }

  await touchAdminSession(sessionIdHash);

  return {
    sessionIdHash,
    csrfTokenHash: session.csrfTokenHash,
    expiresAt: session.expiresAt,
  };
}

export async function destroyCurrentSession(
  req: Request,
  res: Response,
): Promise<void> {
  const rawSessionId = readRawSessionCookie(req);
  if (rawSessionId) {
    await deleteAdminSessionByHash(hashToken(rawSessionId));
  }
  clearAdminSessionCookie(res);
}

export async function rotateCsrfTokenForSession(
  sessionIdHash: string,
): Promise<string> {
  const csrfToken = createOpaqueToken();
  await rotateAdminSessionCsrf({
    sessionIdHash,
    csrfTokenHash: hashToken(csrfToken),
  });
  return csrfToken;
}

export function adminSessionRequired(): AppError {
  return new AppError({
    message: "Admin session required",
    statusCode: 401,
    code: "ADMIN_SESSION_REQUIRED",
    expose: true,
  });
}

export function assertValidCsrfToken(
  csrfTokenHash: string,
  submittedToken: string | undefined,
): void {
  if (!submittedToken) {
    throw new AppError({
      message: "CSRF token required",
      statusCode: 403,
      code: "CSRF_REQUIRED",
      expose: true,
    });
  }

  if (!safeTokenEquals(csrfTokenHash, hashToken(submittedToken))) {
    throw new AppError({
      message: "Invalid CSRF token",
      statusCode: 403,
      code: "CSRF_INVALID",
      expose: true,
    });
  }
}
