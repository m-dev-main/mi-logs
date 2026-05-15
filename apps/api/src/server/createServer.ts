import express from "express";
import { errorHandler } from "../errors/errorHandler.js";
import { notFoundHandler } from "../errors/notFoundHandler.js";
import { requestLogger } from "../middleware/requestLogger.js";
import { securityHeaders } from "../middleware/securityHeaders.js";
import adminPostsRouter from "../routes/adminPosts.js";
import adminReleaseRouter from "../routes/adminRelease.js";
import authRouter from "../routes/auth.js";
import healthRouter from "../routes/health.js";
import postsRouter from "../routes/posts.js";
import proofRouter from "../routes/proof.js";
import statusRouter from "../routes/status.js";

export function createServer() {
  const app = express();
  app.disable("x-powered-by");
  app.use(securityHeaders);
  app.use(requestLogger);
  app.use(express.json({ limit: "100kb" }));
  app.use("/health", healthRouter);
  app.use("/api/v1/status", statusRouter);
  app.use("/api/v1/auth", authRouter);
  app.use("/api/v1/admin/posts", adminPostsRouter);
  app.use("/api/v1/admin/release", adminReleaseRouter);
  app.use("/api/v1/posts", postsRouter);
  app.use("/api/v1/proof", proofRouter);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}
