import { describe, expect, it } from "vitest";
import { DEFAULT_TEMPLATES, TEMPLATE_VARIABLES, UPCOMING } from "./templates";
import { formatMoney, renderEmail, type RenderInput } from "./render";

const base = (o: Partial<RenderInput> = {}): RenderInput => ({
  language: "fr",
  tone: "courteous",
  clientName: "Marie-Ève Tremblay",
  companyName: "Studio Bleu inc.",
  invoices: [{ number: "1048", amountCents: 125_000, dueDate: "2026-09-16", daysOverdue: 15, paymentLink: "https://pay.example/1048" }],
  unsubscribeUrl: "https://app.dument.ca/u/tok",
  ...o,
});

describe("formats québécois et anglais", () => {
  it("formate les montants selon la langue", () => {
    expect(formatMoney(125_010, "fr").replace(/\s/g, " ")).toBe("1 250,10 $");
    expect(formatMoney(125_010, "en")).toBe("$1,250.10");
  });
});

describe("rendu des courriels", () => {
  it("remplace toutes les variables, sans en laisser une seule", () => {
    for (const tone of ["courteous", "firm", "final"] as const) {
      for (const language of ["fr", "en"] as const) {
        const e = renderEmail(base({ tone, language }));
        expect(e.subject + e.text + e.html).not.toMatch(/\{\{|\}\}/);
        expect(e.text).toContain("1048");
      }
    }
  });

  it("insère nom, montant, échéance, jours de retard et lien de paiement", () => {
    const e = renderEmail(base({ tone: "firm" }));
    expect(e.text).toContain("Marie-Ève Tremblay");
    expect(e.text).toContain("15 jours");
    expect(e.text).toContain("16 septembre 2026");
    expect(e.text).toContain("https://pay.example/1048");
    expect(e.html).toContain('href="https://pay.example/1048"');
    expect(e.text).toContain("Studio Bleu inc.");
  });

  it("supprime la ligne du lien de paiement quand il n'existe pas", () => {
    const e = renderEmail(base({ invoices: [{ number: "1", amountCents: 100, dueDate: "2026-09-16", daysOverdue: 3, paymentLink: null }] }));
    expect(e.text).not.toMatch(/régler en ligne/i);
    expect(e.html).not.toContain("Payer en ligne");
  });

  it("liste toutes les factures et le total dans un seul courriel", () => {
    const e = renderEmail(base({
      tone: "firm",
      invoices: [
        { number: "1048", amountCents: 125_000, dueDate: "2026-09-01", daysOverdue: 30, paymentLink: null },
        { number: "1053", amountCents: 64_000, dueDate: "2026-09-24", daysOverdue: 7, paymentLink: null },
      ],
    }));
    expect(e.text).toContain("1053");
    expect(e.html).toContain("1053");
    expect(e.subject.replace(/\s/g, " ")).toContain("1 890,00 $");
    expect(e.text).toContain("30 jours"); // facture principale = la plus en retard
  });

  it("utilise le modèle « avant échéance » quand rien n'est encore en retard", () => {
    const e = renderEmail(base({ invoices: [{ number: "9", amountCents: 100, dueDate: "2026-10-04", daysOverdue: -3, paymentLink: null }] }));
    expect(e.subject).toContain("Petit rappel");
  });

  it("applique les textes personnalisés de l'étape", () => {
    const e = renderEmail(base({ custom: { subject: "Coucou {{client_name}}", body: "Montant : {{amount}}\n\n{{invoice_list}}" } }));
    expect(e.subject).toBe("Coucou Marie-Ève Tremblay");
    expect(e.text.replace(/\s/g, " ")).toContain("Montant : 1 250,00 $");
  });

  it("échappe le HTML venant des données", () => {
    const e = renderEmail(base({ clientName: "<script>alert(1)</script>" }));
    expect(e.html).not.toContain("<script>");
    expect(e.html).toContain("&lt;script&gt;");
  });

  it("inclut toujours le lien de désinscription", () => {
    const e = renderEmail(base());
    expect(e.text).toContain("https://app.dument.ca/u/tok");
    expect(e.html).toContain("https://app.dument.ca/u/tok");
  });

  it("n'utilise que des variables documentées dans les modèles par défaut", () => {
    const all = [UPCOMING.fr, UPCOMING.en, ...Object.values(DEFAULT_TEMPLATES).flatMap((t) => [t.fr, t.en])];
    for (const t of all) {
      for (const [, v] of (t.subject + t.body).matchAll(/\{\{(\w+)\}\}/g)) {
        expect(TEMPLATE_VARIABLES).toContain(v);
      }
    }
  });
});
