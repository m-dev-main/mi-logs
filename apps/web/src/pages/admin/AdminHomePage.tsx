import { useMemo, useState } from "react";
import { useAdminPosts } from "../../hooks/useAdminPosts";
import { Input } from "../../components/ui/Input";
import { PostListTable } from "../../components/admin/PostListTable";
import { AdminNotAvailablePage } from "./AdminNotAvailablePage";

export function AdminHomePage() {
  const { status, posts, error } = useAdminPosts();
  const [query, setQuery] = useState("");

  const filteredPosts = useMemo(() => {
    const normalized = query.trim().toLowerCase();

    if (normalized.length === 0) {
      return posts;
    }

    return posts.filter(
      (post) =>
        post.title.toLowerCase().includes(normalized) ||
        post.slug.toLowerCase().includes(normalized),
    );
  }, [posts, query]);

  if (error?.code === "LOCALHOST_ONLY") {
    return <AdminNotAvailablePage />;
  }

  return (
    <div className="admin-page-stack">
      <header className="admin-page-header">
        <div>
          <p className="eyebrow">All posts</p>
          <h1>Local post library</h1>
          <p>
            Drafts, published posts, and archived posts are visible here because
            this view is local-only.
          </p>
        </div>
      </header>

      <Input
        label="Search posts"
        name="admin-post-search"
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search by title or slug"
        value={query}
      />

      {status === "loading" ? (
        <div className="loading-state" role="status">
          Loading local posts...
        </div>
      ) : status === "error" ? (
        <div className="error-state" role="alert">
          {error?.message ?? "Admin posts could not be loaded."}
        </div>
      ) : (
        <PostListTable posts={filteredPosts} />
      )}
    </div>
  );
}
