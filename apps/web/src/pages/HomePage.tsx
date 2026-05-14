import { useEffect, useMemo, useState } from "react";
import { getApiStatus, listPublicPosts, PublicApiError } from "../api/client";
import { PostList } from "../components/posts/PostList";
import { Chip } from "../components/ui/Chip";
import { StatusBadge } from "../components/ui/StatusBadge";
import type { PublicPostListItem } from "../types/api";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; posts: PublicPostListItem[]; apiConnected: boolean }
  | { status: "error"; message: string };

export function HomePage() {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function loadHome() {
      try {
        const [postsResponse, statusResponse] = await Promise.all([
          listPublicPosts(),
          getApiStatus(),
        ]);

        if (isMounted) {
          setState({
            status: "ready",
            posts: postsResponse.data,
            apiConnected: statusResponse.mongo?.connected === true,
          });
        }
      } catch (error) {
        const message =
          error instanceof PublicApiError
            ? error.message
            : "The public API could not be loaded.";

        if (isMounted) {
          setState({ status: "error", message });
        }
      }
    }

    void loadHome();

    return () => {
      isMounted = false;
    };
  }, []);

  const tags = useMemo(() => {
    if (state.status !== "ready") {
      return [];
    }

    return [...new Set(state.posts.flatMap((post) => post.tags))].sort();
  }, [state]);

  return (
    <div className="page-stack">
      <section className="hero-panel" aria-labelledby="home-title">
        <div>
          <p className="eyebrow">Readonly public surface</p>
          <h1 id="home-title">mi-log</h1>
          <p className="hero-panel__lede">
            A local-first publishing node for notes that can remain readable
            without asking DNS, analytics, or public accounts for permission.
          </p>
        </div>
        <StatusBadge tone={state.status === "ready" ? "success" : "neutral"}>
          {state.status === "ready" && state.apiConnected
            ? "local api connected"
            : "public reader mode"}
        </StatusBadge>
      </section>

      <section className="content-grid" aria-label="Posts and tags">
        <div className="content-grid__main">
          <div className="section-heading">
            <p className="eyebrow">Latest posts</p>
            <h2>Published notes</h2>
          </div>
          {state.status === "loading" ? (
            <div className="loading-state" role="status">
              Loading published posts...
            </div>
          ) : state.status === "error" ? (
            <div className="error-state" role="alert">
              {state.message}
            </div>
          ) : (
            <PostList posts={state.posts} />
          )}
        </div>

        <aside className="content-grid__aside" aria-labelledby="tags-title">
          <div className="side-panel">
            <h2 id="tags-title">Tags</h2>
            {tags.length > 0 ? (
              <div className="chip-row">
                {tags.map((tag) => (
                  <Chip key={tag} label={tag} />
                ))}
              </div>
            ) : (
              <p>Tags appear once posts are published.</p>
            )}
          </div>
        </aside>
      </section>
    </div>
  );
}
