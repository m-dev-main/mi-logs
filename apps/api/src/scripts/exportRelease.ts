import { ensureMongoIndexes } from "../db/indexes.js";
import { closeMongo, connectMongo } from "../db/mongo.js";
import { exportRelease } from "../domain/proof/exportRelease.js";

try {
  await connectMongo();
  await ensureMongoIndexes();

  const result = await exportRelease();

  console.log(`[mi-log-api] release path: ${result.releasePath}`);
  console.log(`[mi-log-api] published posts: ${result.publishedPostCount}`);
  console.log(`[mi-log-api] signed: ${result.signed ? "true" : "false"}`);
} catch {
  console.error("[mi-log-api] export:release failed");
  process.exitCode = 1;
} finally {
  await closeMongo();
}
