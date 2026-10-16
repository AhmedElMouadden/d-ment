import type { Branch } from "@/content/branches";

export type LatLng = { lat: number; lng: number };

export type QueryKind = "postal" | "fsa" | "text" | "empty";

export type MatchReason = "distance" | "postal-fsa" | "postal-area" | "city" | "text";

export type BranchResult = {
  branch: Branch;
  reason: MatchReason;
  /** Only present when both the origin and the branch have real coordinates. */
  distanceKm?: number;
};

/** Lowercase, strip accents and punctuation, expand St/Ste. */
export function normalize(input: string) {
  return input
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[’']/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\bste\b/g, "sainte")
    .replace(/\bst\b/g, "saint")
    .trim();
}

const POSTAL = /^[abceghj-nprstvxy]\d[abceghj-nprstv-z] ?\d[abceghj-nprstv-z]\d$/i;
const FSA = /^[abceghj-nprstvxy]\d[abceghj-nprstv-z]$/i;

export function classifyQuery(raw: string): { kind: QueryKind; value: string } {
  const trimmed = raw.trim();
  if (!trimmed) return { kind: "empty", value: "" };
  const compact = trimmed.replace(/\s+/g, "").toUpperCase();
  if (POSTAL.test(compact)) return { kind: "postal", value: compact };
  if (FSA.test(compact)) return { kind: "fsa", value: compact };
  return { kind: "text", value: normalize(trimmed) };
}

/** Great-circle distance in kilometres. */
export function haversineKm(a: LatLng, b: LatLng) {
  const R = 6371;
  const rad = (d: number) => (d * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const fsaOf = (b: Branch) => b.address.postalCode.replace(/\s+/g, "").toUpperCase().slice(0, 3);

function textScore(b: Branch, q: string) {
  const city = normalize(b.address.city);
  if (city === q) return 100;
  if (city.startsWith(q) || q.startsWith(city)) return 80;
  const haystack = normalize(
    [b.name.fr, b.name.en, b.address.street, b.address.city, ...b.keywords].join(" "),
  );
  const tokens = q.split(" ").filter((tk) => tk.length > 1);
  if (!tokens.length) return 0;
  // Every word must match: "St-Jérôme" must not match "Saint-Sulpice".
  return tokens.every((tk) => haystack.includes(tk)) ? 60 : 0;
}

/**
 * Rank branches against a typed query. Without a geocoder this is a text and
 * postal-code match: it never pretends to know distances.
 */
export function searchBranches(list: Branch[], raw: string): BranchResult[] {
  const { kind, value } = classifyQuery(raw);
  if (kind === "empty") return [];

  if (kind === "postal" || kind === "fsa") {
    const fsa = value.slice(0, 3);
    const exact = list.filter((b) => fsaOf(b) === fsa);
    if (exact.length) return exact.map((branch) => ({ branch, reason: "postal-fsa" as const }));
    // Same first two characters = same broad postal area (e.g. "H2").
    return list
      .filter((b) => fsaOf(b).slice(0, 2) === fsa.slice(0, 2))
      .map((branch) => ({ branch, reason: "postal-area" as const }));
  }

  return list
    .map((branch) => ({ branch, score: textScore(branch, value) }))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score || a.branch.address.city.localeCompare(b.branch.address.city, "fr"))
    .map(({ branch, score }) => ({ branch, reason: score >= 80 ? ("city" as const) : ("text" as const) }));
}

/** Sort by real distance. Branches without coordinates are left out. */
export function nearestBranches(list: Branch[], origin: LatLng, limit = 10): BranchResult[] {
  return list
    .filter((b): b is Branch & { coordinates: LatLng } => b.coordinates !== null)
    .map((branch) => ({ branch, reason: "distance" as const, distanceKm: haversineKm(origin, branch.coordinates) }))
    .sort((a, b) => a.distanceKm - b.distanceKm)
    .slice(0, limit);
}

export const branchesMissingCoordinates = (list: Branch[]) => list.filter((b) => !b.coordinates).length;

export function directionsUrl(b: Branch) {
  const a = b.address;
  const q = [a.street, a.city, a.province, a.postalCode, "Canada"].join(", ");
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(q)}`;
}
