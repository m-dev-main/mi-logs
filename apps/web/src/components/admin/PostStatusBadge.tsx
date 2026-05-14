import type { PostStatus } from "../../types/api";

type PostStatusBadgeProps = {
  status: PostStatus;
};

const statusTone: Record<PostStatus, string> = {
  draft: "status-badge--warning",
  published: "status-badge--success",
  archived: "status-badge--neutral",
};

export function PostStatusBadge({ status }: PostStatusBadgeProps) {
  return (
    <span className={`status-badge ${statusTone[status]}`}>
      {status}
    </span>
  );
}
