export type ApiErrorCode = "INVALID_QUERY" | "POST_NOT_FOUND" | string;

export type ApiError = {
  code: ApiErrorCode;
  message: string;
};

export type ApiErrorResponse = {
  error: ApiError;
};

export type PublicPostListItem = {
  title: string;
  slug: string;
  excerpt: string;
  tags: string[];
  publishedAt: string;
  contentSha256: string;
  canonicalVersion: number;
};

export type PublicPostDetail = PublicPostListItem & {
  bodyHtml: string;
  bodyText?: string;
  readingTimeMinutes?: number;
  relatedSlugs?: string[];
  previousSlug?: string | null;
  nextSlug?: string | null;
};

export type PublicPostSearchItem = PublicPostListItem & {
  bodyText?: string;
  readingTimeMinutes?: number;
  relatedSlugs?: string[];
  previousSlug?: string | null;
  nextSlug?: string | null;
};

export type PublicPostListResponse = {
  data: PublicPostListItem[];
  meta: {
    page: number;
    limit: number;
    total: number;
    hasNextPage: boolean;
  };
};

export type PublicPostDetailResponse = {
  data: PublicPostDetail;
};

export type ApiStatusResponse = {
  app: string;
  status: string;
  mongo?: {
    connected: boolean;
  };
};

export type PostStatus = "draft" | "published" | "archived";

export type AdminPost = {
  _id: string;
  title: string;
  slug: string;
  excerpt: string;
  bodyMarkdown: string;
  bodyHtml: string;
  status: PostStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
  contentSha256: string;
  canonicalVersion: number;
};

export type AdminPostListResponse = {
  data: AdminPost[];
};

export type AdminPostResponse = {
  data: AdminPost;
};

export type AdminPostInput = {
  title: string;
  slug?: string;
  excerpt: string;
  bodyMarkdown: string;
  tags: string[];
};

export type AdminPostUpdateInput = Partial<AdminPostInput>;

export type DeletePostResponse = {
  data: {
    deleted: true;
  };
};

export type AdminSessionStatus =
  | {
      authenticated: true;
      registered: true;
      csrfToken: string;
      expiresAt: string;
    }
  | {
      authenticated: false;
      registered: boolean;
      csrfToken: null;
      expiresAt: null;
    };

export type AdminSessionResponse = {
  data: AdminSessionStatus;
};

export type LogoutResponse = {
  data: {
    ok: true;
  };
};

export type ProofManifestPost = {
  slug: string;
  contentSha256: string;
  canonicalVersion: number;
  publishedAt: string;
};

export type ProofManifest = {
  project: "mi-log";
  generatedAt: string;
  version: 1;
  posts: ProofManifestPost[];
  onion: null;
  ipfsCid: null;
};

export type ProofPayload = {
  manifest: ProofManifest;
  signature: string | null;
  authorPublicKey: string | null;
  algorithm: "Ed25519";
};

export type ProofResponse = {
  data: ProofPayload;
};
