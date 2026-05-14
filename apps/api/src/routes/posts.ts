import { Router, type NextFunction, type Request, type Response } from "express";
import {
  getPublicPostBySlug,
  listPublicPosts,
} from "../domain/posts/index.js";

const router = Router();

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    void handler(req, res).catch(next);
  };
}

router.get(
  "/",
  asyncRoute(async (req, res) => {
    const result = await listPublicPosts(req.query);
    res.json(result);
  }),
);

router.get(
  "/:slug",
  asyncRoute(async (req, res) => {
    const post = await getPublicPostBySlug(req.params.slug);
    res.json({ data: post });
  }),
);

export default router;
