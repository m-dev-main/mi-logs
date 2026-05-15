import type { ReactNode } from "react";
import { useEffect, useState } from "react";
import { getAdminSession, PublicApiError } from "../../api/client";
import { AdminNotAvailablePage } from "../../pages/admin/AdminNotAvailablePage";
import type { AdminSessionStatus } from "../../types/api";
import { PasskeyLoginPanel } from "./PasskeyLoginPanel";
import { PasskeyRegisterPanel } from "./PasskeyRegisterPanel";

type AdminAuthGateProps = {
  children: (
    session: Extract<AdminSessionStatus, { authenticated: true }>,
    onLoggedOut: () => void,
  ) => ReactNode;
};

type AuthGateState =
  | { status: "loading"; session: null; error: null }
  | { status: "ready"; session: AdminSessionStatus; error: null }
  | { status: "error"; session: null; error: PublicApiError };

function localhostAdminUrl(): string | null {
  if (window.location.hostname !== "127.0.0.1") {
    return null;
  }

  const nextUrl = new URL(window.location.href);
  nextUrl.hostname = "localhost";
  return nextUrl.toString();
}

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const canonicalAdminUrl = localhostAdminUrl();
  const [state, setState] = useState<AuthGateState>({
    status: "loading",
    session: null,
    error: null,
  });

  async function refreshSession(): Promise<void> {
    try {
      const response = await getAdminSession();
      setState({ status: "ready", session: response.data, error: null });
    } catch (error) {
      setState({
        status: "error",
        session: null,
        error:
          error instanceof PublicApiError
            ? error
            : new PublicApiError(
                {
                  code: "ADMIN_SESSION_LOAD_FAILED",
                  message: "Admin session could not be loaded.",
                },
                0,
              ),
      });
    }
  }

  useEffect(() => {
    let cancelled = false;

    async function loadSession() {
      if (!cancelled && canonicalAdminUrl === null) {
        await refreshSession();
      }
    }

    void loadSession();
    return () => {
      cancelled = true;
    };
  }, [canonicalAdminUrl]);

  useEffect(() => {
    if (canonicalAdminUrl !== null) {
      window.location.replace(canonicalAdminUrl);
    }
  }, [canonicalAdminUrl]);

  if (canonicalAdminUrl !== null) {
    return (
      <main className="admin-unavailable">
        <div className="loading-state" role="status">
          Redirecting admin to localhost for passkey support...
        </div>
      </main>
    );
  }

  if (state.status === "loading") {
    return (
      <main className="admin-unavailable">
        <div className="loading-state" role="status">
          Checking local owner session...
        </div>
      </main>
    );
  }

  if (state.status === "error") {
    if (state.error.code === "LOCALHOST_ONLY") {
      return <AdminNotAvailablePage />;
    }

    return (
      <main className="admin-unavailable">
        <div className="error-state" role="alert">
          {state.error.message}
        </div>
      </main>
    );
  }

  if (state.session.authenticated) {
    return (
      <>
        {children(state.session, () =>
          setState({
            status: "ready",
            session: {
              authenticated: false,
              registered: true,
              csrfToken: null,
              expiresAt: null,
            },
            error: null,
          }),
        )}
      </>
    );
  }

  return (
    <main className="admin-unavailable">
      {state.session.registered ? (
        <PasskeyLoginPanel
          onAuthenticated={() => {
            void refreshSession();
          }}
        />
      ) : (
        <PasskeyRegisterPanel
          onAuthenticated={() => {
            void refreshSession();
          }}
        />
      )}
    </main>
  );
}
