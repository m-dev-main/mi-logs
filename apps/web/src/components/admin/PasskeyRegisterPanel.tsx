import { startRegistration } from "@simplewebauthn/browser";
import { useState } from "react";
import {
  getRegisterOptions,
  PublicApiError,
  verifyRegister,
} from "../../api/client";
import type { AdminSessionStatus } from "../../types/api";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

type PasskeyRegisterPanelProps = {
  onAuthenticated: (session: Extract<AdminSessionStatus, { authenticated: true }>) => void;
};

export function PasskeyRegisterPanel({ onAuthenticated }: PasskeyRegisterPanelProps) {
  const [bootstrapToken, setBootstrapToken] = useState("");
  const [status, setStatus] = useState<"idle" | "working">("idle");
  const [error, setError] = useState<string | null>(null);

  async function registerPasskey() {
    setStatus("working");
    setError(null);

    const token = bootstrapToken.trim();

    if (token.length === 0) {
      setError(
        "Enter the OWNER_REGISTRATION_TOKEN from your machine’s API environment (.env). It is sent once as Authorization Bearer and is not stored in this browser.",
      );
      setStatus("idle");
      return;
    }

    try {
      const options = await getRegisterOptions(token);
      const credential = await startRegistration({ optionsJSON: options.data });
      const session = await verifyRegister(credential, token);
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
        email login, or external auth provider. The first registration requires the
        one-time OWNER_REGISTRATION_TOKEN from your server `.env`; paste it below,
        register your passkey in the same session, then rotate or remove the token
        in `.env` if you like.
      </p>
      <Input
        autoComplete="off"
        helpText="Must match OWNER_REGISTRATION_TOKEN on the Express API. Restart the API after changing `.env`."
        label="Owner registration token"
        maxLength={1024}
        name="ownerRegistrationToken"
        onChange={(event) => setBootstrapToken(event.target.value)}
        spellCheck={false}
        type="password"
        value={bootstrapToken}
      />
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
