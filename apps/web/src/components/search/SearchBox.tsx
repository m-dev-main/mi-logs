import type { FormEvent } from "react";

type SearchBoxProps = {
  query: string;
  tag: string;
  tags: string[];
  onQueryChange: (query: string) => void;
  onTagChange: (tag: string) => void;
};

export function SearchBox({
  query,
  tag,
  tags,
  onQueryChange,
  onTagChange,
}: SearchBoxProps) {
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
  }

  return (
    <form className="search-box" role="search" onSubmit={handleSubmit}>
      <label className="field search-box__query" htmlFor="public-search-query">
        <span className="field__label">Search published posts</span>
        <input
          autoComplete="off"
          className="field__control"
          id="public-search-query"
          name="q"
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search title, excerpt, tags, and public body text"
          type="search"
          value={query}
        />
      </label>

      <label className="field search-box__tag" htmlFor="public-search-tag">
        <span className="field__label">Tag filter</span>
        <select
          className="field__control"
          id="public-search-tag"
          name="tag"
          onChange={(event) => onTagChange(event.target.value)}
          value={tag}
        >
          <option value="">All tags</option>
          {tags.map((tagName) => (
            <option key={tagName} value={tagName}>
              {tagName}
            </option>
          ))}
        </select>
      </label>
    </form>
  );
}
