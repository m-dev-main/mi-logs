import { Router, type NextFunction, type Request, type Response } from "express";
import {
  createDraft,
  deleteAdminPost,
  getAdminPost,
  listAdminPosts,
  publishAdminPost,
  unpublishAdminPost,
  updatePost,
} from "../domain/posts/index.js";
import { requireAdminSession } from "../middleware/requireAdminSession.js";
import { requireCsrf } from "../middleware/requireCsrf.js";
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

router.use(requireLocalhost);
router.use(requireLocalApiHost);
router.use(requireAdminSession);

router.get(
  "/",
  asyncRoute(async (_req, res) => {
    const posts = await listAdminPosts();
    res.json({ data: posts });
  }),
);

router.get(
  "/:id",
  asyncRoute(async (req, res) => {
    const post = await getAdminPost(req.params.id);
    res.json({ data: post });
  }),
);

router.post(
  "/",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const post = await createDraft(req.body);
    res.status(201).json({ data: post });
  }),
);

router.patch(
  "/:id",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const post = await updatePost(req.params.id, req.body);
    res.json({ data: post });
  }),
);

router.post(
  "/:id/publish",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const post = await publishAdminPost(req.params.id);
    res.json({ data: post });
  }),
);

router.post(
  "/:id/unpublish",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const post = await unpublishAdminPost(req.params.id);
    res.json({ data: post });
  }),
);

router.delete(
  "/:id",
  requireCsrf,
  asyncRoute(async (req, res) => {
    const result = await deleteAdminPost(req.params.id);
    res.json({ data: result });
  }),
);

export default router;
