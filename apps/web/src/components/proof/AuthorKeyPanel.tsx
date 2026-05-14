import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";

type AuthorKeyPanelProps = {
  authorPublicKey: string | null;
};

export function AuthorKeyPanel({ authorPublicKey }: AuthorKeyPanelProps) {
  return (
    <Card>
      <div className="proof-card-heading">
        <h2>Author public key</h2>
        <StatusBadge tone={authorPublicKey ? "success" : "warning"}>
          {authorPublicKey ? "present" : "missing"}
        </StatusBadge>
      </div>
      {authorPublicKey ? (
        <pre className="proof-code">{authorPublicKey}</pre>
      ) : (
        <p>The manifest is not signed yet because no author key is available.</p>
      )}
    </Card>
  );
}
