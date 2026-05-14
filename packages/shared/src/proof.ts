export type ProofManifestPost = {
  slug: string;
  contentSha256: string;
  canonicalVersion: number;
  publishedAt: string;
};

export type ProofManifest = {
  project: "mi-log";
  generatedAt: string;
  version: 1;
  posts: ProofManifestPost[];
  onion: null;
  ipfsCid: null;
};

export type ProofPayload = {
  manifest: ProofManifest;
  signature: string | null;
  authorPublicKey: string | null;
  algorithm: "Ed25519";
};

export type ProofResponse = {
  data: ProofPayload;
};
