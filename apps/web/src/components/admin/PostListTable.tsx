import { Link } from "react-router-dom";
import type { AdminPost } from "../../types/api";
import { PostStatusBadge } from "./PostStatusBadge";

type PostListTableProps = {
  posts: AdminPost[];
};

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PostListTable({ posts }: PostListTableProps) {
  if (posts.length === 0) {
    return (
      <div className="empty-state">
        <p>No matching posts.</p>
      </div>
    );
  }

  return (
    <div className="admin-table-wrap">
      <table className="admin-table">
        <caption>All local posts</caption>
        <thead>
          <tr>
            <th scope="col">Title</th>
            <th scope="col">Status</th>
            <th scope="col">Slug</th>
            <th scope="col">Updated</th>
          </tr>
        </thead>
        <tbody>
          {posts.map((post) => (
            <tr key={post._id}>
              <td>
                <Link to={`/admin/posts/${post._id}`}>{post.title}</Link>
              </td>
              <td>
                <PostStatusBadge status={post.status} />
              </td>
              <td>
                <code>{post.slug}</code>
              </td>
              <td>
                <time dateTime={post.updatedAt}>{formatDate(post.updatedAt)}</time>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
