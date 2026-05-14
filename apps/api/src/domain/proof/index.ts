import type { ProofPayload } from "@mi-log/shared";
import { readAuthorPrivateKey, readAuthorPublicKey } from "./authorKeys.js";
import { generateProofManifest } from "./manifest.js";
import { signCanonicalJson } from "./signing.js";

export async function getProofPayload(): Promise<ProofPayload> {
  const manifest = await generateProofManifest();
  const [privateKey, publicKey] = await Promise.all([
    readAuthorPrivateKey(),
    readAuthorPublicKey(),
  ]);

  return {
    manifest,
    signature: privateKey ? signCanonicalJson(manifest, privateKey) : null,
    authorPublicKey: publicKey,
    algorithm: "Ed25519",
  };
}

export { canonicalJson, signCanonicalJson } from "./signing.js";
