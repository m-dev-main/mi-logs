import type { PublicPostListItem } from "../../types/api";
import { PostList } from "../posts/PostList";

type SearchResultsProps = {
  posts: PublicPostListItem[];
};

export function SearchResults({ posts }: SearchResultsProps) {
  return (
    <section aria-labelledby="search-results-title">
      <h2 className="sr-only" id="search-results-title">
        Search results
      </h2>
      <PostList posts={posts} />
    </section>
  );
}
