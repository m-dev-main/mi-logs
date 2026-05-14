import { startRegistration } from "@simplewebauthn/browser";
import { useState } from "react";
import {
  getRegisterOptions,
  PublicApiError,
  verifyRegister,
} from "../../api/client";
import type { AdminSessionStatus } from "../../types/api";
import { Button } from "../ui/Button";

type PasskeyRegisterPanelProps = {
  onAuthenticated: (session: Extract<AdminSessionStatus, { authenticated: true }>) => void;
};

export function PasskeyRegisterPanel({ onAuthenticated }: PasskeyRegisterPanelProps) {
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState<string | null>(null);

  async function registerPasskey() {
    setStatus("working");
    setError(null);

    try {
      const options = await getRegisterOptions();
      const credential = await startRegistration({ optionsJSON: options.data });
      const session = await verifyRegister(credential);
      if (session.data.authenticated) {
        onAuthenticated(session.data);
      }
    } catch (nextError) {
      setError(
        nextError instanceof PublicApiError
          ? nextError.message
          : nextError instanceof Error
            ? nextError.message
            : "Passkey registration could not be completed.",
      );
    } finally {
      setStatus("idle");
    }
  }

  return (
    <section className="auth-panel readable-panel">
      <p className="eyebrow">Owner setup</p>
      <h1>Register the local owner passkey.</h1>
      <p className="lede">
        mi-log uses one local owner credential. There is no password fallback,
        email login, or external auth provider.
      </p>
      {error ? (
        <div className="error-state" role="alert">
          {error}
        </div>
      ) : null}
      <Button disabled={status === "working"} onClick={registerPasskey} variant="primary">
        {status === "working" ? "Waiting for passkey..." : "Register passkey"}
      </Button>
    </section>
  );
}
