import { timingSafeEqual } from "node:crypto";

/** Vérifie l'en-tête « Authorization: Bearer <CRON_SECRET> » en temps constant. */
export function isAuthorizedCron(header: string | null, secret = process.env.CRON_SECRET): boolean {
  if (!secret || !header) return false;
  const a = Buffer.from(header);
  const b = Buffer.from(`Bearer ${secret}`);
  return a.length === b.length && timingSafeEqual(a, b);
}
