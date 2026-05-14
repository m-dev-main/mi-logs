import { createPrivateKey, sign } from "node:crypto";

export type JsonValue =
  | string
  | number
  | boolean
  | null
  | JsonValue[]
  | { [key: string]: JsonValue };

export function canonicalJson(value: JsonValue): string {
  if (Array.isArray(value)) {
    return `[${value.map(canonicalJson).join(",")}]`;
  }

  if (value && typeof value === "object") {
    return `{${Object.keys(value)
      .sort()
      .map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`)
      .join(",")}}`;
  }

  return JSON.stringify(value);
}

export function signCanonicalJson(value: JsonValue, privateKeyPem: string): string {
  const key = createPrivateKey(privateKeyPem);
  const signature = sign(null, Buffer.from(canonicalJson(value), "utf8"), key);
  return signature.toString("base64");
}
