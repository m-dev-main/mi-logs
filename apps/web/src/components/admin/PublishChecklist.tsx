import type { AdminPost } from "../../types/api";
import type { PostFormValue } from "./PostForm";

export type PublishChecklistItem = {
  label: string;
  passed: boolean;
  detail: string;
};

export type PublishChecklistSummary = {
  canPublish: boolean;
  items: PublishChecklistItem[];
};

export function buildPublishChecklist(
  value: PostFormValue,
  post: AdminPost,
  isSaved: boolean,
): PublishChecklistSummary {
  const items: PublishChecklistItem[] = [
    {
      label: "Title present",
      passed: value.title.trim().length > 0,
      detail: value.title.trim() || "Missing title",
    },
    {
      label: "Slug present",
      passed: value.slug.trim().length > 0,
      detail: value.slug.trim() || "Missing slug",
    },
    {
      label: "Excerpt present",
      passed: value.excerpt.trim().length > 0,
      detail: value.excerpt.trim() ? "Ready" : "Missing excerpt",
    },
    {
      label: "Body present",
      passed: value.bodyMarkdown.trim().length > 0,
      detail: value.bodyMarkdown.trim() ? "Ready" : "Missing markdown body",
    },
    {
      label: "Preview generated",
      passed: isSaved && post.bodyHtml.trim().length > 0,
      detail: isSaved ? "Server preview is current" : "Save to refresh preview",
    },
    {
      label: "Content hash present",
      passed: isSaved && post.contentSha256.trim().length > 0,
      detail: isSaved ? post.contentSha256 : "Save to refresh content hash",
    },
    {
      label: "Status",
      passed: post.status === "draft" || post.status === "published",
      detail: post.status,
    },
  ];

  return {
    items,
    canPublish: items.every((item) => item.passed),
  };
}

type PublishChecklistProps = {
  summary: PublishChecklistSummary;
};

export function PublishChecklist({ summary }: PublishChecklistProps) {
  return (
    <section className="publish-checklist" aria-labelledby="publish-checklist-title">
      <div className="publish-checklist__header">
        <div>
          <p className="eyebrow">Before publish</p>
          <h2 id="publish-checklist-title">Publish checklist</h2>
        </div>
        <span
          className={
            summary.canPublish
              ? "publish-checklist__state is-ready"
              : "publish-checklist__state"
          }
        >
          {summary.canPublish ? "Ready" : "Needs attention"}
        </span>
      </div>
      <ul>
        {summary.items.map((item) => (
          <li key={item.label} className={item.passed ? "is-passed" : ""}>
            <span aria-hidden="true">{item.passed ? "OK" : "NO"}</span>
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </li>
        ))}
      </ul>
    </section>
  );
}
