import { marked } from "marked";
import sanitizeHtml from "sanitize-html";

const allowedTags = [
  "p",
  "h1",
  "h2",
  "h3",
  "h4",
  "h5",
  "h6",
  "strong",
  "em",
  "blockquote",
  "ul",
  "ol",
  "li",
  "code",
  "pre",
  "a",
  "hr",
  "br",
];

export function renderMarkdownToHtml(markdown: string): string {
  const rawHtml = marked.parse(markdown, {
    async: false,
    gfm: true,
    breaks: false,
  });

  if (typeof rawHtml !== "string") {
    throw new Error("Markdown rendering unexpectedly returned async output");
  }

  return sanitizeHtml(rawHtml, {
    allowedTags,
    allowedAttributes: {
      a: ["href", "title"],
    },
    allowedSchemes: ["http", "https", "mailto"],
    allowProtocolRelative: false,
    disallowedTagsMode: "discard",
  });
}
