import { Card } from "../ui/Card";
import { StatusBadge } from "../ui/StatusBadge";

type ProofManifestPanelProps = {
  manifest: {
    project: "mi-log";
    generatedAt: string;
    version: 1;
    posts: Array<{
      slug: string;
      contentSha256: string;
      canonicalVersion: number;
      publishedAt: string;
    }>;
    onion: string | null;
    ipfsCid: string | null;
  };
  truncateMiddle: (value: string, head?: number, tail?: number) => string;
  formatDate: (value: string) => string;
};

export function ProofManifestPanel({
  manifest,
  truncateMiddle,
  formatDate,
}: ProofManifestPanelProps) {
  return (
    <Card>
      <div className="proof-card-heading">
        <h2>Canonical manifest</h2>
        <StatusBadge tone="success">Loaded</StatusBadge>
      </div>
      <dl className="proof-list proof-list--rows">
        <div className="proof-list__row">
          <dt>Generated</dt>
          <dd>{formatDate(manifest.generatedAt)}</dd>
        </div>
        <div className="proof-list__row">
          <dt>Version</dt>
          <dd>{manifest.version}</dd>
        </div>
        <div className="proof-list__row">
          <dt>Published posts</dt>
          <dd>{manifest.posts.length}</dd>
        </div>
        <div className="proof-list__row">
          <dt>Project</dt>
          <dd>{manifest.project}</dd>
        </div>
      </dl>
      {manifest.posts.length > 0 ? (
        <ul className="proof-posts proof-posts--manifest">
          {manifest.posts.map((post) => (
            <li key={post.slug}>
              <strong>{post.slug}</strong>
              <span className="proof-manifest-post__meta">
                canonical v{post.canonicalVersion} - {formatDate(post.publishedAt)}
              </span>
              <code className="proof-inline-code">
                {truncateMiddle(post.contentSha256)}
              </code>
            </li>
          ))}
        </ul>
      ) : (
        <p>No published posts are present in this manifest yet.</p>
      )}
      <details className="proof-raw-toggle">
        <summary>View canonical manifest JSON</summary>
        <pre className="proof-code">{JSON.stringify(manifest, null, 2)}</pre>
      </details>
    </Card>
  );
}
