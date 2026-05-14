import { Link } from "react-router-dom";
import { Chip } from "../ui/Chip";
import type { PublicPostListItem } from "../../types/api";

type PostListItemProps = {
  post: PublicPostListItem;
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(new Date(value));
}

export function PostListItem({ post }: PostListItemProps) {
  return (
    <article className="post-list-item">
      <div className="post-list-item__meta">
        <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        <span aria-hidden="true">/</span>
        <span>v{post.canonicalVersion}</span>
      </div>
      <h2>
        <Link to={`/post/${post.slug}`}>{post.title}</Link>
      </h2>
      <p>{post.excerpt}</p>
      <div className="chip-row" aria-label="Tags">
        {post.tags.map((tag) => (
          <Chip key={tag} label={tag} />
        ))}
      </div>
    </article>
  );
}
