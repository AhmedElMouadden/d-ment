import type { Lang, Tone } from "../engine/engine";
import { DEFAULT_TEMPLATES, UPCOMING, type Template } from "./templates";

export interface RenderInvoice {
  number: string | null;
  amountCents: number;
  dueDate: string;
  daysOverdue: number;
  paymentLink: string | null;
}

export interface RenderInput {
  language: Lang;
  tone: Tone;
  clientName: string;
  companyName: string;
  /** Factures visées par une étape aujourd'hui, puis les autres factures en retard. */
  invoices: RenderInvoice[];
  /** Textes personnalisés de l'étape (null = modèle par défaut). */
  custom?: Partial<Template> | null;
  unsubscribeUrl: string;
}

export interface RenderedEmail { subject: string; text: string; html: string }

export function formatMoney(cents: number, lang: Lang, currency = "CAD") {
  return new Intl.NumberFormat(lang === "fr" ? "fr-CA" : "en-CA", { style: "currency", currency }).format(cents / 100);
}

export function formatDate(iso: string, lang: Lang) {
  return new Intl.DateTimeFormat(lang === "fr" ? "fr-CA" : "en-CA", { dateStyle: "long", timeZone: "UTC" }).format(
    new Date(`${iso}T12:00:00Z`),
  );
}

const escapeHtml = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

const LABELS = {
  fr: { invoice: "Facture", due: "Échéance", late: "Retard", balance: "Solde", days: (n: number) => (n > 0 ? `${n} j` : "à venir"), pay: "Payer en ligne", unsubscribe: "Ne plus recevoir ces rappels", sentBy: (c: string) => `Courriel envoyé au nom de ${c} par Dûment.` },
  en: { invoice: "Invoice", due: "Due", late: "Overdue", balance: "Balance", days: (n: number) => (n > 0 ? `${n} d` : "upcoming"), pay: "Pay online", unsubscribe: "Stop receiving these reminders", sentBy: (c: string) => `Email sent on behalf of ${c} by Dûment.` },
};

/** Choisit le modèle : personnalisé, sinon « avant échéance » si rien n'est en retard, sinon par ton. */
export function pickTemplate(lang: Lang, tone: Tone, primaryDaysOverdue: number, custom?: Partial<Template> | null): Template {
  const base = primaryDaysOverdue <= 0 ? UPCOMING[lang] : DEFAULT_TEMPLATES[tone][lang];
  return { subject: custom?.subject?.trim() || base.subject, body: custom?.body?.trim() || base.body };
}

export function renderEmail(input: RenderInput): RenderedEmail {
  const L = LABELS[input.language];
  const money = (c: number) => formatMoney(c, input.language);
  // La facture principale est la plus en retard
  const primary = [...input.invoices].sort((a, b) => b.daysOverdue - a.daysOverdue)[0];
  const totalCents = input.invoices.reduce((s, i) => s + i.amountCents, 0);
  const paymentLink = primary.paymentLink ?? input.invoices.find((i) => i.paymentLink)?.paymentLink ?? null;

  const vars: Record<string, string> = {
    client_name: input.clientName,
    company_name: input.companyName,
    invoice_number: primary.number ?? "—",
    amount: money(primary.amountCents),
    due_date: formatDate(primary.dueDate, input.language),
    days_overdue: String(Math.max(0, primary.daysOverdue)),
    total_due: money(totalCents),
    invoice_count: String(input.invoices.length),
  };

  const template = pickTemplate(input.language, input.tone, primary.daysOverdue, input.custom);
  const fill = (s: string) => s.replace(/\{\{\s*(\w+)\s*\}\}/g, (m, k: string) => vars[k] ?? (k === "payment_link" || k === "invoice_list" ? m : ""));

  // Lignes avec un lien de paiement absent : supprimées
  const lines = template.body.split("\n").filter((line) => paymentLink || !line.includes("{{payment_link}}"));

  const textList = input.invoices
    .map((i) => `  • ${L.invoice} ${i.number ?? "—"} · ${L.due} ${formatDate(i.dueDate, input.language)} · ${L.days(i.daysOverdue)} · ${money(i.amountCents)}`)
    .join("\n");

  const text = [
    fill(lines.join("\n")).replace("{{invoice_list}}", textList).replace(/\{\{\s*payment_link\s*\}\}/g, paymentLink ?? ""),
    "",
    "—",
    L.sentBy(input.companyName),
    `${L.unsubscribe} : ${input.unsubscribeUrl}`,
  ].join("\n");

  const htmlTable = `<table role="presentation" cellpadding="0" cellspacing="0" style="width:100%;border-collapse:collapse;margin:8px 0;font-size:14px">
<tr style="background:#f1f3f2;text-align:left"><th style="padding:8px 12px">${L.invoice}</th><th style="padding:8px 12px">${L.due}</th><th style="padding:8px 12px">${L.late}</th><th style="padding:8px 12px;text-align:right">${L.balance}</th></tr>
${input.invoices.map((i) => `<tr style="border-top:1px solid #e2e6e4"><td style="padding:8px 12px">${escapeHtml(i.number ?? "—")}</td><td style="padding:8px 12px">${escapeHtml(formatDate(i.dueDate, input.language))}</td><td style="padding:8px 12px">${escapeHtml(L.days(i.daysOverdue))}</td><td style="padding:8px 12px;text-align:right;font-weight:600;white-space:nowrap">${escapeHtml(money(i.amountCents))}</td></tr>`).join("\n")}
</table>`;
  const button = paymentLink
    ? `<a href="${escapeHtml(paymentLink)}" style="display:inline-block;background:#07916d;color:#fff;text-decoration:none;padding:10px 18px;border-radius:10px;font-weight:600">${L.pay}</a>`
    : "";

  const htmlBody = lines
    .join("\n")
    .split(/\n{2,}/)
    .map((para) => {
      if (para.trim() === "{{invoice_list}}") return htmlTable;
      if (para.includes("{{payment_link}}")) {
        const label = escapeHtml(fill(para).replace(/\{\{\s*payment_link\s*\}\}/g, "").replace(/\s*:\s*$/, "").trim());
        return `<p style="margin:0 0 16px">${label}</p><p style="margin:0 0 16px">${button}</p>`;
      }
      return `<p style="margin:0 0 16px">${escapeHtml(fill(para)).replace(/\n/g, "<br>").replace("{{invoice_list}}", "")}</p>`;
    })
    .join("\n");

  const html = `<!doctype html><html lang="${input.language === "fr" ? "fr-CA" : "en-CA"}"><body style="margin:0;background:#f7f8f7;padding:24px 12px;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#111816;line-height:1.5">
<div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e6e4;border-radius:16px;padding:28px">
${htmlBody}
</div>
<p style="max-width:560px;margin:16px auto 0;font-size:12px;color:#8a948f;text-align:center">${escapeHtml(L.sentBy(input.companyName))}<br><a href="${escapeHtml(input.unsubscribeUrl)}" style="color:#8a948f">${L.unsubscribe}</a></p>
</body></html>`;

  return { subject: fill(template.subject).replace(/\{\{\s*\w+\s*\}\}/g, "").trim(), text, html };
}
