"use server";
import { revalidatePath } from "next/cache";
import { validateSteps, type StepDraft } from "@/lib/sequences/validate";
import { requireSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type SaveResult = { ok: true; demo?: boolean } | { ok: false; error: "duplicate" | "range" | "tooMany" | "empty" | "generic" };

export async function saveSequence(sequenceId: string, steps: StepDraft[]): Promise<SaveResult> {
  const session = await requireSession();
  const invalid = validateSteps(steps);
  if (invalid) return { ok: false, error: invalid };
  if (session.mode === "demo") return { ok: true, demo: true };

  const supabase = await createSupabaseServerClient();
  // RPC soumise à la RLS : impossible de toucher la séquence d'une autre organisation
  const { error } = await supabase.rpc("save_sequence", { p_sequence_id: sequenceId, p_steps: steps });
  if (error) return { ok: false, error: "generic" };
  revalidatePath("/app/sequences");
  return { ok: true };
}
