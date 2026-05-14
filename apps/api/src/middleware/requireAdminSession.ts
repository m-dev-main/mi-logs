import type { NextFunction, Request, Response } from "express";
import {
  adminSessionRequired,
  validateAdminSession,
  type ValidatedAdminSession,
} from "../domain/auth/index.js";

declare global {
  namespace Express {
    interface Request {
      adminSession?: ValidatedAdminSession;
    }
  }
}

export function requireAdminSession(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  void validateAdminSession(req)
    .then((session) => {
      if (!session) {
        next(adminSessionRequired());
        return;
      }

      req.adminSession = session;
      next();
    })
    .catch(next);
}
