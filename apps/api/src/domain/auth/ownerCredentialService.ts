import type { Request, Response } from "express";
import {
  generateAuthenticationOptions,
  generateRegistrationOptions,
  verifyAuthenticationResponse,
  verifyRegistrationResponse,
  type AuthenticationResponseJSON,
  type RegistrationResponseJSON,
  type WebAuthnCredential,
} from "@simplewebauthn/server";
import { config } from "../../config/env.js";
import { AppError } from "../../errors/AppError.js";
import {
  ALLOWED_WEBAUTHN_ORIGINS,
  ALLOWED_WEBAUTHN_RP_IDS,
  rpIdForRequest,
} from "./webauthn.js";
import {
  consumeRegistrationChallenge,
  findOwnerCredential,
  findOwnerCredentialByCredentialId,
  hasOwnerCredential,
  saveRegisteredCredential,
  setLoginChallenge,
  updateCredentialAfterLogin,
  upsertRegistrationChallenge,
} from "./ownerCredentialRepository.js";
import { assertOwnerRegistrationBootstrap } from "./registrationBootstrap.js";
import {
  createLoggedInSession,
  rotateCsrfTokenForSession,
  validateAdminSession,
  type AdminSessionStatus,
} from "./sessionService.js";

const OWNER_USER_ID = new TextEncoder().encode("mi-log-local-owner");
const CHALLENGE_TTL_MS = 5 * 60 * 1000;

function authError(
  code: string,
  message: string,
  statusCode = 400,
): AppError {
  return new AppError({ code, message, statusCode, expose: true });
}

function mapWebAuthnVerificationError(
  error: unknown,
  fallbackCode: string,
  fallbackMessage: string,
  statusCode = 400,
): never {
  if (error instanceof AppError) {
    throw error;
  }

  throw authError(fallbackCode, fallbackMessage, statusCode);
}

function assertFreshChallenge(record: {
  currentChallenge?: string;
  currentChallengeExpiresAt?: Date;
}): string {
  if (!record.currentChallenge || !record.currentChallengeExpiresAt) {
    throw authError("AUTH_CHALLENGE_REQUIRED", "WebAuthn challenge required");
  }

  if (record.currentChallengeExpiresAt.getTime() <= Date.now()) {
    throw authError("AUTH_CHALLENGE_EXPIRED", "WebAuthn challenge expired");
  }

  return record.currentChallenge;
}

function credentialPublicKeyToString(value: Uint8Array): string {
  return Buffer.from(value).toString("base64url");
}

function credentialPublicKeyFromString(value: string): WebAuthnCredential["publicKey"] {
  return Uint8Array.from(
    Buffer.from(value, "base64url"),
  ) as WebAuthnCredential["publicKey"];
}

function toWebAuthnCredential(record: {
  credentialId?: string;
  credentialPublicKey?: string;
  counter?: number;
  transports?: string[];
}): WebAuthnCredential {
  if (!record.credentialId || !record.credentialPublicKey) {
    throw authError("OWNER_CREDENTIAL_NOT_FOUND", "Owner credential not found", 404);
  }

  return {
    id: record.credentialId,
    publicKey: credentialPublicKeyFromString(record.credentialPublicKey),
    counter: record.counter ?? 0,
    transports: record.transports as WebAuthnCredential["transports"],
  };
}

function readRegistrationResponse(body: unknown): RegistrationResponseJSON {
  return body as RegistrationResponseJSON;
}

function readAuthenticationResponse(body: unknown): AuthenticationResponseJSON {
  return body as AuthenticationResponseJSON;
}

export async function getRegistrationOptions(req: Request) {
  if (await hasOwnerCredential()) {
    throw authError(
      "OWNER_ALREADY_REGISTERED",
      "Owner passkey is already registered",
      409,
    );
  }

  assertOwnerRegistrationBootstrap(req);

  const options = await generateRegistrationOptions({
    rpName: config.WEBAUTHN_RP_NAME,
    rpID: rpIdForRequest(req),
    userID: OWNER_USER_ID,
    userName: "owner",
    userDisplayName: "mi-log owner",
    attestationType: "none",
    authenticatorSelection: {
      residentKey: "preferred",
      userVerification: "required",
    },
  });

  await upsertRegistrationChallenge({
    challenge: options.challenge,
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  });

  return options;
}

export async function verifyRegistration(req: Request, res: Response) {
  if (await hasOwnerCredential()) {
    throw authError(
      "OWNER_ALREADY_REGISTERED",
      "Owner passkey is already registered",
      409,
    );
  }

  assertOwnerRegistrationBootstrap(req);

  const placeholder = await consumeRegistrationChallenge();
  if (!placeholder) {
    throw authError("AUTH_CHALLENGE_REQUIRED", "WebAuthn challenge required");
  }

  const expectedChallenge = assertFreshChallenge(placeholder);
  let verification: Awaited<ReturnType<typeof verifyRegistrationResponse>>;
  try {
    verification = await verifyRegistrationResponse({
      response: readRegistrationResponse(req.body),
      expectedChallenge,
      expectedOrigin: ALLOWED_WEBAUTHN_ORIGINS,
      expectedRPID: ALLOWED_WEBAUTHN_RP_IDS,
      requireUserVerification: true,
    });
  } catch (error) {
    mapWebAuthnVerificationError(
      error,
      "WEBAUTHN_REGISTRATION_FAILED",
      "Passkey registration failed",
    );
  }

  if (!verification.verified) {
    throw authError("WEBAUTHN_REGISTRATION_FAILED", "Passkey registration failed");
  }

  await saveRegisteredCredential({
    placeholderId: placeholder._id,
    credentialId: verification.registrationInfo.credential.id,
    credentialPublicKey: credentialPublicKeyToString(
      verification.registrationInfo.credential.publicKey,
    ),
    counter: verification.registrationInfo.credential.counter,
    transports: verification.registrationInfo.credential.transports ?? [],
    deviceType: verification.registrationInfo.credentialDeviceType,
    backedUp: verification.registrationInfo.credentialBackedUp,
  });

  const session = await createLoggedInSession(res);
  return {
    authenticated: true,
    registered: true,
    csrfToken: session.csrfToken,
    expiresAt: session.expiresAt.toISOString(),
  } satisfies AdminSessionStatus;
}

export async function getLoginOptions(req: Request) {
  const credential = await findOwnerCredential();
  if (!credential) {
    throw authError("OWNER_NOT_REGISTERED", "Owner passkey is not registered", 404);
  }

  const options = await generateAuthenticationOptions({
    rpID: rpIdForRequest(req),
    allowCredentials: [
      {
        id: toWebAuthnCredential(credential).id,
        transports: credential.transports as WebAuthnCredential["transports"],
      },
    ],
    userVerification: "required",
  });

  await setLoginChallenge({
    credentialId: toWebAuthnCredential(credential).id,
    challenge: options.challenge,
    expiresAt: new Date(Date.now() + CHALLENGE_TTL_MS),
  });

  return options;
}

export async function verifyLogin(req: Request, res: Response) {
  const response = readAuthenticationResponse(req.body);
  const credential = await findOwnerCredentialByCredentialId(response.id);
  if (!credential) {
    throw authError("OWNER_CREDENTIAL_NOT_FOUND", "Owner credential not found", 404);
  }

  const expectedChallenge = assertFreshChallenge(credential);
  let verification: Awaited<ReturnType<typeof verifyAuthenticationResponse>>;
  try {
    verification = await verifyAuthenticationResponse({
      response,
      expectedChallenge,
      expectedOrigin: ALLOWED_WEBAUTHN_ORIGINS,
      expectedRPID: ALLOWED_WEBAUTHN_RP_IDS,
      credential: toWebAuthnCredential(credential),
      requireUserVerification: true,
    });
  } catch (error) {
    mapWebAuthnVerificationError(
      error,
      "WEBAUTHN_LOGIN_FAILED",
      "Passkey login failed",
      401,
    );
  }

  if (!verification.verified) {
    throw authError("WEBAUTHN_LOGIN_FAILED", "Passkey login failed", 401);
  }

  await updateCredentialAfterLogin({
    credentialId: verification.authenticationInfo.credentialID,
    counter: verification.authenticationInfo.newCounter,
    deviceType: verification.authenticationInfo.credentialDeviceType,
    backedUp: verification.authenticationInfo.credentialBackedUp,
  });

  const session = await createLoggedInSession(res);
  return {
    authenticated: true,
    registered: true,
    csrfToken: session.csrfToken,
    expiresAt: session.expiresAt.toISOString(),
  } satisfies AdminSessionStatus;
}

export async function getSessionStatus(req: Request): Promise<AdminSessionStatus> {
  const registered = await hasOwnerCredential();
  const session = await validateAdminSession(req);

  if (!session) {
    return {
      authenticated: false,
      registered,
      csrfToken: null,
      expiresAt: null,
    };
  }

  const csrfToken = await rotateCsrfTokenForSession(session.sessionIdHash);
  return {
    authenticated: true,
    registered: true,
    csrfToken,
    expiresAt: session.expiresAt.toISOString(),
  };
}
