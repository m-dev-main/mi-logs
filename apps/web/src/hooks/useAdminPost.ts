import { useCallback, useEffect, useState } from "react";
import { getAdminPost, PublicApiError } from "../api/client";
import type { AdminPost } from "../types/api";

type AdminPostState =
  | { status: "loading"; post: null; error: null }
  | { status: "ready"; post: AdminPost; error: null }
  | { status: "error"; post: null; error: PublicApiError };

export function useAdminPost(id: string | undefined) {
  const [state, setState] = useState<AdminPostState>({
    status: "loading",
    post: null,
    error: null,
  });

  const reload = useCallback(async () => {
    if (!id) {
      setState({
        status: "error",
        post: null,
        error: new PublicApiError(
          { code: "INVALID_ADMIN_POST_ID", message: "Post id is missing." },
          0,
        ),
      });
      return;
    }

    setState({ status: "loading", post: null, error: null });

    try {
      const response = await getAdminPost(id);
      setState({ status: "ready", post: response.data, error: null });
    } catch (error) {
      setState({
        status: "error",
        post: null,
        error:
          error instanceof PublicApiError
            ? error
            : new PublicApiError(
                {
                  code: "ADMIN_POST_LOAD_FAILED",
                  message: "Admin post could not be loaded.",
                },
                0,
              ),
      });
    }
  }, [id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
