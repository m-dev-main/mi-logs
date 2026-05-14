import { ObjectId } from "mongodb";
import {
  getOwnerCredentialsCollection,
  type OwnerCredentialsDocument,
} from "../../db/collections.js";

const CHALLENGE_ONLY_FILTER = { credentialId: { $exists: false } };

export async function hasOwnerCredential(): Promise<boolean> {
  const count = await getOwnerCredentialsCollection().countDocuments(
    { credentialId: { $exists: true } },
    { limit: 1 },
  );
  return count > 0;
}

export async function findOwnerCredential(): Promise<OwnerCredentialsDocument | null> {
  return getOwnerCredentialsCollection().findOne({
    credentialId: { $exists: true },
  });
}

export async function findOwnerCredentialByCredentialId(
  credentialId: string,
): Promise<OwnerCredentialsDocument | null> {
  return getOwnerCredentialsCollection().findOne({ credentialId });
}

export async function upsertRegistrationChallenge(input: {
  challenge: string;
  expiresAt: Date;
}): Promise<void> {
  const now = new Date();
  await getOwnerCredentialsCollection().updateOne(
    CHALLENGE_ONLY_FILTER,
    {
      $set: {
        currentChallenge: input.challenge,
        currentChallengeExpiresAt: input.expiresAt,
        updatedAt: now,
      },
      $setOnInsert: {
        _id: new ObjectId(),
        createdAt: now,
      },
    },
    { upsert: true },
  );
}

export async function setLoginChallenge(input: {
  credentialId: string;
  challenge: string;
  expiresAt: Date;
}): Promise<void> {
  await getOwnerCredentialsCollection().updateOne(
    { credentialId: input.credentialId },
    {
      $set: {
        currentChallenge: input.challenge,
        currentChallengeExpiresAt: input.expiresAt,
        updatedAt: new Date(),
      },
    },
  );
}

export async function consumeRegistrationChallenge(): Promise<OwnerCredentialsDocument | null> {
  return getOwnerCredentialsCollection().findOne(CHALLENGE_ONLY_FILTER);
}

export async function saveRegisteredCredential(input: {
  placeholderId: ObjectId;
  credentialId: string;
  credentialPublicKey: string;
  counter: number;
  transports: string[];
  deviceType: string;
  backedUp: boolean;
}): Promise<void> {
  const now = new Date();
  await getOwnerCredentialsCollection().updateOne(
    { _id: input.placeholderId },
    {
      $set: {
        credentialId: input.credentialId,
        credentialPublicKey: input.credentialPublicKey,
        counter: input.counter,
        transports: input.transports,
        deviceType: input.deviceType,
        backedUp: input.backedUp,
        updatedAt: now,
      },
      $unset: {
        currentChallenge: "",
        currentChallengeExpiresAt: "",
      },
      $setOnInsert: {
        createdAt: now,
      },
    },
  );
}

export async function updateCredentialAfterLogin(input: {
  credentialId: string;
  counter: number;
  deviceType: string;
  backedUp: boolean;
}): Promise<void> {
  await getOwnerCredentialsCollection().updateOne(
    { credentialId: input.credentialId },
    {
      $set: {
        counter: input.counter,
        deviceType: input.deviceType,
        backedUp: input.backedUp,
        updatedAt: new Date(),
      },
      $unset: {
        currentChallenge: "",
        currentChallengeExpiresAt: "",
      },
    },
  );
}
