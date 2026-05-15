import { useState } from "react";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";

type AuthorKeyPanelProps = {
  authorPublicKey: string | null;
  truncateMiddle: (value: string, head?: number, tail?: number) => string;
  onCopy: (value: string) => Promise<boolean>;
};

export function AuthorKeyPanel({
  authorPublicKey,
  truncateMiddle,
  onCopy,
}: AuthorKeyPanelProps) {
  const [copyState, setCopyState] = useState<"idle" | "copied" | "failed">("idle");

  async function handleCopy(): Promise<void> {
    if (!authorPublicKey) {
      return;
    }

    const copied = await onCopy(authorPublicKey);
    setCopyState(copied ? "copied" : "failed");
    window.setTimeout(() => setCopyState("idle"), 1500);
  }

  const compactKey = authorPublicKey?.replace(/\s+/g, " ").trim() ?? "";

  return (
    <Card>
      <div className="proof-card-heading">
        <h2>Author public key</h2>
        <StatusBadge tone={authorPublicKey ? "success" : "warning"}>
          {authorPublicKey ? "Configured" : "Not configured"}
        </StatusBadge>
      </div>
      {authorPublicKey ? (
        <>
          <div className="proof-copy-inline">
            <code className="proof-inline-code">{truncateMiddle(compactKey, 24, 18)}</code>
            <Button className="proof-copy-button" onClick={() => void handleCopy()} variant="ghost">
              {copyState === "copied"
                ? "Copied"
                : copyState === "failed"
                  ? "Copy failed"
                  : "Copy key"}
            </Button>
          </div>
          <details className="proof-raw-toggle">
            <summary>View full public key</summary>
            <pre className="proof-code">{authorPublicKey}</pre>
          </details>
        </>
      ) : (
        <>
          <p className="proof-empty-title">Not configured</p>
          <p>The author public key has not been published in this release.</p>
        </>
      )}
    </Card>
  );
}
