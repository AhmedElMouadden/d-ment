import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * Vérifie la signature d'un webhook Resend (format Svix).
 * Contenu signé : « id.timestamp.corps », HMAC-SHA256 avec la clé « whsec_… ».
 */
export function verifyResendWebhook(
  body: string,
  headers: { id: string | null; timestamp: string | null; signature: string | null },
  secret: string,
  now = Date.now(),
): boolean {
  const { id, timestamp, signature } = headers;
  if (!id || !timestamp || !signature || !secret.startsWith("whsec_")) return false;
  // Refuse les messages de plus de 5 minutes (rejeu)
  if (Math.abs(now / 1000 - Number(timestamp)) > 300) return false;
  const key = Buffer.from(secret.slice("whsec_".length), "base64");
  const expected = createHmac("sha256", key).update(`${id}.${timestamp}.${body}`).digest();
  return signature.split(" ").some((part) => {
    const [version, sig] = part.split(",");
    if (version !== "v1" || !sig) return false;
    const got = Buffer.from(sig, "base64");
    return got.length === expected.length && timingSafeEqual(got, expected);
  });
}

const EVENT_MAP: Record<string, string> = {
  "email.delivered": "delivered",
  "email.opened": "opened",
  "email.clicked": "clicked",
  "email.bounced": "bounced",
  "email.complained": "complained",
  "email.failed": "failed",
};

export function mapResendEvent(type: string): string | null {
  return EVENT_MAP[type] ?? null;
}
