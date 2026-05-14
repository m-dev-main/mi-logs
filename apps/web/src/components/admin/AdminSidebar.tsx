import { NavLink, useNavigate } from "react-router-dom";
import type { AdminPost, PostStatus } from "../../types/api";
import { Button } from "../ui/Button";

type AdminSidebarProps = {
  posts: AdminPost[];
};

const statuses: PostStatus[] = ["draft", "published", "archived"];

export function AdminSidebar({ posts }: AdminSidebarProps) {
  const navigate = useNavigate();

  return (
    <aside className="admin-sidebar" aria-label="Admin navigation">
      <div className="admin-sidebar__brand">
        <p className="eyebrow">Local admin</p>
        <h1>Writing room</h1>
        <p>Admin is designed for local use only.</p>
      </div>
      <Button onClick={() => navigate("/admin/new")} variant="primary">
        New post
      </Button>
      <nav className="admin-sidebar__nav" aria-label="Admin sections">
        <NavLink
          className={({ isActive }) =>
            isActive ? "admin-nav-link is-active" : "admin-nav-link"
          }
          end
          to="/admin"
        >
          All posts
          <span>{posts.length}</span>
        </NavLink>
        {statuses.map((status) => (
          <div className="admin-nav-link admin-nav-link--readonly" key={status}>
            {status}
            <span>{posts.filter((post) => post.status === status).length}</span>
          </div>
        ))}
      </nav>
    </aside>
  );
}
