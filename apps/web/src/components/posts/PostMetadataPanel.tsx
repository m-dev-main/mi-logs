import type { PublicPostDetail } from "../../types/api";
import { Card } from "../ui/Card";

type PostMetadataPanelProps = {
  post: PublicPostDetail;
  readingTimeMinutes: number;
  wordCount: number;
};

function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function PostMetadataPanel({
  post,
  readingTimeMinutes,
  wordCount,
}: PostMetadataPanelProps) {
  return (
    <Card className="metadata-panel">
      <h2>Verification metadata</h2>
      <dl>
        <div>
          <dt>Estimated reading time</dt>
          <dd>
            {readingTimeMinutes} {readingTimeMinutes === 1 ? "minute" : "minutes"}
          </dd>
        </div>
        <div>
          <dt>Public word count</dt>
          <dd>{wordCount}</dd>
        </div>
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
