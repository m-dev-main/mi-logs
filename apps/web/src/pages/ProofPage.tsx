import { useEffect, useState } from "react";
import { getProof, PublicApiError } from "../api/client";
import { AuthorKeyPanel } from "../components/proof/AuthorKeyPanel";
import { ProofManifestPanel } from "../components/proof/ProofManifestPanel";
import { SignaturePanel } from "../components/proof/SignaturePanel";
import { StatusBadge } from "../components/ui/StatusBadge";
import type { ProofPayload } from "../types/api";

type ProofState =
  | { status: "loading"; proof: null; error: null }
  | { status: "ready"; proof: ProofPayload; error: null }
  | { status: "error"; proof: null; error: PublicApiError };

export function ProofPage() {
  const [state, setState] = useState<ProofState>({
    status: "loading",
    proof: null,
    error: null,
  });

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

  return (
    <div className="page-stack readable-panel">
      <div className="page-title-row">
        <div>
          <p className="eyebrow">Proof</p>
          <h1>Sovereign manifest and author proof.</h1>
        </div>
        <StatusBadge tone={state.status === "ready" && state.proof.signature ? "success" : "warning"}>
          {state.status === "ready" && state.proof.signature ? "signed" : "not signed yet"}
        </StatusBadge>
      </div>
      <p className="lede">
        Content hashes show post integrity. A signature, when present, is author
        proof over the canonical manifest. Onion is future live presence; IPFS
        is future archive memory.
      </p>

      {state.status === "loading" ? (
        <div className="loading-state" role="status">
          Loading proof manifest...
        </div>
      ) : state.status === "error" ? (
        <div className="error-state" role="alert">
          {state.error.message}
        </div>
      ) : (
        <>
          <ProofManifestPanel manifest={state.proof.manifest} />
          <AuthorKeyPanel authorPublicKey={state.proof.authorPublicKey} />
          <SignaturePanel
            algorithm={state.proof.algorithm}
            signature={state.proof.signature}
          />
        </>
      )}
    </div>
  );
}
