import { useCallback, useEffect, useState } from "react";
import { listAdminPosts, PublicApiError } from "../api/client";
import type { AdminPost } from "../types/api";

type AdminPostsState =
  | { status: "loading"; posts: AdminPost[]; error: null }
  | { status: "ready"; posts: AdminPost[]; error: null }
  | { status: "error"; posts: AdminPost[]; error: PublicApiError };

export function useAdminPosts() {
  const [state, setState] = useState<AdminPostsState>({
    status: "loading",
    posts: [],
    error: null,
  });

  const reload = useCallback(async () => {
    setState((current) => ({
      status: "loading",
      posts: current.posts,
      error: null,
    }));

    try {
      const response = await listAdminPosts();
      setState({ status: "ready", posts: response.data, error: null });
    } catch (error) {
      setState({
        status: "error",
        posts: [],
        error:
          error instanceof PublicApiError
            ? error
            : new PublicApiError(
                {
                  code: "ADMIN_POSTS_LOAD_FAILED",
                  message: "Admin posts could not be loaded.",
                },
                0,
              ),
      });
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { ...state, reload };
}
