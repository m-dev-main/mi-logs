import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createAdminPost, PublicApiError } from "../../api/client";
import { AdminNotAvailablePage } from "./AdminNotAvailablePage";

export function AdminNewPostPage() {
  const navigate = useNavigate();
  const hasCreatedRef = useRef(false);
  const [error, setError] = useState<PublicApiError | null>(null);

  useEffect(() => {
    if (hasCreatedRef.current) {
      return;
    }

    hasCreatedRef.current = true;

    async function createDraft() {
      try {
        const timestamp = new Date().toISOString();
        const response = await createAdminPost({
          title: `Untitled draft ${timestamp}`,
          excerpt: "",
          bodyMarkdown: "",
          tags: [],
        });
        navigate(`/admin/posts/${response.data._id}`, { replace: true });
      } catch (nextError) {
        setError(
          nextError instanceof PublicApiError
            ? nextError
            : new PublicApiError(
                {
                  code: "ADMIN_DRAFT_CREATE_FAILED",
                  message: "A new draft could not be created.",
                },
                0,
              ),
        );
      }
    }

    void createDraft();
  }, [navigate]);

  if (error?.code === "LOCALHOST_ONLY") {
    return <AdminNotAvailablePage />;
  }

  if (error) {
    return (
      <div className="error-state" role="alert">
        {error.message}
      </div>
    );
  }

  return (
    <div className="loading-state" role="status">
      Creating a local draft...
    </div>
  );
}
