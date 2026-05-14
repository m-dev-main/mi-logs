import type { Post } from "@mi-log/shared";
import type { Collection, ObjectId } from "mongodb";
import { getDb } from "./mongo.js";

/** Collection names (docs/06_DATA_MODEL.md). */
export const COLLECTION_POSTS = "posts" as const;
export const COLLECTION_OWNER_CREDENTIALS = "owner_credentials" as const;
export const COLLECTION_ADMIN_SESSIONS = "admin_sessions" as const;

export type PostDocument = Omit<
  Post,
  "_id" | "createdAt" | "updatedAt" | "publishedAt"
> & {
  _id: ObjectId;
  createdAt: Date | string;
  updatedAt: Date | string;
  publishedAt: Date | string | null;
};

export type OwnerCredentialsDocument = {
  _id: ObjectId;
  credentialId?: string;
  credentialPublicKey?: string;
  counter?: number;
  transports?: string[];
  deviceType?: string;
  backedUp?: boolean;
  createdAt: Date;
  updatedAt: Date;
  currentChallenge?: string;
  currentChallengeExpiresAt?: Date;
};

export type AdminSessionDocument = {
  _id: ObjectId;
  sessionIdHash: string;
  csrfTokenHash: string;
  createdAt: Date;
  expiresAt: Date;
  lastSeenAt: Date;
};

export function getPostsCollection(): Collection<PostDocument> {
  return getDb().collection<PostDocument>(COLLECTION_POSTS);
}

export function getOwnerCredentialsCollection(): Collection<OwnerCredentialsDocument> {
  return getDb().collection<OwnerCredentialsDocument>(
    COLLECTION_OWNER_CREDENTIALS,
  );
}

export function getAdminSessionsCollection(): Collection<AdminSessionDocument> {
  return getDb().collection<AdminSessionDocument>(COLLECTION_ADMIN_SESSIONS);
}
