type SearchEmptyStateProps = {
  query: string;
  tag: string;
};

export function SearchEmptyState({ query, tag }: SearchEmptyStateProps) {
  const hasFilters = query.trim().length > 0 || tag.trim().length > 0;

  return (
    <div className="empty-state search-empty-state">
      <p className="eyebrow">No matches</p>
      <h2>{hasFilters ? "Nothing matched this search." : "No published posts yet."}</h2>
      <p>
        {hasFilters
          ? "Try fewer words, a different tag, or clear the filters."
          : "Published notes will appear here once they exist."}
      </p>
    </div>
  );
}
