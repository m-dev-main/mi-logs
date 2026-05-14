import type { ProofManifest } from "../../types/api";
import { Card } from "../ui/Card";

type ProofManifestPanelProps = {
  manifest: ProofManifest;
};

export function ProofManifestPanel({ manifest }: ProofManifestPanelProps) {
  return (
    <Card>
      <h2>Manifest</h2>
      <dl className="proof-list">
        <div>
          <dt>Generated</dt>
          <dd>{new Date(manifest.generatedAt).toLocaleString()}</dd>
        </div>
        <div>
          <dt>Version</dt>
          <dd>{manifest.version}</dd>
        </div>
        <div>
          <dt>Published posts</dt>
          <dd>{manifest.posts.length}</dd>
        </div>
        <div>
          <dt>Onion</dt>
          <dd>{manifest.onion ?? "future live presence"}</dd>
        </div>
        <div>
          <dt>IPFS</dt>
          <dd>{manifest.ipfsCid ?? "future archive memory"}</dd>
        </div>
      </dl>
      {manifest.posts.length > 0 ? (
        <ul className="proof-posts">
          {manifest.posts.map((post) => (
            <li key={post.slug}>
              <strong>{post.slug}</strong>
              <code>{post.contentSha256}</code>
            </li>
          ))}
        </ul>
      ) : (
        <p>No published posts are present in this manifest yet.</p>
      )}
    </Card>
  );
}
