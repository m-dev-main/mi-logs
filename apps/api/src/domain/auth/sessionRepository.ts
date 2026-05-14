import { ObjectId } from "mongodb";
import {
  getAdminSessionsCollection,
  type AdminSessionDocument,
} from "../../db/collections.js";

export async function createAdminSession(input: {
  sessionIdHash: string;
  csrfTokenHash: string;
  expiresAt: Date;
}): Promise<AdminSessionDocument> {
  const now = new Date();
  const session: AdminSessionDocument = {
    _id: new ObjectId(),
    sessionIdHash: input.sessionIdHash,
    csrfTokenHash: input.csrfTokenHash,
    createdAt: now,
    expiresAt: input.expiresAt,
    lastSeenAt: now,
  };

  await getAdminSessionsCollection().insertOne(session);
  return session;
}

export async function findAdminSessionByHash(
  sessionIdHash: string,
): Promise<AdminSessionDocument | null> {
  return getAdminSessionsCollection().findOne({ sessionIdHash });
}

export async function touchAdminSession(sessionIdHash: string): Promise<void> {
  await getAdminSessionsCollection().updateOne(
    { sessionIdHash },
    { $set: { lastSeenAt: new Date() } },
  );
}

export async function rotateAdminSessionCsrf(input: {
  sessionIdHash: string;
  csrfTokenHash: string;
}): Promise<void> {
  await getAdminSessionsCollection().updateOne(
    { sessionIdHash: input.sessionIdHash },
    {
      $set: {
        csrfTokenHash: input.csrfTokenHash,
        lastSeenAt: new Date(),
      },
    },
  );
}

export async function deleteAdminSessionByHash(
  sessionIdHash: string,
): Promise<void> {
  await getAdminSessionsCollection().deleteOne({ sessionIdHash });
}
