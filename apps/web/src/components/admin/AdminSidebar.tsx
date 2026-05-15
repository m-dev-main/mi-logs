import { useCallback, useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { exportAdminRelease, PublicApiError } from "../../api/client";
import type { AdminPost, PostStatus } from "../../types/api";
import { Button } from "../ui/Button";

type AdminSidebarProps = {
  posts: AdminPost[];
};

const statuses: PostStatus[] = ["draft", "published", "archived"];

export function AdminSidebar({ posts }: AdminSidebarProps) {
  const navigate = useNavigate();
  const [releaseBusy, setReleaseBusy] = useState(false);
  const [releaseMessage, setReleaseMessage] = useState<string | null>(null);

  const runExportRelease = useCallback(async () => {
    setReleaseBusy(true);
    setReleaseMessage(null);

    try {
      const { data } = await exportAdminRelease();
      setReleaseMessage(
        `Release ready: ${data.publishedPostCount} published post(s) → ${data.releasePath}`,
      );
    } catch (error) {
      setReleaseMessage(
        error instanceof PublicApiError
          ? error.message
          : "Static release export failed.",
      );
    } finally {
      setReleaseBusy(false);
    }
  }, []);

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
      <div className="admin-sidebar__release">
        <Button
          disabled={releaseBusy}
          onClick={runExportRelease}
          variant="secondary"
        >
          {releaseBusy ? "Exporting…" : "Export static release"}
        </Button>
        <p className="admin-sidebar__release-hint">
          Same as <code>pnpm export:release</code> (needs <code>pnpm build:web</code>{" "}
          first). Writes <code>releases/latest</code> for Tor/IPFS serving.
        </p>
        {releaseMessage ? (
          <p className="admin-sidebar__release-status" role="status">
            {releaseMessage}
          </p>
        ) : null}
      </div>
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
