import { useParams } from "react-router-dom";
import { PostEditor } from "../../components/admin/PostEditor";
import { useAdminPost } from "../../hooks/useAdminPost";
import { AdminNotAvailablePage } from "./AdminNotAvailablePage";

export function AdminPostEditPage() {
  const { id } = useParams();
  const { status, post, error } = useAdminPost(id);

  if (error?.code === "LOCALHOST_ONLY") {
    return <AdminNotAvailablePage />;
  }

  if (status === "loading") {
    return (
      <div className="loading-state" role="status">
        Loading local post...
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="error-state" role="alert">
        {error?.message ?? "The local post could not be loaded."}
      </div>
    );
  }

  return <PostEditor post={post} />;
}
