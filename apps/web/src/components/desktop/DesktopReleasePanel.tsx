import { useCallback, useEffect, useState } from "react";
import type { ReactNode } from "react";
import type {
  ReleaseCommandName,
  ReleaseCommandResult,
  ReleaseProofSummary,
} from "../../types/desktop";
import { Button } from "../ui/Button";

type ReleaseAction = ReleaseCommandName | "refreshProof" | "restartStatic" | "serveLatest";

type ReleaseButton = Readonly<{
  action: ReleaseAction;
  label: string;
  variant?: "primary" | "secondary" | "ghost";
}>;

const primaryActions: ReleaseButton[] = [
  { action: "buildWeb", label: "Build web", variant: "secondary" },
  { action: "exportRelease", label: "Export release", variant: "primary" },
  { action: "serveLatest", label: "Serve latest", variant: "secondary" },
  { action: "restartStatic", label: "Restart server", variant: "ghost" },
];

const auditActions: ReleaseButton[] = [
  { action: "auditSource", label: "Audit source", variant: "ghost" },
  { action: "auditRelease", label: "Audit release", variant: "ghost" },
  { action: "auditRuntime", label: "Audit runtime", variant: "ghost" },
];

const proofActions: ReleaseButton[] = [
  { action: "generateAuthorKey", label: "Generate key", variant: "ghost" },
  { action: "addIpfsRelease", label: "Add to IPFS", variant: "ghost" },
  { action: "refreshProof", label: "Refresh proof", variant: "ghost" },
];

const commandActions = new Set<ReleaseCommandName>([
  "addIpfsRelease",
  "auditRelease",
  "auditRuntime",
  "auditSource",
  "buildWeb",
  "exportRelease",
  "generateAuthorKey",
]);

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Desktop release action failed.";
}

function isCommandAction(action: ReleaseAction): action is ReleaseCommandName {
  return commandActions.has(action as ReleaseCommandName);
}

function summarizeResult(result: ReleaseCommandResult): string {
  const exit = result.exitCode === null ? result.signal ?? "unknown" : result.exitCode;
  return `${result.ok ? "PASS" : "FAIL"} ${result.command} exit=${exit}`;
}

function ProofRow({
  children,
  label,
  value,
}: {
  children?: ReactNode;
  label: string;
  value: string | null;
}) {
  if (!value) {
    return null;
  }

  return (
    <div className="desktop-release-panel__proof-row">
      <span>{label}</span>
      <code>{value}</code>
      {children}
    </div>
  );
}

export function DesktopReleasePanel() {
  const [busyAction, setBusyAction] = useState<ReleaseAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [lastResult, setLastResult] = useState<ReleaseCommandResult | null>(null);
  const [lastMessage, setLastMessage] = useState<string | null>(null);
  const [proof, setProof] = useState<ReleaseProofSummary | null>(null);

  const isDesktop = window.miLogDesktop !== undefined;

  const loadProof = useCallback(async () => {
    if (!window.miLogDesktop) {
      return;
    }

    setProof(await window.miLogDesktop.release.proofSummary());
  }, []);

  useEffect(() => {
    if (!isDesktop) {
      return;
    }

    void loadProof().catch((loadError) => setError(errorMessage(loadError)));
  }, [isDesktop, loadProof]);

  if (!isDesktop) {
    return null;
  }

  async function copyValue(value: string | null): Promise<void> {
    if (value) {
      await navigator.clipboard.writeText(value);
    }
  }

  async function runAction(action: ReleaseAction): Promise<void> {
    if (!window.miLogDesktop) {
      return;
    }

    setBusyAction(action);
    setError(null);
    setLastResult(null);
    setLastMessage(null);

    try {
      if (isCommandAction(action)) {
        const result = await window.miLogDesktop.release.run(action);
        setLastResult(result);
        if (!result.ok) {
          setError(summarizeResult(result));
        }
      } else if (action === "restartStatic") {
        await window.miLogDesktop.release.restartStaticServer();
        setLastResult(null);
        setLastMessage("Static release server restarted.");
      } else if (action === "serveLatest") {
        await window.miLogDesktop.runtime.start();
        setLastResult(null);
        setLastMessage("Latest release serving stack started.");
      } else {
        setLastResult(null);
      }

      await loadProof();
    } catch (actionError) {
      setError(errorMessage(actionError));
    } finally {
      setBusyAction(null);
    }
  }

  function renderButtons(buttons: ReleaseButton[]) {
    return buttons.map(({ action, label, variant = "secondary" }) => (
      <Button
        disabled={busyAction !== null}
        key={action}
        onClick={() => void runAction(action)}
        variant={variant}
      >
        {busyAction === action ? "Running..." : label}
      </Button>
    ));
  }

  return (
    <section className="desktop-release-panel" aria-labelledby="desktop-release-title">
      <div className="desktop-release-panel__header">
        <div>
          <p className="eyebrow">Release</p>
          <h2 id="desktop-release-title">Publish</h2>
        </div>
      </div>

      <div className="desktop-release-panel__actions">
        {renderButtons(primaryActions)}
      </div>
      <div className="desktop-release-panel__actions">
        {renderButtons(auditActions)}
      </div>
      <div className="desktop-release-panel__actions">
        {renderButtons(proofActions)}
      </div>

      {proof ? (
        <div className="desktop-release-panel__proof">
          <ProofRow
            label="Posts"
            value={
              proof.publishedPostCount === null
                ? null
                : String(proof.publishedPostCount)
            }
          />
          <ProofRow label="Generated" value={proof.manifestGeneratedAt} />
          <ProofRow label="Hash" value={proof.releaseSha256}>
            <Button onClick={() => void copyValue(proof.releaseSha256)} variant="ghost">
              Copy
            </Button>
          </ProofRow>
          <ProofRow label="Onion" value={proof.onionUrl}>
            <Button onClick={() => void copyValue(proof.onionUrl)} variant="ghost">
              Copy
            </Button>
          </ProofRow>
          <ProofRow label="CID" value={proof.ipfsCid}>
            <Button onClick={() => void copyValue(proof.ipfsCid)} variant="ghost">
              Copy
            </Button>
          </ProofRow>
          {proof.authorPublicKey ? (
            <div className="desktop-release-panel__key">
              <div>
                <span>Author public key</span>
                <Button
                  onClick={() => void copyValue(proof.authorPublicKey)}
                  variant="ghost"
                >
                  Copy
                </Button>
              </div>
              <pre>{proof.authorPublicKey}</pre>
            </div>
          ) : null}
        </div>
      ) : null}

      {error ? (
        <p className="desktop-release-panel__error" role="alert">
          {error}
        </p>
      ) : null}
      {lastMessage ? (
        <p className="desktop-release-panel__status" role="status">
          {lastMessage}
        </p>
      ) : null}
      {lastResult ? (
        <div className="desktop-release-panel__result" role="status">
          <p>{summarizeResult(lastResult)}</p>
          <pre>{lastResult.output || "No command output."}</pre>
        </div>
      ) : null}
    </section>
  );
}
