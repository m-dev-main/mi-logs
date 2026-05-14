import type { PublicPostListItem } from "../../types/api";
import { PostListItem } from "./PostListItem";

type PostListProps = {
  posts: PublicPostListItem[];
};

export function PostList({ posts }: PostListProps) {
  if (posts.length === 0) {
    return (
      <div className="empty-state">
        <p>No published posts yet.</p>
      </div>
    );
  }

  return (
    <div className="post-list" aria-label="Latest posts">
      {posts.map((post) => (
        <PostListItem key={post.slug} post={post} />
      ))}
    </div>
  );
}
