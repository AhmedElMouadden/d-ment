/**
 * Business facts carry their verification status. The site runs in one of
 * two data modes (NEXT_PUBLIC_DATA_MODE):
 *
 * - "preview" (default): unverified facts are shown with an "À vérifier"
 *   badge so stakeholders can review them, and the whole site is noindex.
 * - "strict": production. Unverified facts are never rendered; components
 *   fall back to a neutral instruction (e.g. "contact the branch").
 */
export type Verification = {
  status: "verified" | "unverified";
  /** Where the fact came from, e.g. a URL or "Fiche L'Express Franchise, 2025". */
  source: string;
  /** What exactly must be confirmed, and with whom. */
  note?: string;
  /** ISO date the fact was last confirmed with the business. */
  checkedOn?: string;
};

export type DataMode = "preview" | "strict";

export const dataMode: DataMode =
  process.env.NEXT_PUBLIC_DATA_MODE === "strict" ? "strict" : "preview";

export const isPreview = dataMode === "preview";

export const unverified = (source: string, note?: string): Verification => ({
  status: "unverified",
  source,
  note,
});

/** Whether a fact may be displayed in the current data mode. */
export function canShow(v: Verification | undefined, mode: DataMode = dataMode) {
  if (!v) return false;
  return v.status === "verified" || mode === "preview";
}

export type Sourced<T> = { value: T; verification: Verification };

/** The value if displayable in this mode, else null. */
export function shown<T>(fact: Sourced<T> | null | undefined, mode: DataMode = dataMode): T | null {
  if (!fact) return null;
  return canShow(fact.verification, mode) ? fact.value : null;
}
