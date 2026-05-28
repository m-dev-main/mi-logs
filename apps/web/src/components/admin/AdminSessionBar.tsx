import { logoutAdmin, PublicApiError } from "../../api/client";
import type { AdminSessionStatus } from "../../types/api";
import { Button } from "../ui/Button";

type AdminSessionBarProps = {
  session: Extract<AdminSessionStatus, { authenticated: true }>;
  onLogout: () => void;
};

export function AdminSessionBar({ session, onLogout }: AdminSessionBarProps) {
  async function logout() {
    try {
      await logoutAdmin();
    } catch (error) {
      if (!(error instanceof PublicApiError)) {
        throw error;
      }
    } finally {
      onLogout();
    }
  }

  async function lockDesktop() {
    await window.miLogDesktop?.lock.lock("Locked from session bar.");
    window.dispatchEvent(new Event("mi-log-desktop-lock-changed"));
  }

  return (
    <div className="admin-session-bar">
      <span>Session expires {new Date(session.expiresAt).toLocaleString()}</span>
      <div className="admin-session-bar__actions">
        {window.miLogDesktop ? (
          <Button onClick={lockDesktop} variant="ghost">
            Lock
          </Button>
        ) : null}
        <Button onClick={logout} variant="ghost">
          Logout
        </Button>
      </div>
    </div>
  );
}
