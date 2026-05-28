import type { NextFunction, Request, Response } from "express";
import { config } from "../config/env.js";
import { safeTokenEquals } from "../domain/auth/csrf.js";
import { AppError } from "../errors/AppError.js";

export const DESKTOP_CONTROL_HEADER = "x-mi-log-desktop-control";

declare global {
  namespace Express {
    interface Request {
      desktopControl?: boolean;
    }
  }
}

function headerValue(req: Request): string | null {
  const value = req.headers[DESKTOP_CONTROL_HEADER];
  return typeof value === "string" && value.length > 0 ? value : null;
}

export function desktopControlConfigured(): boolean {
  return typeof config.DESKTOP_CONTROL_SECRET === "string";
}

export function isDesktopControlRequest(req: Request): boolean {
  const expected = config.DESKTOP_CONTROL_SECRET;
  const submitted = headerValue(req);

  return (
    typeof expected === "string" &&
    typeof submitted === "string" &&
    safeTokenEquals(submitted, expected)
  );
}

export function requireDesktopControl(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  if (!desktopControlConfigured()) {
    next();
    return;
  }

  if (!isDesktopControlRequest(req)) {
    next(
      new AppError({
        message: "Desktop control channel required",
        statusCode: 403,
        code: "DESKTOP_CONTROL_REQUIRED",
        expose: true,
      }),
    );
    return;
  }

  req.desktopControl = true;
  next();
}

