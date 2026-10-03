import type { Tone } from "../engine/engine";

export interface StepDraft {
  id: string | null;
  offsetDays: number;
  tone: Tone;
  active: boolean;
  subjectFr: string;
  bodyFr: string;
  subjectEn: string;
  bodyEn: string;
}

export type StepError = "duplicate" | "range" | "tooMany" | "empty";

/** Règles partagées par l'éditeur (navigateur) et l'action serveur. */
export function validateSteps(steps: StepDraft[]): StepError | null {
  if (steps.length === 0) return "empty";
  if (steps.length > 10) return "tooMany";
  if (steps.some((s) => !Number.isInteger(s.offsetDays) || s.offsetDays < -60 || s.offsetDays > 365)) return "range";
  if (new Set(steps.map((s) => s.offsetDays)).size !== steps.length) return "duplicate";
  return null;
}

export const DEFAULT_STEPS: StepDraft[] = (
  [[-3, "courteous"], [1, "courteous"], [7, "courteous"], [15, "firm"], [30, "firm"], [45, "final"]] as const
).map(([offsetDays, tone], i) => ({
  id: `demo-step-${i}`, offsetDays, tone, active: true, subjectFr: "", bodyFr: "", subjectEn: "", bodyEn: "",
}));
