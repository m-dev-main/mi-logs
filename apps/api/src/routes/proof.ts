import { Router, type NextFunction, type Request, type Response } from "express";
import { getProofPayload } from "../domain/proof/index.js";

const router = Router();

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (_req, res, next) => {
    void handler(_req, res).catch(next);
  };
}

router.get(
  "/",
  asyncRoute(async (_req, res) => {
    const proof = await getProofPayload();
    res.json({ data: proof });
  }),
);

export default router;
