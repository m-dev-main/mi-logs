import { Outlet } from "react-router-dom";
import { useAdminPosts } from "../../hooks/useAdminPosts";
import type { AdminSessionStatus } from "../../types/api";
import { AdminAuthGate } from "./AdminAuthGate";
import { AdminSessionBar } from "./AdminSessionBar";
import { AdminSidebar } from "./AdminSidebar";

type AuthenticatedSession = Extract<AdminSessionStatus, { authenticated: true }>;

function AuthenticatedAdminShell({
  onLoggedOut,
  session,
}: {
  onLoggedOut: () => void;
  session: AuthenticatedSession;
}) {
  const { status, posts, error } = useAdminPosts();

  return (
    <div className="admin-shell">
      <AdminSidebar posts={posts} />
      <main className="admin-main" id="admin-main">
        <AdminSessionBar
          onLogout={onLoggedOut}
          session={session}
        />
        {status === "error" ? (
          <div className="error-state" role="alert">
            {error?.message ?? "Admin posts could not be loaded."}
          </div>
        ) : null}
        <Outlet />
      </main>
    </div>
  );
}

export function AdminShell() {
  return (
    <AdminAuthGate>
      {(session, onLoggedOut) => (
        <AuthenticatedAdminShell onLoggedOut={onLoggedOut} session={session} />
      )}
    </AdminAuthGate>
  );
}
