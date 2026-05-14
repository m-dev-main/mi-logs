import type { AdminPost } from "../../types/api";
import { Dialog } from "../ui/Dialog";

type DeletePostDialogProps = {
  post: AdminPost;
  isOpen: boolean;
  isDeleting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
};

export function DeletePostDialog({
  post,
  isOpen,
  isDeleting,
  onCancel,
  onConfirm,
}: DeletePostDialogProps) {
  return (
    <Dialog
      confirmLabel="Delete post"
      isBusy={isDeleting}
      isOpen={isOpen}
      onCancel={onCancel}
      onConfirm={onConfirm}
      title="Delete this local post?"
    >
      <p>
        This will hard delete <strong>{post.title}</strong> from local MongoDB.
        This v0 action cannot be undone.
      </p>
    </Dialog>
  );
}
