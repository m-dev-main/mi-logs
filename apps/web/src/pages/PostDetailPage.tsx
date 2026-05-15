import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getPublicPost, listPublicPosts, PublicApiError } from "../api/client";
import { PostMetadataPanel } from "../components/posts/PostMetadataPanel";
import { ReadingControls } from "../components/posts/ReadingControls";
import { ReadingProgress } from "../components/posts/ReadingProgress";
import { RelatedPosts } from "../components/posts/RelatedPosts";
import {
  TableOfContents,
  type TocItem,
} from "../components/posts/TableOfContents";
import { Chip } from "../components/ui/Chip";
import { useReadingPreferences } from "../hooks/useReadingPreferences";
import type { PublicPostDetail, PublicPostListItem } from "../types/api";

type LoadState =
  | { status: "loading" }
  | { status: "ready"; post: PublicPostDetail; posts: PublicPostListItem[] }
  | { status: "error"; message: string };

function formatDate(value: string): string {
  return new Intl.DateTimeFormat(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
  }).format(new Date(value));
}

function stripHtmlToText(html: string): string {
  return html
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugifyHeading(text: string, fallback: string): string {
  const slug = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");

  return slug || fallback;
}

function prepareProse(bodyHtml: string): {
  html: string;
  tocItems: TocItem[];
  bodyText: string;
  wordCount: number;
  readingTimeMinutes: number;
} {
  if (typeof DOMParser === "undefined") {
    const bodyText = stripHtmlToText(bodyHtml);
    const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

    return {
      html: bodyHtml,
      tocItems: [],
      bodyText,
      wordCount,
      readingTimeMinutes: Math.max(1, Math.ceil(wordCount / 220)),
    };
  }

  const document = new DOMParser().parseFromString(bodyHtml, "text/html");
  const usedIds = new Set<string>();
  const tocItems = Array.from(
    document.body.querySelectorAll("h1, h2, h3"),
  ).map((heading, index) => {
    const text = heading.textContent?.trim() ?? `Section ${index + 1}`;
    const baseId = slugifyHeading(text, `section-${index + 1}`);
    let id = baseId;
    let suffix = 2;

    while (usedIds.has(id)) {
      id = `${baseId}-${suffix}`;
      suffix += 1;
    }

    usedIds.add(id);
    heading.setAttribute("id", id);

    return {
      id,
      text,
      level: Number(heading.tagName.slice(1)),
    };
  });
  const bodyText = document.body.textContent?.replace(/\s+/g, " ").trim() ?? "";
  const wordCount = bodyText.split(/\s+/).filter(Boolean).length;

  return {
    html: document.body.innerHTML,
    tocItems,
    bodyText,
    wordCount,
    readingTimeMinutes: Math.max(1, Math.ceil(wordCount / 220)),
  };
}

function getAdjacentPosts(posts: PublicPostListItem[], slug: string) {
  const sortedPosts = [...posts].sort(
    (a, b) =>
      new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
  const index = sortedPosts.findIndex((post) => post.slug === slug);

  return {
    previousPost: index >= 0 ? sortedPosts[index + 1] : undefined,
    nextPost: index > 0 ? sortedPosts[index - 1] : undefined,
  };
}

function getRelatedPosts(
  post: PublicPostDetail,
  posts: PublicPostListItem[],
): PublicPostListItem[] {
  const relatedSlugs = post.relatedSlugs ?? [];
  if (relatedSlugs.length > 0) {
    return relatedSlugs
      .map((slug) => posts.find((candidate) => candidate.slug === slug))
      .filter((candidate): candidate is PublicPostListItem => Boolean(candidate));
  }

  const tags = new Set(post.tags);
  return posts
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => ({
      post: candidate,
      score: candidate.tags.filter((tag) => tags.has(tag)).length,
    }))
    .filter((candidate) => candidate.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        new Date(b.post.publishedAt).getTime() -
          new Date(a.post.publishedAt).getTime(),
    )
    .slice(0, 3)
    .map((candidate) => candidate.post);
}

export function PostDetailPage() {
  const { slug } = useParams();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const { preferences, setPreferences, resetPreferences } = useReadingPreferences();

  useEffect(() => {
    let isMounted = true;

    async function loadPost() {
      if (!slug) {
        setState({ status: "error", message: "Post slug is missing." });
        return;
      }

      try {
        const [response, postsResponse] = await Promise.all([
          getPublicPost(slug),
          listPublicPosts({ limit: 50 }).catch(() => ({ data: [] })),
        ]);
        if (isMounted) {
          setState({
            status: "ready",
            post: response.data,
            posts: postsResponse.data,
          });
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

  const readyPost = state.status === "ready" ? state.post : null;
  const readyPosts = state.status === "ready" ? state.posts : [];
  const bodyHtml = readyPost?.bodyHtml ?? "";
  const slugForAdjacent = readyPost?.slug ?? "";

  const prose = useMemo(() => prepareProse(bodyHtml), [bodyHtml]);
  const { previousPost, nextPost } = useMemo(
    () => getAdjacentPosts(readyPosts, slugForAdjacent),
    [readyPosts, slugForAdjacent],
  );
  const relatedPosts = useMemo(
    () => (readyPost ? getRelatedPosts(readyPost, readyPosts) : []),
    [readyPost, readyPosts],
  );

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
  const readingTimeMinutes = post.readingTimeMinutes ?? prose.readingTimeMinutes;
  const readingClassName = [
    "post-detail",
    `reading-width--${preferences.width}`,
    `reading-font--${preferences.fontScale}`,
    `reading-density--${preferences.density}`,
  ].join(" ");

  return (
    <article className={readingClassName}>
      <ReadingProgress />
      <header className="post-hero">
        <Link className="text-link" to="/">
          Back to posts
        </Link>
        <p className="eyebrow">
          <time dateTime={post.publishedAt}>{formatDate(post.publishedAt)}</time>
        </p>
        <h1>{post.title}</h1>
        <p className="post-hero__excerpt">{post.excerpt}</p>
        <p className="post-hero__reading-time">
          {readingTimeMinutes} {readingTimeMinutes === 1 ? "minute" : "minutes"} read
          <span aria-hidden="true"> / </span>
          {prose.wordCount} words
        </p>
        <div className="chip-row" aria-label="Tags">
          {post.tags.map((tag) => (
            <Link
              key={tag}
              className="tag-link"
              to={`/search?tag=${encodeURIComponent(tag)}`}
            >
              <Chip label={tag} />
            </Link>
          ))}
        </div>
      </header>

      <div className="post-detail__grid">
        <div
          className="prose"
          dangerouslySetInnerHTML={{ __html: prose.html }}
        />
        <aside className="post-detail__aside" aria-label="Post tools and metadata">
          <ReadingControls
            onChange={setPreferences}
            onReset={resetPreferences}
            preferences={preferences}
          />
          <TableOfContents items={prose.tocItems} />
          <PostMetadataPanel
            post={post}
            readingTimeMinutes={readingTimeMinutes}
            wordCount={prose.wordCount}
          />
        </aside>
      </div>
      <RelatedPosts
        nextPost={nextPost}
        posts={relatedPosts}
        previousPost={previousPost}
      />
    </article>
  );
}
