import { AppError } from "../../errors/AppError.js";

export function normalizeSlug(input: string): string {
  const slug = input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  if (slug.length === 0) {
    throw new AppError({
      message: "Slug cannot be empty",
      statusCode: 400,
      code: "INVALID_SLUG",
      expose: true,
    });
  }

  return slug;
}
