import { startAuthentication } from "@simplewebauthn/browser";
import { useState } from "react";
import { getLoginOptions, PublicApiError, verifyLogin } from "../../api/client";
import type { AdminSessionStatus } from "../../types/api";
import { Button } from "../ui/Button";

type PasskeyLoginPanelProps = {
  onAuthenticated: (session: Extract<AdminSessionStatus, { authenticated: true }>) => void;
};

export function PasskeyLoginPanel({ onAuthenticated }: PasskeyLoginPanelProps) {
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState<string | null>(null);

  async function loginWithPasskey() {
    setStatus("working");
    setError(null);

    try {
      const options = await getLoginOptions();
      const credential = await startAuthentication({ optionsJSON: options.data });
      const session = await verifyLogin(credential);
      if (session.data.authenticated) {
        onAuthenticated(session.data);
      }
    } catch (nextError) {
      setError(
        nextError instanceof PublicApiError
          ? nextError.message
          : nextError instanceof Error
            ? nextError.message
            : "Passkey login could not be completed.",
      );
    } finally {
      setStatus("idle");
    }
  }

  return (
    <section className="auth-panel readable-panel">
      <p className="eyebrow">Owner login</p>
      <h1>Unlock the local writing room.</h1>
      <p className="lede">
        Admin access requires this browser to prove possession of the owner
        passkey. Public readers never need a session.
      </p>
      {error ? (
        <div className="error-state" role="alert">
          {error}
        </div>
      ) : null}
      <Button disabled={status === "working"} onClick={loginWithPasskey} variant="primary">
        {status === "working" ? "Waiting for passkey..." : "Login with passkey"}
      </Button>
    </section>
  );
}
