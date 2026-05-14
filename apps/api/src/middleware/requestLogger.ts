import type { NextFunction, Request, Response } from "express";

/**
 * One line per finished response. Captures method/path at entry (before Express
 * mutates req.url for mounted routers). Never uses originalUrl or query strings.
 */
export function requestLogger(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const method = req.method;
  const path = req.path;
  const start = performance.now();

  res.on("finish", () => {
    const durationMs = Math.round(performance.now() - start);
    console.log(
      `[mi-log-api] ${method} ${path} ${res.statusCode} ${durationMs}ms`,
    );
  });

  next();
}
