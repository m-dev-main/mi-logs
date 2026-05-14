import type { FormEvent } from "react";
import { Input } from "../ui/Input";
import { Textarea } from "../ui/Textarea";

export type PostFormValue = {
  title: string;
  slug: string;
  excerpt: string;
  bodyMarkdown: string;
  tagsCsv: string;
};

type PostFormProps = {
  value: PostFormValue;
  onChange: (value: PostFormValue) => void;
  onSubmit: () => void;
  isSaving: boolean;
};

export function tagsCsvToArray(tagsCsv: string): string[] {
  return tagsCsv
    .split(",")
    .map((tag) => tag.trim())
    .filter((tag) => tag.length > 0);
}

export function tagsArrayToCsv(tags: string[]): string {
  return tags.join(", ");
}

export function PostForm({
  value,
  onChange,
  onSubmit,
  isSaving,
}: PostFormProps) {
  function updateField(field: keyof PostFormValue, nextValue: string) {
    onChange({ ...value, [field]: nextValue });
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    onSubmit();
  }

  return (
    <form className="post-form" onSubmit={handleSubmit}>
      <Input
        label="Title"
        name="title"
        onChange={(event) => updateField("title", event.target.value)}
        required
        value={value.title}
      />
      <Input
        helpText="Leave lowercase and hyphenated; the API normalizes on save."
        label="Slug"
        name="slug"
        onChange={(event) => updateField("slug", event.target.value)}
        value={value.slug}
      />
      <Textarea
        label="Excerpt"
        name="excerpt"
        onChange={(event) => updateField("excerpt", event.target.value)}
        rows={3}
        value={value.excerpt}
      />
      <Textarea
        className="post-form__markdown"
        helpText="Markdown is rendered and sanitized by the local API."
        label="Body markdown"
        name="bodyMarkdown"
        onChange={(event) => updateField("bodyMarkdown", event.target.value)}
        rows={18}
        value={value.bodyMarkdown}
      />
      <Input
        helpText="Separate tags with commas."
        label="Tags"
        name="tags"
        onChange={(event) => updateField("tagsCsv", event.target.value)}
        value={value.tagsCsv}
      />
      <button className="sr-only" disabled={isSaving} type="submit">
        Save post
      </button>
    </form>
  );
}
