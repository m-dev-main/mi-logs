import { useDesktopSetup } from "../../hooks/useDesktopSetup";
import type { DesktopSetupCheckStatus } from "../../types/desktop";
import { Button } from "../ui/Button";

function statusLabel(status: DesktopSetupCheckStatus): string {
  switch (status) {
    case "ok":
      return "OK";
    case "warning":
      return "Check";
    case "error":
      return "Missing";
  }
}

export function DesktopSetupPanel() {
  const setup = useDesktopSetup();

  if (!setup.isDesktop) {
    return null;
  }

  const busy = setup.status === "loading";

  return (
    <section className="desktop-setup-panel" aria-labelledby="desktop-setup-title">
      <div className="desktop-setup-panel__header">
        <div>
          <p className="eyebrow">First run</p>
          <h2 id="desktop-setup-title">Setup checks</h2>
        </div>
        <Button disabled={busy} onClick={setup.validate} variant="ghost">
          {busy ? "Checking..." : "Refresh"}
        </Button>
      </div>

      {setup.error ? (
        <p className="desktop-setup-panel__error" role="alert">
          {setup.error}
        </p>
      ) : null}

      {setup.setup ? (
        <>
          <ul className="desktop-setup-panel__checks">
            {setup.setup.checks.map((check) => (
              <li className={`is-${check.status}`} key={check.id}>
                <span>{statusLabel(check.status)}</span>
                <div>
                  <strong>{check.label}</strong>
                  <small>{check.detail}</small>
                </div>
              </li>
            ))}
          </ul>
          <p className="desktop-setup-panel__meta">
            Tor mode: {setup.setup.torMode}. Checked {setup.setup.checkedAt}.
          </p>
        </>
      ) : (
        <p className="desktop-setup-panel__meta">Loading setup checks...</p>
      )}
    </section>
  );
}
