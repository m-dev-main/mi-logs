import type { ReactNode } from "react";
import { useEffect } from "react";
import { useDesktopLock } from "../../hooks/useDesktopLock";
import { Button } from "../ui/Button";
import { DesktopSetupPanel } from "./DesktopSetupPanel";

type DesktopLockGateProps = {
  children: ReactNode;
};

const activityEvents = ["click", "keydown", "pointermove", "scroll"] as const;

export function DesktopLockGate({ children }: DesktopLockGateProps) {
  const desktopLock = useDesktopLock();

  useEffect(() => {
    if (!desktopLock.isDesktop || desktopLock.lock?.locked !== false) {
      return;
    }

    const record = () => {
      void desktopLock.recordActivity();
    };

    for (const eventName of activityEvents) {
      window.addEventListener(eventName, record, { passive: true });
    }

    return () => {
      for (const eventName of activityEvents) {
        window.removeEventListener(eventName, record);
      }
    };
  }, [desktopLock.isDesktop, desktopLock.lock?.locked, desktopLock.recordActivity]);

  if (!desktopLock.isDesktop || desktopLock.lock?.locked === false) {
    return <>{children}</>;
  }

  const busy = desktopLock.status === "loading";
  const unavailable = desktopLock.lock?.available === false;

  return (
    <main className="admin-unavailable">
      <div className="admin-unavailable__stack">
        <DesktopSetupPanel />
        <section className="desktop-lock-panel" aria-labelledby="desktop-lock-title">
          <p className="eyebrow">Desktop lock</p>
          <h1 id="desktop-lock-title">Unlock admin</h1>
          <p>
            Admin controls require a fresh local biometric unlock before the
            passkey session is checked.
          </p>
          {desktopLock.error ? (
            <p className="desktop-lock-panel__error" role="alert">
              {desktopLock.error}
            </p>
          ) : null}
          {desktopLock.lock?.reason ? (
            <p className="desktop-lock-panel__reason">{desktopLock.lock.reason}</p>
          ) : null}
          <Button disabled={busy || unavailable} onClick={desktopLock.unlock} variant="primary">
            {busy ? "Waiting..." : "Unlock with Touch ID"}
          </Button>
          {unavailable ? (
            <p className="desktop-lock-panel__error" role="alert">
              Touch ID is not available for this desktop session.
            </p>
          ) : null}
        </section>
      </div>
    </main>
  );
}
