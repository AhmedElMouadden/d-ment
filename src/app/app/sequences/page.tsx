import { getDictionary } from "@/i18n/server";
import { DEFAULT_STEPS, type StepDraft } from "@/lib/sequences/validate";
import { requireSession } from "@/lib/session";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { SequenceEditor } from "./sequence-editor";

export default async function SequencesPage() {
  const session = await requireSession();
  const { t, locale } = await getDictionary();

  let sequenceId = "demo-seq";
  let steps: StepDraft[] = DEFAULT_STEPS;
  if (session.mode === "live") {
    const supabase = await createSupabaseServerClient();
    const { data: seq } = await supabase.from("sequences").select("id").eq("is_default", true).single();
    const { data } = await supabase
      .from("sequence_steps")
      .select("id, offset_days, tone, is_active, subject_fr, body_fr, subject_en, body_en")
      .eq("sequence_id", seq!.id)
      .order("offset_days");
    sequenceId = seq!.id;
    steps = (data ?? []).map((s) => ({
      id: s.id, offsetDays: s.offset_days, tone: s.tone, active: s.is_active,
      subjectFr: s.subject_fr ?? "", bodyFr: s.body_fr ?? "", subjectEn: s.subject_en ?? "", bodyEn: s.body_en ?? "",
    }));
  }

  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">{t.sequences.title}</h1>
      <p className="mt-1 max-w-2xl text-ink-muted">{t.sequences.subtitle}</p>
      <SequenceEditor
        sequenceId={sequenceId}
        initialSteps={steps}
        uiLang={locale}
        companyName={session.organizationName}
        demo={session.mode === "demo"}
      />
    </div>
  );
}
