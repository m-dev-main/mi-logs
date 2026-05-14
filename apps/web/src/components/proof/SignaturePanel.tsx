import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";

type SignaturePanelProps = {
  algorithm: string;
  signature: string | null;
};

export function SignaturePanel({ algorithm, signature }: SignaturePanelProps) {
  return (
    <Card>
      <div className="proof-card-heading">
        <h2>Signature</h2>
        <StatusBadge tone={signature ? "success" : "warning"}>
          {signature ? "signed" : "not signed yet"}
        </StatusBadge>
      </div>
      <dl className="proof-list">
        <div>
          <dt>Algorithm</dt>
          <dd>{algorithm}</dd>
        </div>
      </dl>
      {signature ? (
        <pre className="proof-code">{signature}</pre>
      ) : (
        <p>Not signed yet. Generate a local author key to add author proof.</p>
      )}
    </Card>
  );
}
