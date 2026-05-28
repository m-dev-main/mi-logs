import { Router, type NextFunction, type Request, type Response } from "express";
import {
  destroyCurrentSession,
  getLoginOptions,
  getRegistrationOptions,
  getSessionStatus,
  verifyLogin,
  verifyRegistration,
} from "../domain/auth/index.js";
import { requireLocalApiHost } from "../middleware/requireLocalApiHost.js";
import { requireDesktopControl } from "../middleware/requireDesktopControl.js";
import { requireLocalhost } from "../middleware/requireLocalhost.js";

const router = Router();

function asyncRoute(
  handler: (req: Request, res: Response) => Promise<void>,
): (req: Request, res: Response, next: NextFunction) => void {
  return (req, res, next) => {
    void handler(req, res).catch(next);
  };
}

router.use(requireDesktopControl);
router.use(requireLocalhost);
router.use(requireLocalApiHost);

router.post(
  "/webauthn/register/options",
  asyncRoute(async (req, res) => {
    const options = await getRegistrationOptions(req);
    res.json({ data: options });
  }),
);

router.post(
  "/webauthn/register/verify",
  asyncRoute(async (req, res) => {
    const session = await verifyRegistration(req, res);
    res.json({ data: session });
  }),
);

router.post(
  "/webauthn/login/options",
  asyncRoute(async (req, res) => {
    const options = await getLoginOptions(req);
    res.json({ data: options });
  }),
);

router.post(
  "/webauthn/login/verify",
  asyncRoute(async (req, res) => {
    const session = await verifyLogin(req, res);
    res.json({ data: session });
  }),
);

router.post(
  "/logout",
  asyncRoute(async (req, res) => {
    await destroyCurrentSession(req, res);
    res.json({ data: { ok: true } });
  }),
);

router.get(
  "/session",
  asyncRoute(async (req, res) => {
    const session = await getSessionStatus(req);
    res.json({ data: session });
  }),
);

export default router;
