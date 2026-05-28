import { Router, type NextFunction, type Request, type Response } from "express";
import { AppError } from "../errors/AppError.js";
import { exportRelease } from "../domain/proof/exportRelease.js";
import { requireAdminSession } from "../middleware/requireAdminSession.js";
import { requireCsrf } from "../middleware/requireCsrf.js";
import { requireDesktopControl } from "../middleware/requireDesktopControl.js";
import { requireLocalApiHost } from "../middleware/requireLocalApiHost.js";
import { requireLocalhost } from "../middleware/requireLocalhost.js";

const router = Router();

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    void handler(req, res).catch(next);
  };
}

function mapExportReleaseFailure(err: unknown): never {
  if (!(err instanceof Error)) {
    throw err;
  }

  const message = err.message;

  if (message.includes("Web build output not found")) {
    throw new AppError({
      message:
        "Web build output not found. Run `pnpm build:web` from the repository root, then export again.",
      statusCode: 400,
      code: "RELEASE_WEB_BUILD_MISSING",
      expose: true,
    });
  }

  if (message.includes("Could not locate repository root")) {
    throw new AppError({
      message: "Could not locate repository root (pnpm-workspace.yaml).",
      statusCode: 500,
      code: "RELEASE_REPO_ROOT_NOT_FOUND",
      expose: true,
    });
  }

  throw err;
}

router.use(requireDesktopControl);
router.use(requireLocalhost);
router.use(requireLocalApiHost);
router.use(requireAdminSession);

router.post(
  "/export",
  requireCsrf,
  asyncRoute(async (_req, res) => {
    try {
      const result = await exportRelease();
      res.json({ data: result });
    } catch (err) {
      throw mapExportReleaseFailure(err);
    }
  }),
);

export default router;
