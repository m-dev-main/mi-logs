import { useState } from "react";
import { useDesktopRuntime } from "../../hooks/useDesktopRuntime";
import type {
  RuntimeServiceName,
  RuntimeServiceState,
  RuntimeServiceStatus,
} from "../../types/desktop";
import { Button } from "../ui/Button";

const serviceOrder: RuntimeServiceName[] = ["api", "static", "tor"];

function stateLabel(state: RuntimeServiceState): string {
  switch (state) {
    case "running":
      return "Running";
    case "starting":
      return "Starting";
    case "stopping":
      return "Stopping";
    case "failed":
      return "Failed";
    case "exited":
      return "Exited";
    case "stopped":
      return "Stopped";
  }
}

function healthLabel(service: RuntimeServiceStatus): string {
  if (!service.health) {
    return "No probe";
  }

  if (service.health.ok) {
    return service.health.statusCode
      ? `HTTP ${service.health.statusCode}`
      : "Healthy";
  }

  return service.health.error ?? "Unhealthy";
}

export function DesktopRuntimePanel() {
  const runtime = useDesktopRuntime();
  const [torLog, setTorLog] = useState<string | null>(null);

  if (!runtime.isDesktop) {
    return null;
  }

  const busy = runtime.status === "loading";
  const services = runtime.runtime?.services;
  const onionHostname = services?.tor.onionHostname;

  async function copyOnion(): Promise<void> {
    if (onionHostname) {
      await navigator.clipboard.writeText(`http://${onionHostname}`);
    }
  }

  async function loadTorLog(): Promise<void> {
    if (!window.miLogDesktop) {
      return;
    }

    setTorLog(await window.miLogDesktop.runtime.getLog("tor"));
  }

  return (
    <section className="desktop-runtime-panel" aria-labelledby="desktop-runtime-title">
      <div className="desktop-runtime-panel__header">
        <div>
          <p className="eyebrow">Desktop</p>
          <h2 id="desktop-runtime-title">Runtime</h2>
        </div>
        <Button disabled={busy} onClick={runtime.refresh} variant="ghost">
          Refresh
        </Button>
      </div>
      {runtime.error ? (
        <p className="desktop-runtime-panel__error" role="alert">
          {runtime.error}
        </p>
      ) : null}
      {services ? (
        <ul className="desktop-runtime-panel__services">
          {serviceOrder.map((name) => {
            const service = services[name];
            return (
              <li className={`is-${service.state}`} key={service.name}>
                <span className="desktop-runtime-panel__dot" aria-hidden="true" />
                <div>
                  <strong>{service.label}</strong>
                  <small>
                    {stateLabel(service.state)}
                    {service.pid ? ` · PID ${service.pid}` : ""}
                  </small>
                  <small>{healthLabel(service)}</small>
                </div>
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="desktop-runtime-panel__empty">Loading runtime status...</p>
      )}
      {onionHostname ? (
        <div className="desktop-runtime-panel__onion">
          <code>{onionHostname}</code>
          <Button onClick={copyOnion} variant="ghost">
            Copy onion
          </Button>
        </div>
      ) : null}
      <div className="desktop-runtime-panel__actions">
        <Button disabled={busy} onClick={runtime.start} variant="secondary">
          Start serving
        </Button>
        <Button disabled={busy} onClick={runtime.stop} variant="ghost">
          Stop
        </Button>
        <Button disabled={busy} onClick={loadTorLog} variant="ghost">
          Tor log
        </Button>
      </div>
      {torLog !== null ? (
        <pre className="desktop-runtime-panel__log">{torLog || "No Tor log yet."}</pre>
      ) : null}
    </section>
  );
}
