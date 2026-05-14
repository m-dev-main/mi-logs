import type { PublicPostDetail } from "../../types/api";
import { Card } from "../ui/Card";

type PostMetadataPanelProps = {
  post: PublicPostDetail;
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PostMetadataPanel({ post }: PostMetadataPanelProps) {
  return (
    <Card className="metadata-panel">
      <h2>Verification metadata</h2>
      <dl>
        <div>
          <dt>Slug</dt>
          <dd>{post.slug}</dd>
        </div>
        <div>
          <dt>Content SHA-256</dt>
          <dd className="metadata-panel__hash">{post.contentSha256}</dd>
        </div>
        <div>
          <dt>Canonical version</dt>
          <dd>{post.canonicalVersion}</dd>
        </div>
        <div>
          <dt>Published</dt>
          <dd>
            <time dateTime={post.publishedAt}>
              {formatDateTime(post.publishedAt)}
            </time>
          </dd>
        </div>
      </dl>
    </Card>
  );
}
