"use client";
import clsx from "clsx";
import { Plus, Trash2 } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { Badge, Button, Card, Input, Label } from "@/components/ui";
import { en } from "@/i18n/en";
import { fr } from "@/i18n/fr";
import { renderEmail } from "@/lib/email/render";
import { DEFAULT_TEMPLATES, TEMPLATE_VARIABLES, UPCOMING } from "@/lib/email/templates";
import type { Lang, Tone } from "@/lib/engine/engine";
import { validateSteps, type StepDraft } from "@/lib/sequences/validate";
import { saveSequence } from "./actions";

const TONE_BADGE: Record<Tone, "brand" | "warn" | "danger"> = { courteous: "brand", firm: "warn", final: "danger" };

/** Le dictionnaire est importé ici : ses fonctions ne traversent pas la frontière serveur → client. */
export function SequenceEditor({ sequenceId, initialSteps, uiLang, companyName, demo }: {
  sequenceId: string;
  initialSteps: StepDraft[];
  uiLang: Lang;
  companyName: string;
  demo: boolean;
}) {
  const t = (uiLang === "fr" ? fr : en).sequences;
  const [steps, setSteps] = useState(() => [...initialSteps].sort((a, b) => a.offsetDays - b.offsetDays));
  const [selected, setSelected] = useState(0);
  const [lang, setLang] = useState<Lang>(uiLang);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const step = steps[selected] ?? steps[0];
  const update = (patch: Partial<StepDraft>) => {
    setMessage(null);
    setSteps((all) => all.map((s, i) => (i === selected ? { ...s, ...patch } : s)));
  };
  const clientError = validateSteps(steps);

  const defaults = step && (step.offsetDays <= 0 ? UPCOMING[lang] : DEFAULT_TEMPLATES[step.tone][lang]);
  const subjectKey = lang === "fr" ? "subjectFr" : "subjectEn";
  const bodyKey = lang === "fr" ? "bodyFr" : "bodyEn";

  const preview = useMemo(() => {
    if (!step) return null;
    const days = step.offsetDays;
    return renderEmail({
      language: lang,
      tone: step.tone,
      clientName: lang === "fr" ? "Marie-Ève Tremblay" : "Sarah Mitchell",
      companyName: companyName || "Studio Bleu inc.",
      invoices: [
        { number: "1048", amountCents: 125_000, dueDate: "2026-09-16", daysOverdue: days, paymentLink: "https://connect.intuit.com/pay/exemple" },
        ...(days > 7 ? [{ number: "1053", amountCents: 64_000, dueDate: "2026-09-24", daysOverdue: Math.max(1, days - 8), paymentLink: null }] : []),
      ],
      custom: { subject: step[subjectKey], body: step[bodyKey] },
      unsubscribeUrl: "#",
    });
  }, [step, lang, companyName, subjectKey, bodyKey]);

  const addStep = () => {
    const last = steps.at(-1)?.offsetDays ?? 0;
    const next: StepDraft = { id: null, offsetDays: Math.min(365, last + 15), tone: "final", active: true, subjectFr: "", bodyFr: "", subjectEn: "", bodyEn: "" };
    setSteps([...steps, next]);
    setSelected(steps.length);
  };
  const removeStep = () => {
    setSteps(steps.filter((_, i) => i !== selected));
    setSelected(Math.max(0, selected - 1));
  };
  const save = () =>
    start(async () => {
      const res = await saveSequence(sequenceId, steps);
      if (res.ok) setMessage({ ok: true, text: res.demo ? t.demoNotSaved : t.saved });
      else setMessage({ ok: false, text: t.errors[res.error] });
    });

  return (
    <div className="mt-8 grid gap-6 xl:grid-cols-[18rem_1fr]">
      {/* Frise des étapes */}
      <div>
        <ol className="space-y-2">
          {steps.map((s, i) => (
            <li key={s.id ?? `new-${i}`}>
              <button
                type="button"
                onClick={() => setSelected(i)}
                className={clsx(
                  "flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left ring-1 transition",
                  i === selected ? "bg-surface ring-2 ring-brand-600" : "bg-surface ring-line hover:ring-ink-subtle",
                  !s.active && "opacity-60",
                )}
              >
                <span className="text-sm font-medium">{t.dayLabel(s.offsetDays)}</span>
                <Badge tone={TONE_BADGE[s.tone]}>{t.tones[s.tone]}</Badge>
              </button>
            </li>
          ))}
        </ol>
        <Button type="button" variant="ghost" className="mt-3 w-full" onClick={addStep} disabled={steps.length >= 10}>
          <Plus className="size-4" aria-hidden /> {t.addStep}
        </Button>
        <div className="mt-6 space-y-3">
          <Button type="button" className="w-full" onClick={save} disabled={pending || !!clientError}>{t.save}</Button>
          {demo && !message && <p className="text-xs text-ink-subtle">{t.demoNotSaved}</p>}
          {clientError && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{t.errors[clientError]}</p>}
          {message && <p role="status" className={clsx("text-sm", message.ok ? "text-brand-700 dark:text-brand-300" : "text-rose-700 dark:text-rose-300")}>{message.text}</p>}
        </div>
      </div>

      {step && (
        <div className="grid min-w-0 gap-6">
          {/* Réglages de l'étape */}
          <Card className="space-y-5 p-6">
            <div className="flex items-center justify-between">
              <h2 className="font-semibold">{t.step} · {t.dayLabel(step.offsetDays)}</h2>
              <Button type="button" variant="ghost" size="sm" onClick={removeStep} disabled={steps.length <= 1}>
                <Trash2 className="size-4" aria-hidden /> {t.removeStep}
              </Button>
            </div>
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <Label htmlFor="offset">{t.offset}</Label>
                <Input id="offset" type="number" min={-60} max={365} value={step.offsetDays}
                  onChange={(e) => update({ offsetDays: Number.parseInt(e.target.value || "0", 10) })} />
                <p className="mt-1 text-xs text-ink-subtle">{t.offsetHelp}</p>
              </div>
              <div>
                <Label htmlFor="tone">{t.tone}</Label>
                <select id="tone" value={step.tone} onChange={(e) => update({ tone: e.target.value as Tone })}
                  className="mt-1.5 block w-full rounded-xl border-0 bg-surface px-3 py-2.5 text-sm ring-1 ring-inset ring-line focus:ring-2 focus:ring-brand-600">
                  {(["courteous", "firm", "final"] as const).map((tone) => <option key={tone} value={tone}>{t.tones[tone]}</option>)}
                </select>
              </div>
              <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-medium">
                <input type="checkbox" checked={step.active} onChange={(e) => update({ active: e.target.checked })} className="size-4 accent-brand-600" />
                {t.active}
              </label>
            </div>

            <div className="flex gap-1 rounded-xl bg-surface-muted p-1 text-sm" role="tablist">
              {(["fr", "en"] as const).map((l) => (
                <button key={l} type="button" role="tab" aria-selected={lang === l} onClick={() => setLang(l)}
                  className={clsx("flex-1 rounded-lg px-3 py-1.5 font-medium", lang === l ? "bg-surface shadow-sm" : "text-ink-muted")}>
                  {l === "fr" ? "Français" : "English"}
                </button>
              ))}
            </div>

            <div>
              <Label htmlFor="subject">{t.subject}</Label>
              <Input id="subject" value={step[subjectKey]} placeholder={defaults?.subject} onChange={(e) => update({ [subjectKey]: e.target.value })} />
            </div>
            <div>
              <Label htmlFor="body">{t.body}</Label>
              <textarea id="body" rows={12} value={step[bodyKey]} placeholder={defaults?.body}
                onChange={(e) => update({ [bodyKey]: e.target.value })}
                className="mt-1.5 block w-full rounded-xl border-0 bg-surface px-3.5 py-2.5 font-mono text-xs leading-relaxed ring-1 ring-inset ring-line placeholder:text-ink-subtle focus:ring-2 focus:ring-brand-600" />
              <p className="mt-1 text-xs text-ink-subtle">{t.defaultText}</p>
            </div>
            <div>
              <p className="text-xs font-medium text-ink-muted">{t.variables}</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {TEMPLATE_VARIABLES.map((v) => (
                  <code key={v} className="rounded-md bg-surface-muted px-1.5 py-0.5 text-xs text-ink-muted">{`{{${v}}}`}</code>
                ))}
              </div>
            </div>
          </Card>

          {/* Aperçu */}
          <Card className="overflow-hidden">
            <div className="border-b border-line px-5 py-3">
              <p className="text-xs uppercase tracking-wide text-ink-subtle">{t.preview} · {t.previewNote}</p>
              <p className="mt-1 font-medium">{preview?.subject}</p>
            </div>
            <iframe title={t.preview} srcDoc={preview?.html} sandbox="" className="h-[640px] w-full bg-[#f7f8f7]" />
          </Card>
        </div>
      )}
    </div>
  );
}
