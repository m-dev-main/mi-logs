import { createHash } from "node:crypto";

export type ContentHashInput = {
  title: string;
  excerpt: string;
  bodyMarkdown: string;
};

export function computeContentSha256(input: ContentHashInput): string {
  const normalizedInput = `${input.title}\n${input.excerpt}\n${input.bodyMarkdown}`;

  return createHash("sha256").update(normalizedInput, "utf8").digest("hex");
}
