import { describe, expect, it } from "vitest";
import { addDays, daysBetween, localDate } from "./dates";
import {
  pairKey, planReminders, revalidateBeforeSend,
  type EngineCustomer, type EngineInput, type EngineInvoice, type EngineStep, type PlannedReminder,
} from "./engine";

/** Séquence par défaut : J-3, J+1, J+7, J+15, J+30, J+45 */
const STEPS: EngineStep[] = [
  { id: "s-3", offsetDays: -3, tone: "courteous", active: true },
  { id: "s1", offsetDays: 1, tone: "courteous", active: true },
  { id: "s7", offsetDays: 7, tone: "courteous", active: true },
  { id: "s15", offsetDays: 15, tone: "firm", active: true },
  { id: "s30", offsetDays: 30, tone: "firm", active: true },
  { id: "s45", offsetDays: 45, tone: "final", active: true },
];

const customer = (o: Partial<EngineCustomer> = {}): EngineCustomer => ({
  id: "c1", email: "client@exemple.ca", ccEmail: null, language: null, excluded: false,
  pausedUntil: null, pausedIndefinitely: false, unsubscribedAt: null, sequenceId: null, ...o,
});
const invoice = (o: Partial<EngineInvoice> = {}): EngineInvoice => ({
  id: "i1", customerId: "c1", docNumber: "1001", dueDate: "2026-10-01", balanceCents: 100_000, status: "open", ...o,
});
const input = (o: Partial<EngineInput> = {}): EngineInput => ({
  today: "2026-10-01", defaultLanguage: "fr", approvalFromDay: null, subscriptionActive: true,
  defaultSequenceId: "seq", sequences: { seq: STEPS }, customers: [customer()], invoices: [invoice()],
  triggered: new Set(), ...o,
});

/**
 * Simule le cron quotidien du jour `from` au jour `to` : planifie, « envoie »
 * (enregistre les paires déclenchées) et applique d'éventuels événements.
 */
function simulate(base: EngineInput, from: string, to: string, onDay?: (day: string, state: EngineInput) => void) {
  const sent: Array<{ day: string; reminder: PlannedReminder }> = [];
  const state = { ...base, triggered: new Set(base.triggered) };
  for (let day = from; day <= to; day = addDays(day, 1)) {
    state.today = day;
    onDay?.(day, state);
    for (const r of planReminders(state).reminders) {
      sent.push({ day, reminder: r });
      for (const i of r.items) state.triggered.add(pairKey(i.invoiceId, i.stepId));
    }
  }
  return sent;
}

describe("dates", () => {
  it("compte les jours sans erreur de fuseau ni d'heure d'été", () => {
    expect(daysBetween("2026-10-01", "2026-11-05")).toBe(35); // traverse le passage à l'heure normale
    expect(daysBetween("2026-10-04", "2026-10-01")).toBe(-3);
  });
  it("donne la date du jour à Montréal", () => {
    // 3 h UTC le 3 octobre = 23 h le 2 octobre à Montréal
    expect(localDate("America/Toronto", new Date("2026-10-03T03:00:00Z"))).toBe("2026-10-02");
  });
});

describe("bonne étape au bon jour", () => {
  it("envoie exactement J-3, J+1, J+7, J+15, J+30, J+45, une seule fois chacune", () => {
    const sent = simulate(input(), "2026-09-01", "2026-12-31");
    expect(sent.map((s) => daysBetween("2026-10-01", s.day))).toEqual([-3, 1, 7, 15, 30, 45]);
    expect(sent.map((s) => s.reminder.tone)).toEqual(["courteous", "courteous", "courteous", "firm", "firm", "final"]);
  });

  it("n'envoie rien avant la première étape ni entre deux étapes", () => {
    expect(planReminders(input({ today: "2026-09-27" })).reminders).toHaveLength(0); // J-4
    const t = new Set([pairKey("i1", "s1")]);
    expect(planReminders(input({ today: "2026-10-05", triggered: t })).reminders).toHaveLength(0); // J+4
  });

  it("ne rattrape pas les étapes manquées : une facture importée à J+20 reçoit seulement J+15", () => {
    const sent = simulate(input(), "2026-10-21", "2026-11-30");
    expect(sent.map((s) => s.reminder.items[0].offsetDays)).toEqual([15, 30, 45]);
    expect(sent[0].day).toBe("2026-10-21");
  });

  it("respecte une séquence modifiée et les étapes désactivées", () => {
    const custom: EngineStep[] = [
      { id: "a", offsetDays: 3, tone: "courteous", active: true },
      { id: "b", offsetDays: 10, tone: "firm", active: false },
      { id: "c", offsetDays: 20, tone: "final", active: true },
    ];
    const sent = simulate(input({ sequences: { seq: STEPS, vip: custom }, customers: [customer({ sequenceId: "vip" })] }), "2026-09-01", "2026-12-31");
    expect(sent.map((s) => s.reminder.items[0].offsetDays)).toEqual([3, 20]);
  });
});

describe("arrêt au paiement", () => {
  it("n'envoie plus rien dès que la facture est payée", () => {
    const sent = simulate(input(), "2026-09-01", "2026-12-31", (day, state) => {
      if (day === "2026-10-10") state.invoices = [invoice({ balanceCents: 0, status: "paid" })];
    });
    expect(sent.map((s) => daysBetween("2026-10-01", s.day))).toEqual([-3, 1, 7]);
  });

  it("ignore les factures annulées", () => {
    expect(planReminders(input({ invoices: [invoice({ status: "voided", balanceCents: 0 })] })).reminders).toHaveLength(0);
  });

  it("revérifie juste avant l'envoi et annule si tout est payé", () => {
    const items = [{ invoiceId: "i1" }, { invoiceId: "i2" }];
    const partly = revalidateBeforeSend(items, new Map([
      ["i1", { balanceCents: 0, status: "paid" as const }],
      ["i2", { balanceCents: 500, status: "open" as const }],
    ]));
    expect(partly).toMatchObject({ cancel: false, keep: [{ invoiceId: "i2" }], dropped: [{ invoiceId: "i1" }] });
    const all = revalidateBeforeSend(items, new Map([["i1", null], ["i2", { balanceCents: 0, status: "paid" as const }]]));
    expect(all.cancel).toBe(true);
  });
});

describe("aucun doublon", () => {
  it("deux exécutions le même jour ne produisent qu'un envoi", () => {
    const state = input({ today: "2026-10-08" });
    const first = planReminders(state);
    expect(first.reminders).toHaveLength(1);
    for (const i of first.reminders[0].items) state.triggered.add(pairKey(i.invoiceId, i.stepId));
    expect(planReminders(state).reminders).toHaveLength(0);
  });

  it("si le cron saute un jour, l'étape part le lendemain, une seule fois", () => {
    const sent = simulate(input(), "2026-10-09", "2026-10-14"); // J+8 à J+13 : J+7 manqué la veille
    expect(sent).toHaveLength(1);
    expect(sent[0]).toMatchObject({ day: "2026-10-09", reminder: { items: [{ offsetDays: 7 }] } });
  });
});

describe("exclusions, pauses, désinscriptions", () => {
  it("ne relance jamais un client exclu", () => {
    const plan = planReminders(input({ today: "2026-10-08", customers: [customer({ excluded: true })] }));
    expect(plan.reminders).toHaveLength(0);
    expect(plan.skipped).toEqual([{ customerId: "c1", reason: "excluded" }]);
  });

  it("respecte une pause jusqu'à une date (incluse), puis reprend avec l'étape courante", () => {
    const sent = simulate(input({ customers: [customer({ pausedUntil: "2026-10-20" })] }), "2026-09-01", "2026-12-31");
    expect(sent.map((s) => [daysBetween("2026-10-01", s.day), s.reminder.items[0].offsetDays])).toEqual([
      [20, 15], [30, 30], [45, 45],
    ]);
  });

  it("respecte une pause indéfinie et une désinscription", () => {
    expect(simulate(input({ customers: [customer({ pausedIndefinitely: true })] }), "2026-09-01", "2026-12-31")).toHaveLength(0);
    expect(simulate(input({ customers: [customer({ unsubscribedAt: "2026-09-01T00:00:00Z" })] }), "2026-09-01", "2026-12-31")).toHaveLength(0);
  });

  it("ne relance pas un client sans courriel, ni si l'abonnement est inactif", () => {
    expect(planReminders(input({ today: "2026-10-08", customers: [customer({ email: null })] })).skipped[0].reason).toBe("no_email");
    expect(planReminders(input({ today: "2026-10-08", subscriptionActive: false })).skipped[0].reason).toBe("subscription_inactive");
  });
});

describe("regroupement et réglages par client", () => {
  it("un seul courriel par client, ton le plus sévère, avec ses autres factures en retard", () => {
    const plan = planReminders(input({
      today: "2026-10-31",
      invoices: [
        invoice({ id: "a", dueDate: "2026-10-30" }), // J+1 aujourd'hui
        invoice({ id: "b", dueDate: "2026-10-01" }), // J+30 aujourd'hui
        invoice({ id: "c", dueDate: "2026-10-20" }), // J+11 : déjà relancée à J+7
        invoice({ id: "d", customerId: "c2", dueDate: "2026-10-24" }), // autre client, J+7
      ],
      customers: [customer(), customer({ id: "c2", email: "autre@x.ca" })],
      triggered: new Set([pairKey("c", "s7"), pairKey("b", "s15")]),
    }));
    expect(plan.reminders).toHaveLength(2);
    const r = plan.reminders.find((x) => x.customerId === "c1")!;
    expect(r.items.map((i) => i.invoiceId).sort()).toEqual(["a", "b"]);
    expect(r.tone).toBe("firm");
    expect(r.alsoOverdue.map((i) => i.invoiceId)).toEqual(["c"]);
  });

  it("utilise la langue du client, sinon celle de l'entreprise, et met le contact en copie", () => {
    const plan = planReminders(input({ today: "2026-10-08", defaultLanguage: "fr", customers: [customer({ language: "en", ccEmail: "cfo@x.ca" })] }));
    expect(plan.reminders[0]).toMatchObject({ language: "en", ccEmail: "cfo@x.ca", toEmail: "client@exemple.ca" });
    expect(planReminders(input({ today: "2026-10-08" })).reminders[0].language).toBe("fr");
  });

  it("met en attente d'approbation les relances à J+30 et plus quand l'option est active", () => {
    const at = (day: string) => planReminders(input({ today: day, approvalFromDay: 30 })).reminders[0].status;
    expect(at("2026-10-16")).toBe("scheduled"); // J+15
    expect(at("2026-10-31")).toBe("pending_approval"); // J+30
    expect(at("2026-11-15")).toBe("pending_approval"); // J+45
    expect(planReminders(input({ today: "2026-10-31" })).reminders[0].status).toBe("scheduled");
  });
});
