import { useEffect, useState, type ReactNode } from "react";
import { getProof, type ProofData, PublicApiError } from "../api/client";
import { AuthorKeyPanel } from "../components/proof/AuthorKeyPanel";
import { ProofManifestPanel } from "../components/proof/ProofManifestPanel";
import { SignaturePanel } from "../components/proof/SignaturePanel";
import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { StatusBadge } from "../components/ui/StatusBadge";

type ProofState =
  | { status: "loading"; proof: null; error: null }
  | { status: "ready"; proof: ProofData; error: null }
  | { status: "error"; proof: null; error: PublicApiError };

type CopyStatus = "idle" | "copied" | "failed";

export function truncateMiddle(value: string, head = 16, tail = 12): string {
  if (value.length <= head + tail + 1) {
    return value;
  }

  return `${value.slice(0, head)}...${value.slice(-tail)}`;
}

export async function copyToClipboard(value: string): Promise<boolean> {
  if (typeof navigator === "undefined" || !navigator.clipboard?.writeText) {
    return false;
  }

  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    return false;
  }
}

export function formatDate(value: string): string {
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return "Unavailable";
  }

  return parsed.toLocaleString();
}

export function getPostCount(manifest: ProofData["manifest"]): number {
  return manifest.posts.length;
}

export function ProofPage() {
  const [state, setState] = useState<ProofState>({
    status: "loading",
    proof: null,
    error: null,
  });
  const [copyState, setCopyState] = useState<Record<string, CopyStatus>>({});

  useEffect(() => {
    let cancelled = false;

    async function loadProof() {
      try {
        const response = await getProof();
        if (!cancelled) {
          setState({ status: "ready", proof: response.data, error: null });
        }
      } catch (error) {
        if (!cancelled) {
          setState({
            status: "error",
            proof: null,
            error:
              error instanceof PublicApiError
                ? error
                : new PublicApiError(
                    {
                      code: "PROOF_LOAD_FAILED",
                      message: "Proof manifest could not be loaded.",
                    },
                    0,
                  ),
          });
        }
      }
    }

    void loadProof();
    return () => {
      cancelled = true;
    };
  }, []);

  function getCopyButtonLabel(key: string, idleLabel: string): string {
    const status = copyState[key] ?? "idle";
    if (status === "copied") {
      return "Copied";
    }
    if (status === "failed") {
      return "Copy failed";
    }
    return idleLabel;
  }

  async function handleCopy(key: string, value: string | null): Promise<void> {
    if (!value) {
      return;
    }

    const copied = await copyToClipboard(value);
    setCopyState((current) => ({ ...current, [key]: copied ? "copied" : "failed" }));

    window.setTimeout(() => {
      setCopyState((current) => ({ ...current, [key]: "idle" }));
    }, 1500);
  }

  const isProofUnavailable =
    state.status === "error" && state.error.code === "PROOF_UNAVAILABLE";

  const heroTone =
    state.status === "ready"
      ? state.proof.signed
        ? "success"
        : "warning"
      : state.status === "loading"
        ? "neutral"
        : "warning";
  const heroLabel =
    state.status === "ready"
      ? state.proof.signed
        ? "signed"
        : "not signed yet"
      : state.status === "loading"
        ? "loading"
        : "proof unavailable";

  let content: ReactNode;
  if (state.status === "loading") {
    content = (
      <div className="loading-state" role="status">
        Loading proof manifest...
      </div>
    );
  } else if (state.status === "error") {
    content = isProofUnavailable ? (
      <div role="alert">
        <Card className="proof-unavailable-card">
          <h2>Proof data unavailable</h2>
          <p>Run pnpm release and serve the readonly release again.</p>
        </Card>
      </div>
    ) : (
      <div className="error-state" role="alert">
        {state.error.message}
      </div>
    );
  } else {
    const proof = state.proof;
    content = (
      <>
        <div className="proof-dashboard-grid">
          <Card className="proof-summary-panel">
            <div className="proof-card-heading">
              <h2>Proof summary</h2>
              <StatusBadge tone={proof.signed ? "success" : "warning"}>
                {proof.signed ? "Signed" : "Not signed yet"}
              </StatusBadge>
            </div>
            <dl className="proof-list proof-list--rows">
              <div className="proof-list__row">
                <dt>Published posts</dt>
                <dd>{getPostCount(proof.manifest)}</dd>
              </div>
              <div className="proof-list__row">
                <dt>Release hash</dt>
                <dd>
                  {proof.releaseSha256 ? (
                    <span className="proof-copy-inline">
                      <code className="proof-inline-code">
                        {truncateMiddle(proof.releaseSha256)}
                      </code>
                      <Button
                        className="proof-copy-button"
                        onClick={() => void handleCopy("release-sha", proof.releaseSha256)}
                        variant="ghost"
                      >
                        {getCopyButtonLabel("release-sha", "Copy hash")}
                      </Button>
                    </span>
                  ) : (
                    "Unavailable"
                  )}
                </dd>
              </div>
              <div className="proof-list__row">
                <dt>Manifest generatedAt</dt>
                <dd>{formatDate(proof.manifest.generatedAt)}</dd>
              </div>
              <div className="proof-list__row">
                <dt>Manifest loaded</dt>
                <dd>Loaded</dd>
              </div>
              <div className="proof-list__row">
                <dt>Signature</dt>
                <dd>{proof.signed ? "Signed" : "Not signed yet"}</dd>
              </div>
              <div className="proof-list__row">
                <dt>Author public key</dt>
                <dd>{proof.authorPublicKey ? "Configured" : "Not configured"}</dd>
              </div>
              <div className="proof-list__row">
                <dt>Source</dt>
                <dd>{proof.source === "api" ? "API" : "Static release"}</dd>
              </div>
            </dl>
          </Card>

          <Card className="proof-canonical-panel">
            <h2>Canonical presence</h2>
            <dl className="proof-list proof-list--rows">
              <div className="proof-list__row">
                <dt>Onion live address</dt>
                <dd>{proof.manifest.onion ?? "Not configured"}</dd>
              </div>
              <div className="proof-list__row">
                <dt>IPFS archive</dt>
                <dd>{proof.manifest.ipfsCid ?? "Not published yet"}</dd>
              </div>
            </dl>
          </Card>
        </div>

        <div className="proof-status-grid">
          <Card className="proof-status-card">
            <p className="eyebrow">Manifest loaded</p>
            <StatusBadge tone="success">Loaded</StatusBadge>
          </Card>
          <Card className="proof-status-card">
            <p className="eyebrow">Author signature</p>
            <StatusBadge tone={proof.signed ? "success" : "warning"}>
              {proof.signed ? "Found" : "Not signed yet"}
            </StatusBadge>
          </Card>
          <Card className="proof-status-card">
            <p className="eyebrow">Author public key</p>
            <StatusBadge tone={proof.authorPublicKey ? "success" : "warning"}>
              {proof.authorPublicKey ? "Found" : "Not configured"}
            </StatusBadge>
          </Card>
          <Card className="proof-status-card">
            <p className="eyebrow">Release hash</p>
            <StatusBadge tone={proof.releaseSha256 ? "success" : "warning"}>
              {proof.releaseSha256 ? "Found" : "Unavailable"}
            </StatusBadge>
          </Card>
        </div>

        <ProofManifestPanel
          formatDate={formatDate}
          manifest={proof.manifest}
          truncateMiddle={truncateMiddle}
        />
        <div className="proof-detail-grid">
          <AuthorKeyPanel
            authorPublicKey={proof.authorPublicKey}
            onCopy={copyToClipboard}
            truncateMiddle={truncateMiddle}
          />
          <SignaturePanel
            algorithm={proof.algorithm}
            onCopy={copyToClipboard}
            signature={proof.signature}
            truncateMiddle={truncateMiddle}
          />
        </div>
      </>
    );
  }

  return (
    <div className="page-stack proof-page">
      <section className="hero-panel proof-hero">
        <div>
          <p className="eyebrow">PROOF</p>
          <h1>Sovereign manifest and author proof.</h1>
          <p className="hero-panel__lede">
            Content hashes show post integrity. A signature, when present, is
            author proof over the canonical manifest.
          </p>
        </div>
        <StatusBadge tone={heroTone}>{heroLabel}</StatusBadge>
      </section>
      {content}
    </div>
  );
}
