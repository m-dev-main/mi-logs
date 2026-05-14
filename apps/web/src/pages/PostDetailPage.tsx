import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPublicPost, PublicApiError } from "../api/client";
import { PostMetadataPanel } from "../components/posts/PostMetadataPanel";
import { Chip } from "../components/ui/Chip";
import type { PublicPostDetail } from "../types/api";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; post: PublicPostDetail }
  | { status: "error"; message: string };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

export function PostDetailPage() {
  const { slug } = useParams();
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let isMounted = true;

    async function loadPost() {
      if (!slug) {
        setState({ status: "error", message: "Post slug is missing." });
        return;
      }

      try {
        const response = await getPublicPost(slug);
        if (isMounted) {
          setState({ status: "ready", post: response.data });
        }
      } catch (error) {
        const message =
          error instanceof PublicApiError
            ? error.message
            : "The post could not be loaded.";

        if (isMounted) {
          setState({ status: "error", message });
        }
      }
    }

    setState({ status: "loading" });
    void loadPost();

    return () => {
      isMounted = false;
    };
  }, [slug]);

  if (state.status === "loading") {
    return (
      <div className="page-stack">
        <div className="loading-state" role="status">
          Loading post...
        </div>
      </div>
    );
  }

  if (state.status === "error") {
    return (
      <div className="page-stack readable-panel" role="alert">
        <p className="eyebrow">Post unavailable</p>
        <h1>{state.message}</h1>
        <Link className="text-link" to="/">
          Return to latest posts
        </Link>
      </div>
    );
  }

  const { post } = state;

  return (
    <article className="post-detail">
      <header className="post-hero">
        <Link className="text-link" to="/">
          Back to posts
        </Link>
        <p className="eyebrow">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        </p>
        <h1>{post.title}</h1>
        <p className="post-hero__excerpt">{post.excerpt}</p>
        <div className="chip-row" aria-label="Tags">
          {post.tags.map((tag) => (
            <Chip key={tag} label={tag} />
          ))}
        </div>
      </header>

      <div className="post-detail__grid">
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: post.bodyHtml }}
        />
        <aside aria-label="Post metadata">
          <PostMetadataPanel post={post} />
        </aside>
      </div>
    </article>
  );
}
