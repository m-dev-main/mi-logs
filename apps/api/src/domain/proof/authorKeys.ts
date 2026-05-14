import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import { config } from "../../config/env.js";

export const AUTHOR_PRIVATE_KEY_FILENAME = "author.key";

function resolveLocalPath(path: string): string {
  return resolve(process.env.INIT_CWD ?? process.cwd(), path);
}

export function getAuthorPrivateKeyPath(): string {
  return resolveLocalPath(`${config.AUTHOR_KEY_DIR}/${AUTHOR_PRIVATE_KEY_FILENAME}`);
}

export function getAuthorPublicKeyPath(): string {
  return resolveLocalPath(config.AUTHOR_PUBLIC_KEY_PATH);
}

export async function readAuthorPrivateKey(): Promise<string | null> {
  try {
    return await readFile(getAuthorPrivateKeyPath(), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}

export async function readAuthorPublicKey(): Promise<string | null> {
  try {
    return await readFile(getAuthorPublicKeyPath(), "utf8");
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return null;
    }
    throw error;
  }
}
