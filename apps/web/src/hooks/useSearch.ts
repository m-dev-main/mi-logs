import { useEffect, useMemo, useState } from "react";
import { listPublicPosts, PublicApiError } from "../api/client";
import type { PublicPostListItem } from "../types/api";
import { useDebouncedValue } from "./useDebouncedValue";

type SearchLoadState =
  | { status: "loading"; posts: PublicPostListItem[]; total: number; error: null }
  | { status: "ready"; posts: PublicPostListItem[]; total: number; error: null }
  | { status: "error"; posts: PublicPostListItem[]; total: number; error: string };

type UseSearchOptions = {
  query: string;
  tag: string;
};

export function useSearch({ query, tag }: UseSearchOptions) {
  const debouncedQuery = useDebouncedValue(query, 220);
  const [state, setState] = useState<SearchLoadState>({
    status: "loading",
    posts: [],
    total: 0,
    error: null,
  });
  const [allPosts, setAllPosts] = useState<PublicPostListItem[]>([]);

  useEffect(() => {
    let isMounted = true;

    async function loadTags() {
      try {
        const response = await listPublicPosts({ limit: 50 });
        if (isMounted) {
          setAllPosts(response.data);
        }
      } catch {
        if (isMounted) {
          setAllPosts([]);
        }
      }
    }

    void loadTags();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    async function loadResults() {
      setState((current) => ({
        status: "loading",
        posts: current.posts,
        total: current.total,
        error: null,
      }));

      try {
        const response = await listPublicPosts({
          q: debouncedQuery,
          tag,
          limit: 50,
        });

        if (isMounted) {
          setState({
            status: "ready",
            posts: response.data,
            total: response.meta.total,
            error: null,
          });
        }
      } catch (error) {
        const message =
          error instanceof PublicApiError
            ? error.message
            : "Search results could not be loaded.";

        if (isMounted) {
          setState({
            status: "error",
            posts: [],
            total: 0,
            error: message,
          });
        }
      }
    }

    void loadResults();

    return () => {
      isMounted = false;
    };
  }, [debouncedQuery, tag]);

  const tags = useMemo(
    () => [...new Set(allPosts.flatMap((post) => post.tags))].sort(),
    [allPosts],
  );

  return {
    ...state,
    tags,
    debouncedQuery,
    isDebouncing: debouncedQuery !== query,
  };
}
