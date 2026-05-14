import express, { type Request, type Response } from "express";
import { securityHeaders } from "../middleware/securityHeaders.js";

const STATIC_404_BODY = "Not found\n";

function sendStaticNotFound(_req: Request, res: Response): void {
  res.status(404).type("text/plain").send(STATIC_404_BODY);
}

export function createStaticServer(staticReleaseDir: string) {
  const app = express();
  app.disable("x-powered-by");
  app.use(securityHeaders);

  app.use(["/api", "/admin"], sendStaticNotFound);
  app.use(
    express.static(staticReleaseDir, {
      dotfiles: "ignore",
      fallthrough: true,
      index: "index.html",
    }),
  );

  app.get("*", (req, res) => {
    if (req.method !== "GET" && req.method !== "HEAD") {
      sendStaticNotFound(req, res);
      return;
    }

    res.sendFile("index.html", { root: staticReleaseDir });
  });

  return app;
}
