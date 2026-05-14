import type { NextFunction, Request, Response } from "express";
import { CSRF_HEADER_NAME, assertValidCsrfToken } from "../domain/auth/index.js";
import { adminSessionRequired } from "../domain/auth/sessionService.js";

export function requireCsrf(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  try {
    const session = req.adminSession;
    if (!session) {
      throw adminSessionRequired();
    }

    const rawHeader = req.headers[CSRF_HEADER_NAME];
    const submittedToken = Array.isArray(rawHeader) ? rawHeader[0] : rawHeader;
    assertValidCsrfToken(session.csrfTokenHash, submittedToken);
    next();
  } catch (error) {
    next(error);
  }
}
