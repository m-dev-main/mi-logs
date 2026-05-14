import { constants, mkdir, writeFile } from "node:fs/promises";
import { access } from "node:fs/promises";
import { generateKeyPairSync } from "node:crypto";
import { dirname } from "node:path";
import {
  getAuthorPrivateKeyPath,
  getAuthorPublicKeyPath,
} from "../domain/proof/authorKeys.js";

async function exists(path: string): Promise<boolean> {
  try {
    await access(path, constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

const privateKeyPath = getAuthorPrivateKeyPath();
const publicKeyPath = getAuthorPublicKeyPath();
const overwrite = process.env.MI_LOG_OVERWRITE_AUTHOR_KEY === "true";

if ((await exists(privateKeyPath)) && !overwrite) {
  console.error(
    "[mi-log-api] Author private key already exists; set MI_LOG_OVERWRITE_AUTHOR_KEY=true to overwrite.",
  );
  process.exit(1);
}

const { privateKey, publicKey } = generateKeyPairSync("ed25519");
const privateKeyPem = privateKey.export({ format: "pem", type: "pkcs8" });
const publicKeyPem = publicKey.export({ format: "pem", type: "spki" });

await mkdir(dirname(privateKeyPath), { recursive: true, mode: 0o700 });
await mkdir(dirname(publicKeyPath), { recursive: true, mode: 0o755 });
await writeFile(privateKeyPath, privateKeyPem, { mode: 0o600, flag: "w" });
await writeFile(publicKeyPath, publicKeyPem, { mode: 0o644, flag: "w" });

console.log(`[mi-log-api] Author private key written: ${privateKeyPath}`);
console.log(`[mi-log-api] Author public key written: ${publicKeyPath}`);
