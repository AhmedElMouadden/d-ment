import type { Verification } from "@/lib/verification";

/**
 * Genuine reviews only, copied with permission from their platform, with a
 * link back to the original. Empty on purpose: no review has been verified
 * yet, and the reviews section stays hidden until this list has entries.
 */
export type Review = {
  id: string;
  text: string;
  lang: "fr" | "en";
  author: string;
  date: string;
  branchSlug?: string;
  service?: string;
  platform: "Google" | "Facebook" | "Autre";
  url: string;
  rating?: number;
  verification: Verification;
};

export const reviews: Review[] = [];
