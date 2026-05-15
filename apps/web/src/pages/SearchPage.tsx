import { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { SearchBox } from "../components/search/SearchBox";
import { SearchEmptyState } from "../components/search/SearchEmptyState";
import { SearchResults } from "../components/search/SearchResults";
import { useSearch } from "../hooks/useSearch";

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [query, setQuery] = useState(() => searchParams.get("q") ?? "");
  const [tag, setTag] = useState(() => searchParams.get("tag") ?? "");
  const { status, posts, total, tags, error, isDebouncing } = useSearch({
    query,
    tag,
  });

  useEffect(() => {
    const nextParams = new URLSearchParams();
    const trimmedQuery = query.trim();
    const trimmedTag = tag.trim();

    if (trimmedQuery) {
      nextParams.set("q", trimmedQuery);
    }
    if (trimmedTag) {
      nextParams.set("tag", trimmedTag);
    }

    setSearchParams(nextParams, { replace: true });
  }, [query, setSearchParams, tag]);

  return (
    <div className="page-stack">
      <section className="hero-panel search-hero" aria-labelledby="search-title">
        <div>
          <p className="eyebrow">Public search</p>
          <h1 id="search-title">Find published notes</h1>
          <p className="hero-panel__lede">
            Search stays local to the MongoDB public API in dynamic mode and uses
            the exported readonly post data in static release mode.
          </p>
        </div>
      </section>

      <SearchBox
        onQueryChange={setQuery}
        onTagChange={setTag}
        query={query}
        tag={tag}
        tags={tags}
      />

      <div className="search-status" aria-live="polite">
        {status === "loading" || isDebouncing
          ? "Searching published posts..."
          : `${total} ${total === 1 ? "result" : "results"}`}
      </div>

      {status === "error" ? (
        <div className="error-state" role="alert">
          {error}
        </div>
      ) : posts.length > 0 ? (
        <SearchResults posts={posts} />
      ) : status === "loading" ? null : (
        <SearchEmptyState query={query} tag={tag} />
      )}
    </div>
  );
}
