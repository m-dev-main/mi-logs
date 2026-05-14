import { Router } from "express";
import { getMongoHealth } from "../db/mongo.js";
import { AppError } from "../errors/AppError.js";

const router = Router();

router.get("/", (req, res) => {
  if (req.query.fail === "1") {
    throw new AppError({
      statusCode: 418,
      code: "STATUS_TEST_ERROR",
      message: "Intentional test error",
      expose: true,
    });
  }
  res.json({
    app: "mi-log-api",
    status: "ok",
    mongo: getMongoHealth(),
  });
});

export default router;
