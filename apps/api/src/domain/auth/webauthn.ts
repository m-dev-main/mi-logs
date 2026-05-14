import type { Request } from "express";
import { config } from "../../config/env.js";

const configuredHost = new URL(config.WEBAUTHN_ORIGIN).hostname;

const LOCAL_WEB_ORIGINS = new Set([
  config.WEBAUTHN_ORIGIN,
  `http://${configuredHost}:${config.API_PORT}`,
]);

export const ALLOWED_WEBAUTHN_ORIGINS = [...LOCAL_WEB_ORIGINS];
export const ALLOWED_WEBAUTHN_RP_IDS = [config.WEBAUTHN_RP_ID];

export function rpIdForRequest(_req: Request): string {
  return config.WEBAUTHN_RP_ID;
}
