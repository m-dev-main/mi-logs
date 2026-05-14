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
  LogoutResponse,
  ProofManifest,
  ProofResponse,
  PublicPostDetail,
  PublicPostDetailResponse,
  PublicPostListItem,
  PublicPostListResponse,
} from "../types/api";

let adminCsrfToken: string | null = null;
let staticPostsPromise: Promise<StaticPostsPayload | null> | null = null;

export function setAdminCsrfToken(token: string | null): void {
  adminCsrfToken = token;
}

type StaticPostsPayload = {
  posts: PublicPostListItem[];
  details: Record<string, PublicPostDetail>;
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

async function loadStaticPosts(): Promise<StaticPostsPayload | null> {
  staticPostsPromise ??= fetchStaticJson<StaticPostsPayload>(
    "/mi-log-data/posts.json",
  ).then((value) => (isStaticPostsPayload(value) ? value : null));

  return staticPostsPromise;
}

type StaticProofManifest = Omit<ProofManifest, "version"> & {
  version?: 1;
  releaseVersion?: 1;
};

function normalizeStaticManifest(value: unknown): ProofManifest | null {
  if (typeof value !== "object" || value === null) {
    return null;
  }

  const manifest = value as StaticProofManifest;
  const version = manifest.version ?? manifest.releaseVersion;

  if (
    manifest.project !== "mi-log" ||
    version !== 1 ||
    typeof manifest.generatedAt !== "string" ||
    !Array.isArray(manifest.posts)
  ) {
    return null;
  }

  return {
    project: "mi-log",
    generatedAt: manifest.generatedAt,
    version,
    posts: manifest.posts,
    onion: manifest.onion ?? null,
    ipfsCid: manifest.ipfsCid ?? null,
  };
}

async function loadStaticProof(): Promise<ProofResponse | null> {
  const manifest = normalizeStaticManifest(
    await fetchStaticJson<StaticProofManifest>("/sovereign-manifest.json"),
  );

  if (manifest === null) {
    return null;
  }

  const [signatureText, authorPublicKey] = await Promise.all([
    fetchStaticText("/sovereign-manifest.sig"),
    fetchStaticText("/author.pub"),
  ]);
  const signature = signatureText?.trim() ?? "";

  return {
    data: {
      manifest,
      signature: signature.length > 0 ? signature : null,
      authorPublicKey,
      algorithm: "Ed25519",
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
};

async function requestJson<T>(
  path: string,
  options: JsonRequestOptions = {},
): Promise<T> {
  let response: Response;
  const headers: HeadersInit = {
    Accept: "application/json",
  };

  if (options.body !== undefined) {
    headers["Content-Type"] = "application/json";
  }

  if (options.csrf && adminCsrfToken) {
    headers["X-MI-LOG-CSRF"] = adminCsrfToken;
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

export async function listPublicPosts(): Promise<PublicPostListResponse> {
  try {
    return await requestJson<PublicPostListResponse>("/api/v1/posts");
  } catch (error) {
    const staticPosts = await loadStaticPosts();
    if (staticPosts !== null) {
      return {
        data: staticPosts.posts,
        meta: {
          page: 1,
          limit: staticPosts.posts.length,
          total: staticPosts.posts.length,
          hasNextPage: false,
        },
      };
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

export async function getProof(): Promise<ProofResponse> {
  try {
    return await requestJson<ProofResponse>("/api/v1/proof");
  } catch (error) {
    const staticProof = await loadStaticProof();
    if (staticProof !== null) {
      return staticProof;
    }

    throw error;
  }
}

export async function getAdminSession(): Promise<AdminSessionResponse> {
  const response = await requestJson<AdminSessionResponse>("/api/v1/auth/session");
  setAdminCsrfToken(response.data.authenticated ? response.data.csrfToken : null);
  return response;
}

export function getRegisterOptions(): Promise<{
  data: PublicKeyCredentialCreationOptionsJSON;
}> {
  return requestJson<{ data: PublicKeyCredentialCreationOptionsJSON }>(
    "/api/v1/auth/webauthn/register/options",
    { method: "POST" },
  );
}

export async function verifyRegister(
  input: RegistrationResponseJSON,
): Promise<AdminSessionResponse> {
  const response = await requestJson<AdminSessionResponse>(
    "/api/v1/auth/webauthn/register/verify",
    { method: "POST", body: input },
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

export function deleteAdminPost(id: string): Promise<DeletePostResponse> {
  return requestJson<DeletePostResponse>(
    `/api/v1/admin/posts/${encodeURIComponent(id)}`,
    { method: "DELETE", csrf: true },
  );
}
