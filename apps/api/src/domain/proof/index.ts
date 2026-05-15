import type { ProofPayload } from "@mi-log/shared";
import { readAuthorPublicKey } from "./authorKeys.js";
import { generateProofManifest } from "./manifest.js";

/**
 * Proof data for anonymous readers: manifest + optional public key only.
 * Does not read the author private key or produce live signatures (signatures
 * ship with `pnpm release` static artifacts).
 */
export async function getProofPayload(): Promise<ProofPayload> {
  const manifest = await generateProofManifest();
  const publicKey = await readAuthorPublicKey();

  return {
    manifest,
    signature: null,
    authorPublicKey: publicKey,
    algorithm: "Ed25519",
  };
}

export { canonicalJson, signCanonicalJson } from "./signing.js";
