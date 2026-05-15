import { useState } from "react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";

type SignaturePanelProps = {
  algorithm: string;
  signature: string | null;
  truncateMiddle: (value: string, head?: number, tail?: number) => string;
  onCopy: (value: string) => Promise<boolean>;
};

export function SignaturePanel({
  algorithm,
  signature,
  truncateMiddle,
  onCopy,
}: SignaturePanelProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy(): Promise<void> {
    if (!signature) {
      return;
    }

    const copied = await onCopy(signature);
    setCopyState(copied ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 1500);
  }

  return (
    <Card>
      <div className="proof-card-heading">
        <h2>Signature</h2>
        <StatusBadge tone={signature ? "success" : "warning"}>
          {signature ? "Signed" : "Not signed yet"}
        </StatusBadge>
      </div>
      <dl className="proof-list proof-list--rows">
        <div className="proof-list__row">
          <dt>Algorithm</dt>
          <dd>{algorithm}</dd>
        </div>
      </dl>
      {signature ? (
        <>
          <div className="proof-copy-inline">
            <code className="proof-inline-code">{truncateMiddle(signature)}</code>
            <Button className="proof-copy-button" onClick={() => void handleCopy()} variant="ghost">
              {copyState === "copied"
                ? "Copied"
                : copyState === "failed"
                  ? "Copy failed"
                  : "Copy signature"}
            </Button>
          </div>
          <details className="proof-raw-toggle">
            <summary>View full signature</summary>
            <pre className="proof-code">{signature}</pre>
          </details>
        </>
      ) : (
        <>
          <p className="proof-empty-title">Not signed yet</p>
          <p>
            Run <code>pnpm generate:author-key</code> and <code>pnpm release</code> to
            enable author proof.
          </p>
        </>
      )}
    </Card>
  );
}
