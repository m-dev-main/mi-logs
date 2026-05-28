import type {
  AuthenticationResponseJSON,
  PublicKeyCredentialCreationOptionsJSON,
  PublicKeyCredentialRequestOptionsJSON,
  RegistrationResponseJSON,
} from "@simplewebauthn/browser";
import type {
  AdminSessionResponse,
  AdminPostInput,
  AdminPostListResponse,
  AdminPostResponse,
  AdminPostUpdateInput,
  ApiError,
  ApiErrorResponse,
  ApiStatusResponse,
  DeletePostResponse,
  ExportReleaseResponse,
  LogoutResponse,
  ProofManifestPost,
  PublicPostDetail,
  PublicPostDetailResponse,
  PublicPostListResponse,
  PublicPostSearchItem,
} from "../types/api";

let adminCsrfToken: string | null = null;

export function setAdminCsrfToken(token: string | null): void {
  adminCsrfToken = token;
}

type StaticPostsPayload = {
  posts: PublicPostSearchItem[];
  details: Record<string, PublicPostDetail>;
};

export type ProofDataSource = "api" | "static";

export type ProofManifestData = {
  project: "mi-log";
  generatedAt: string;
  version: 1;
  posts: ProofManifestPost[];
  onion: string | null;
  ipfsCid: string | null;
};

export type ProofData = {
  manifest: ProofManifestData;
  signature: string | null;
  authorPublicKey: string | null;
  releaseSha256: string | null;
  algorithm: "Ed25519";
  source: ProofDataSource;
  signed: boolean;
};

export type ProofDataResponse = {
  data: ProofData;
};

export type PublicPostListOptions = {
  q?: string;
  tag?: string;
  page?: number;
  limit?: number;
};

export class PublicApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(error: ApiError, status: number) {
    super(error.message);
    this.name = "PublicApiError";
    this.code = error.code;
    this.status = status;
  }
}

async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.length === 0) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    throw new PublicApiError(
      { code: "INVALID_RESPONSE", message: "The API returned invalid JSON." },
      response.status,
    );
  }
}

function looksLikeHtml(text: string): boolean {
  const trimmed = text.trimStart().toLowerCase();
  return trimmed.startsWith("<!doctype html") || trimmed.startsWith("<html");
}

async function fetchStaticJson<T>(path: string): Promise<T | null> {
  let response: Response;

  try {
    response = await fetch(path, {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const text = await response.text();
  if (text.length === 0 || looksLikeHtml(text)) {
    return null;
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    return null;
  }
}

async function fetchStaticText(path: string): Promise<string | null> {
  let response: Response;

  try {
    response = await fetch(path, {
      headers: { Accept: "text/plain" },
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const text = await response.text();
  return text.length === 0 || looksLikeHtml(text) ? null : text;
}

function isStaticPostsPayload(value: unknown): value is StaticPostsPayload {
  return (
    typeof value === "object" &&
    value !== null &&
    Array.isArray((value as StaticPostsPayload).posts) &&
    typeof (value as StaticPostsPayload).details === "object" &&
    (value as StaticPostsPayload).details !== null
  );
}

function buildPostsQueryString(options: PublicPostListOptions = {}): string {
  const params = new URLSearchParams();
  const q = options.q?.trim();
  const tag = options.tag?.trim();

  if (q) {
    params.set("q", q);
  }
  if (tag) {
    params.set("tag", tag);
  }
  if (options.page !== undefined) {
    params.set("page", String(options.page));
  }
  if (options.limit !== undefined) {
    params.set("limit", String(options.limit));
  }

  const query = params.toString();
  return query ? `?${query}` : "";
}

function staticPostMatches(
  post: PublicPostSearchItem,
  options: PublicPostListOptions,
): boolean {
  const tag = options.tag?.trim();
  if (tag && !post.tags.includes(tag)) {
    return false;
  }

  const q = options.q?.trim().toLowerCase();
  if (!q) {
    return true;
  }

  const searchableText = [
    post.title,
    post.excerpt,
    post.tags.join(" "),
    post.bodyText ?? "",
  ]
    .join(" ")
    .toLowerCase();

  return searchableText.includes(q);
}

function listStaticPosts(
  payload: StaticPostsPayload,
  options: PublicPostListOptions,
): PublicPostListResponse {
  const page = Math.max(1, options.page ?? 1);
  const limit = Math.min(Math.max(1, options.limit ?? 10), 50);
  const matches = payload.posts.filter((post) => staticPostMatches(post, options));
  const start = (page - 1) * limit;
  const data = matches.slice(start, start + limit).map((post) => ({
    title: post.title,
    slug: post.slug,
    excerpt: post.excerpt,
    tags: post.tags,
    publishedAt: post.publishedAt,
    contentSha256: post.contentSha256,
    canonicalVersion: post.canonicalVersion,
  }));

  return {
    data,
    meta: {
      page,
      limit,
      total: matches.length,
      hasNextPage: page * limit < matches.length,
    },
  };
}

async function loadStaticPosts(): Promise<StaticPostsPayload | null> {
  const value = await fetchStaticJson<StaticPostsPayload>("/mi-log-data/posts.json");

  return isStaticPostsPayload(value) ? value : null;
}

function normalizeOptionalText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function isProofManifestPost(value: unknown): value is ProofManifestPost {
  if (typeof value !== "object" || value === null) {
    return false;
  }

  const post = value as Record<string, unknown>;
  return (
    typeof post.slug === "string" &&
    typeof post.contentSha256 === "string" &&
    typeof post.canonicalVersion === "number" &&
    Number.isFinite(post.canonicalVersion) &&
    typeof post.publishedAt === "string"
  );
}

function normalizeProofManifest(value: unknown): ProofManifestData | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const manifest = value as Record<string, unknown>;
  const version = manifest.version ?? manifest.releaseVersion;
  const generatedAt = manifest.generatedAt;
  const posts = manifest.posts;

  if (
    manifest.project !== "mi-log" ||
    version !== 1 ||
    typeof generatedAt !== "string" ||
    !Array.isArray(posts) ||
    !posts.every((post) => isProofManifestPost(post))
  ) {
    return null;
  }

  return {
    project: "mi-log",
    generatedAt,
    version: 1,
    posts,
    onion: normalizeOptionalText(manifest.onion),
    ipfsCid: normalizeOptionalText(manifest.ipfsCid),
  };
}

function normalizeProofPayload(
  value: unknown,
): Omit<ProofData, "releaseSha256" | "source" | "signed"> | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const response = value as Record<string, unknown>;
  const payload = response.data;

  if (typeof payload !== "object" || payload === null) {
    return null;
  }

  const proof = payload as Record<string, unknown>;
  const manifest = normalizeProofManifest(proof.manifest);

  if (manifest === null) {
    return null;
  }

  return {
    manifest,
    signature: normalizeOptionalText(proof.signature),
    authorPublicKey: normalizeOptionalText(proof.authorPublicKey),
    algorithm: proof.algorithm === "Ed25519" ? "Ed25519" : "Ed25519",
  };
}

async function loadProofFromApi(): Promise<
  Omit<ProofData, "releaseSha256" | "source" | "signed"> | null
> {
  let response: Response;

  try {
    response = await fetch("/api/v1/proof", {
      headers: { Accept: "application/json" },
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch {
    return null;
  }

  if (!response.ok) {
    return null;
  }

  const contentType = response.headers.get("content-type")?.toLowerCase() ?? "";
  if (!contentType.includes("application/json")) {
    return null;
  }

  let payload: unknown;
  try {
    payload = (await response.json()) as unknown;
  } catch {
    return null;
  }

  const normalized = normalizeProofPayload(payload);
  if (normalized === null) {
    return null;
  }

  return normalized;
}

async function loadStaticProof(): Promise<ProofDataResponse | null> {
  const manifest = normalizeProofManifest(
    await fetchStaticJson<unknown>("/sovereign-manifest.json"),
  );

  if (manifest === null) {
    return null;
  }

  const [signatureText, authorPublicKeyText, releaseSha256Text] = await Promise.all([
    fetchStaticText("/sovereign-manifest.sig"),
    fetchStaticText("/author.pub"),
    fetchStaticText("/release-sha256.txt"),
  ]);
  const signature = normalizeOptionalText(signatureText);
  const authorPublicKey = normalizeOptionalText(authorPublicKeyText);
  const releaseSha256 = normalizeOptionalText(releaseSha256Text);

  return {
    data: {
      manifest,
      signature,
      authorPublicKey,
      releaseSha256,
      algorithm: "Ed25519",
      source: "static",
      signed: signature !== null,
    },
  };
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== "object" || value === null || !("error" in value)) {
    return false;
  }

  const error = (value as { error: unknown }).error;
  return (
    typeof error === "object" &&
    error !== null &&
    typeof (error as ApiError).code === "string" &&
    typeof (error as ApiError).message === "string"
  );
}

type JsonRequestOptions = {
  method?: "GET" | "POST" | "PATCH" | "DELETE";
  body?: unknown;
  csrf?: boolean;
  /** Sent as Authorization: Bearer (first-time owner registration only). */
  authorizationBearer?: string;
};

const DESKTOP_BRIDGE_ENABLED =
  import.meta.env.VITE_MI_LOG_DESKTOP_BUILD === "true";

function isDesktopAdminPath(path: string): boolean {
  return path.startsWith("/api/v1/auth/") || path.startsWith("/api/v1/admin/");
}

async function requestJsonViaDesktop<T>(
  path: string,
  options: JsonRequestOptions,
  headers: Record<string, string>,
): Promise<T> {
  if (!window.miLogDesktop) {
    throw new PublicApiError(
      {
        code: "DESKTOP_BRIDGE_UNAVAILABLE",
        message: "Desktop bridge unavailable.",
      },
      0,
    );
  }

  let response;
  try {
    response = await window.miLogDesktop.admin.request({
      path,
      method: options.method ?? "GET",
      headers,
      body: options.body,
    });
  } catch {
    throw new PublicApiError(
      {
        code: "DESKTOP_PROXY_ERROR",
        message: "Unable to reach the desktop admin proxy.",
      },
      0,
    );
  }

  const payload = response.body;

  if (!response.ok) {
    if (isApiErrorResponse(payload)) {
      throw new PublicApiError(payload.error, response.status);
    }

    throw new PublicApiError(
      { code: "API_ERROR", message: "The API request failed." },
      response.status,
    );
  }

  return payload as T;
}

async function requestJson<T>(
  path: string,
  options: JsonRequestOptions = {},
): Promise<T> {
  let response: Response;
  const headers: Record<string, string> = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.csrf && adminCsrfToken) {
    headers["X-MI-LOG-CSRF"] = adminCsrfToken;
  }

  if (
    typeof options.authorizationBearer === "string" &&
    options.authorizationBearer.length > 0
  ) {
    headers["Authorization"] = `Bearer ${options.authorizationBearer}`;
  }

  if (DESKTOP_BRIDGE_ENABLED && window.miLogDesktop && isDesktopAdminPath(path)) {
    return await requestJsonViaDesktop<T>(path, options, headers);
  }

  try {
    response = await fetch(path, {
      method: options.method ?? "GET",
      headers,
      credentials: "same-origin",
      body:
        options.body === undefined ? undefined : JSON.stringify(options.body),
    });
  } catch {
    throw new PublicApiError(
      {
        code: "NETWORK_ERROR",
        message: "Unable to reach the local public API.",
      },
      0,
    );
  }

  const payload = await readJson(response);

  if (!response.ok) {
    if (isApiErrorResponse(payload)) {
      throw new PublicApiError(payload.error, response.status);
    }

    throw new PublicApiError(
      { code: "API_ERROR", message: "The API request failed." },
      response.status,
    );
  }

  return payload as T;
}

async function requireDesktopPrivilegedAction(reason: string): Promise<void> {
  if (!window.miLogDesktop) {
    return;
  }

  await window.miLogDesktop.lock.requireBiometric(reason);
}

export async function listPublicPosts(
  options: PublicPostListOptions = {},
): Promise<PublicPostListResponse> {
  try {
    return await requestJson<PublicPostListResponse>(
      `/api/v1/posts${buildPostsQueryString(options)}`,
    );
  } catch (error) {
    const staticPosts = await loadStaticPosts();
    if (staticPosts !== null) {
      return listStaticPosts(staticPosts, options);
    }

    throw error;
  }
}

export async function getPublicPost(
  slug: string,
): Promise<PublicPostDetailResponse> {
  try {
    return await requestJson<PublicPostDetailResponse>(
      `/api/v1/posts/${encodeURIComponent(slug)}`,
    );
  } catch (error) {
    const staticPosts = await loadStaticPosts();
    const post = staticPosts?.details[slug];
    if (post) {
      return { data: post };
    }

    if (staticPosts !== null) {
      throw new PublicApiError(
        { code: "POST_NOT_FOUND", message: "Post not found" },
        404,
      );
    }

    throw error;
  }
}

export async function getApiStatus(): Promise<ApiStatusResponse> {
  try {
    return await requestJson<ApiStatusResponse>("/api/v1/status");
  } catch (error) {
    const staticPosts = await loadStaticPosts();
    if (staticPosts !== null) {
      return {
        app: "mi-log-web",
        status: "static",
        mongo: { connected: false },
      };
    }

    throw error;
  }
}

export async function getProof(): Promise<ProofDataResponse> {
  const apiProof = await loadProofFromApi();
  if (apiProof !== null) {
    const releaseSha256 = normalizeOptionalText(
      await fetchStaticText("/release-sha256.txt"),
    );
    return {
      data: {
        ...apiProof,
        releaseSha256,
        source: "api",
        signed: apiProof.signature !== null,
      },
    };
  }

  const staticProof = await loadStaticProof();
  if (staticProof !== null) {
    return staticProof;
  }

  throw new PublicApiError(
    {
      code: "PROOF_UNAVAILABLE",
      message: "Proof data unavailable. Run pnpm release and serve the readonly release again.",
    },
    404,
  );
}

export async function getAdminSession(): Promise<AdminSessionResponse> {
  const response = await requestJson<AdminSessionResponse>("/api/v1/auth/session");
  setAdminCsrfToken(response.data.authenticated ? response.data.csrfToken : null);
  return response;
}

export function getRegisterOptions(
  ownerRegistrationBearer?: string,
): Promise<{ data: PublicKeyCredentialCreationOptionsJSON }> {
  return requestJson<{ data: PublicKeyCredentialCreationOptionsJSON }>(
    "/api/v1/auth/webauthn/register/options",
    {
      method: "POST",
      ...(typeof ownerRegistrationBearer === "string" &&
      ownerRegistrationBearer.length > 0
        ? { authorizationBearer: ownerRegistrationBearer }
        : {}),
    },
  );
}

export async function verifyRegister(
  input: RegistrationResponseJSON,
  ownerRegistrationBearer?: string,
): Promise<AdminSessionResponse> {
  const response = await requestJson<AdminSessionResponse>(
    "/api/v1/auth/webauthn/register/verify",
    {
      method: "POST",
      body: input,
      ...(typeof ownerRegistrationBearer === "string" &&
      ownerRegistrationBearer.length > 0
        ? { authorizationBearer: ownerRegistrationBearer }
        : {}),
    },
  );
  setAdminCsrfToken(response.data.authenticated ? response.data.csrfToken : null);
  return response;
}

export function getLoginOptions(): Promise<{
  data: PublicKeyCredentialRequestOptionsJSON;
}> {
  return requestJson<{ data: PublicKeyCredentialRequestOptionsJSON }>(
    "/api/v1/auth/webauthn/login/options",
    { method: "POST" },
  );
}

export async function verifyLogin(
  input: AuthenticationResponseJSON,
): Promise<AdminSessionResponse> {
  const response = await requestJson<AdminSessionResponse>(
    "/api/v1/auth/webauthn/login/verify",
    { method: "POST", body: input },
  );
  setAdminCsrfToken(response.data.authenticated ? response.data.csrfToken : null);
  return response;
}

export async function logoutAdmin(): Promise<LogoutResponse> {
  const response = await requestJson<LogoutResponse>("/api/v1/auth/logout", {
    method: "POST",
  });
  setAdminCsrfToken(null);
  return response;
}

export function listAdminPosts(): Promise<AdminPostListResponse> {
  return requestJson<AdminPostListResponse>("/api/v1/admin/posts");
}

export function getAdminPost(id: string): Promise<AdminPostResponse> {
  return requestJson<AdminPostResponse>(
    `/api/v1/admin/posts/${encodeURIComponent(id)}`,
  );
}

export function createAdminPost(input: AdminPostInput): Promise<AdminPostResponse> {
  return requestJson<AdminPostResponse>("/api/v1/admin/posts", {
    method: "POST",
    csrf: true,
    body: input,
  });
}

export function updateAdminPost(
  id: string,
  input: AdminPostUpdateInput,
): Promise<AdminPostResponse> {
  return requestJson<AdminPostResponse>(
    `/api/v1/admin/posts/${encodeURIComponent(id)}`,
    {
      method: "PATCH",
      csrf: true,
      body: input,
    },
  );
}

export function publishAdminPost(id: string): Promise<AdminPostResponse> {
  return requestJson<AdminPostResponse>(
    `/api/v1/admin/posts/${encodeURIComponent(id)}/publish`,
    { method: "POST", csrf: true },
  );
}

export function unpublishAdminPost(id: string): Promise<AdminPostResponse> {
  return requestJson<AdminPostResponse>(
    `/api/v1/admin/posts/${encodeURIComponent(id)}/unpublish`,
    { method: "POST", csrf: true },
  );
}

export async function deleteAdminPost(id: string): Promise<DeletePostResponse> {
  await requireDesktopPrivilegedAction("Confirm deleting this local post.");

  return requestJson<DeletePostResponse>(
    `/api/v1/admin/posts/${encodeURIComponent(id)}`,
    { method: "DELETE", csrf: true },
  );
}

export function exportAdminRelease(): Promise<ExportReleaseResponse> {
  return requestJson<ExportReleaseResponse>("/api/v1/admin/release/export", {
    method: "POST",
    csrf: true,
  });
}
