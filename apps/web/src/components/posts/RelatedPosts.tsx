import { Link } from "react-router-dom";
import type { PublicPostListItem } from "../../types/api";

type RelatedPostsProps = {
  posts: PublicPostListItem[];
  previousPost?: PublicPostListItem;
  nextPost?: PublicPostListItem;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function RelatedPosts({
  posts,
  previousPost,
  nextPost,
}: RelatedPostsProps) {
  return (
    <section className="related-posts" aria-labelledby="related-posts-title">
      <div className="related-posts__nav" aria-label="Adjacent posts">
        {previousPost ? (
          <Link to={`/post/${previousPost.slug}`}>
            <span>Previous</span>
            {previousPost.title}
          </Link>
        ) : null}
        {nextPost ? (
          <Link to={`/post/${nextPost.slug}`}>
            <span>Next</span>
            {nextPost.title}
          </Link>
        ) : null}
      </div>

      <div className="related-posts__list">
        <h2 id="related-posts-title">Related notes</h2>
        {posts.length > 0 ? (
          <ul>
            {posts.map((post) => (
              <li key={post.slug}>
                <Link to={`/post/${post.slug}`}>{post.title}</Link>
                <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
              </li>
            ))}
          </ul>
        ) : (
          <p>No related notes yet.</p>
        )}
      </div>
    </section>
  );
}
