import { useMemo, useState } from "react";
import { Button } from "../ui/Button";
import type { PostFormValue } from "./PostForm";

type PasteMarkdownPanelProps = {
  value: PostFormValue;
  onApply: (value: PostFormValue) => void;
};

const BLOG_FORMAT_PRETEXT = `Write this as a mi-log blog post in clean Markdown.

Return only the post body, with no chatty intro, no frontmatter, and no wrapping code fence.

Required format:
# Clear blog title

A short excerpt paragraph of 1-3 sentences. This must stand alone as the public summary.

## First section heading

Write the post in calm, readable paragraphs.

Use:
- Markdown headings with ## and ### for structure
- short paragraphs
- bullet lists only when they make the idea clearer
- fenced code blocks only for real code or commands
- blockquotes only for important quoted or reflective lines

Do not include tags, author metadata, dates, SEO fields, analytics notes, or publishing instructions.
Do not include private details, secrets, tokens, keys, local file paths, or credentials.
Keep the tone thoughtful, precise, self-owned, technical when useful, and not marketing-like.`;

function detectTitle(markdown: string): string {
  return markdown.match(/^#\s+(.+)$/m)?.[1]?.trim() ?? "";
}

function cleanMarkdownInline(value: string): string {
  return value
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\*\*([^*]+)\*\*/g, "$1")
    .replace(/\*([^*]+)\*/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .trim();
}

function detectExcerpt(markdown: string): string {
  const block = markdown
    .split(/\n{2,}/)
    .map((part) => part.trim())
    .find(
      (part) =>
        part.length > 0 &&
        !part.startsWith("#") &&
        !part.startsWith("```") &&
        !part.startsWith(">"),
    );

  return block ? cleanMarkdownInline(block).slice(0, 220) : "";
}

export function PasteMarkdownPanel({ value, onApply }: PasteMarkdownPanelProps) {
  const [markdown, setMarkdown] = useState("");
  const [useDetectedTitle, setUseDetectedTitle] = useState(true);
  const [useDetectedExcerpt, setUseDetectedExcerpt] = useState(true);
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");
  const detectedTitle = useMemo(() => detectTitle(markdown), [markdown]);
  const detectedExcerpt = useMemo(() => detectExcerpt(markdown), [markdown]);

  function applyMarkdown() {
    const nextValue: PostFormValue = {
      ...value,
      bodyMarkdown: markdown,
      title:
        useDetectedTitle && detectedTitle.length > 0
          ? detectedTitle
          : value.title,
      excerpt:
        useDetectedExcerpt && detectedExcerpt.length > 0
          ? detectedExcerpt
          : value.excerpt,
    };

    onApply(nextValue);
  }

  async function copyPretext() {
    try {
      await navigator.clipboard.writeText(BLOG_FORMAT_PRETEXT);
      setCopyState("copied");
    } catch {
      setCopyState("failed");
    }
  }

  return (
    <section className="paste-panel" aria-labelledby="paste-panel-title">
      <div className="paste-panel__header">
        <div>
          <p className="eyebrow">Paste to publish</p>
          <h2 id="paste-panel-title">Paste full markdown</h2>
        </div>
        <Button
          disabled={markdown.trim().length === 0}
          onClick={applyMarkdown}
          variant="secondary"
        >
          Apply to editor
        </Button>
      </div>

      <div className="paste-panel__pretext">
        <div>
          <p className="eyebrow">LLM pretext</p>
          <p>
            Copy this before asking an LLM to draft a post. It keeps output in
            the format this editor can parse.
          </p>
        </div>
        <Button onClick={copyPretext} variant="ghost">
          {copyState === "copied"
            ? "Copied"
            : copyState === "failed"
              ? "Copy failed"
              : "Copy pretext"}
        </Button>
        <pre>{BLOG_FORMAT_PRETEXT}</pre>
      </div>

      <textarea
        aria-label="Paste markdown"
        className="field__control field__control--textarea paste-panel__textarea"
        onChange={(event) => setMarkdown(event.target.value)}
        placeholder={"# Title\n\nFirst paragraph becomes the excerpt helper."}
        value={markdown}
      />

      <div className="paste-panel__options">
        <label>
          <input
            checked={useDetectedTitle}
            onChange={(event) => setUseDetectedTitle(event.target.checked)}
            type="checkbox"
          />
          Use first H1 as title
        </label>
        <label>
          <input
            checked={useDetectedExcerpt}
            onChange={(event) => setUseDetectedExcerpt(event.target.checked)}
            type="checkbox"
          />
          Use first paragraph as excerpt
        </label>
      </div>

      <div className="paste-panel__hints" aria-live="polite">
        <p>Detected title: {detectedTitle || "none"}</p>
        <p>Excerpt helper: {detectedExcerpt || "none"}</p>
        <p>Tags stay manual in the editor below.</p>
      </div>
    </section>
  );
}
