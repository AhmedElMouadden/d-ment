import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

/**
 * Chiffrement symétrique des jetons QuickBooks (AES-256-GCM, authentifié).
 * Format stocké : « v1.<iv>.<tag>.<texte chiffré> » en base64url.
 * La clé (32 octets, base64) vit uniquement dans TOKEN_ENCRYPTION_KEY côté serveur.
 */
const VERSION = "v1";

function loadKey(raw = process.env.TOKEN_ENCRYPTION_KEY): Buffer {
  if (!raw) throw new Error("TOKEN_ENCRYPTION_KEY manquant");
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY doit faire 32 octets (openssl rand -base64 32)");
  return key;
}

export function encryptSecret(plain: string, rawKey?: string): string {
  const key = loadKey(rawKey);
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const data = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [VERSION, iv.toString("base64url"), tag.toString("base64url"), data.toString("base64url")].join(".");
}

export function decryptSecret(payload: string, rawKey?: string): string {
  const [version, iv, tag, data] = payload.split(".");
  if (version !== VERSION || !iv || !tag || data === undefined) throw new Error("Format de secret chiffré invalide");
  const decipher = createDecipheriv("aes-256-gcm", loadKey(rawKey), Buffer.from(iv, "base64url"));
  decipher.setAuthTag(Buffer.from(tag, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(data, "base64url")), decipher.final()]).toString("utf8");
}
