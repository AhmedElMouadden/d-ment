import type { CompanyInfo, ExternalCustomer, ExternalInvoice, Language } from "../accounting/types";
import { addDays, createRng } from "./random";

/**
 * Jeu de données fictif réaliste pour une petite agence québécoise.
 * Les dates sont calculées par rapport à `today` : la démo a toujours des
 * factures à échéance proche, en retard dans chaque tranche d'âge, et des
 * factures payées (certaines après relance) pour alimenter les statistiques.
 */
export interface DemoCustomer extends ExternalCustomer {
  language: Language;
  ccEmail: string | null;
  excluded: boolean;
  /** Pause jusqu'à cette date (incluse). */
  pausedUntil: string | null;
}

export interface DemoDataset {
  company: CompanyInfo;
  customers: DemoCustomer[];
  invoices: ExternalInvoice[];
}

const CUSTOMERS: Array<Omit<DemoCustomer, "externalId" | "active">> = [
  { displayName: "Boulangerie Saint-Viateur", companyName: "Boulangerie Saint-Viateur inc.", contactName: "Marie-Ève Tremblay", email: "comptes@stviateur.example", language: "fr", ccEmail: null, excluded: false, pausedUntil: null },
  { displayName: "Clinique Dentaire Laurier", companyName: "Clinique Dentaire Laurier", contactName: "Dr Patrick Gagnon", email: "admin@cliniquelaurier.example", language: "fr", ccEmail: "compta@cliniquelaurier.example", excluded: false, pausedUntil: null },
  { displayName: "Northwind Logistics", companyName: "Northwind Logistics Ltd.", contactName: "Sarah Mitchell", email: "ap@northwind.example", language: "en", ccEmail: null, excluded: false, pausedUntil: null },
  { displayName: "Microbrasserie du Fleuve", companyName: "Microbrasserie du Fleuve", contactName: "Jean-François Roy", email: "jf@dufleuve.example", language: "fr", ccEmail: null, excluded: false, pausedUntil: null },
  { displayName: "Groupe Immobilier Côté", companyName: "Groupe Immobilier Côté", contactName: "Isabelle Côté", email: "facturation@gicote.example", language: "fr", ccEmail: null, excluded: false, pausedUntil: null },
  { displayName: "Maple Ridge Consulting", companyName: "Maple Ridge Consulting", contactName: "David Chen", email: "billing@mapleridge.example", language: "en", ccEmail: null, excluded: false, pausedUntil: null },
  { displayName: "Atelier Bois Franc", companyName: "Atelier Bois Franc", contactName: "Luc Bergeron", email: "luc@boisfranc.example", language: "fr", ccEmail: null, excluded: false, pausedUntil: null },
  { displayName: "Fondation Les Petits Pas", companyName: "Fondation Les Petits Pas", contactName: "Nathalie Lavoie", email: "dons@petitspas.example", language: "fr", ccEmail: null, excluded: true, pausedUntil: null },
  { displayName: "Studio Pixel Nord", companyName: "Studio Pixel Nord", contactName: "Olivier Pelletier", email: "olivier@pixelnord.example", language: "fr", ccEmail: null, excluded: false, pausedUntil: "PAUSE" },
  { displayName: "Harbourfront Dental", companyName: "Harbourfront Dental Group", contactName: "Emily Walsh", email: "accounts@harbourfront.example", language: "en", ccEmail: null, excluded: false, pausedUntil: null },
  { displayName: "Garage Mécanique Fortin", companyName: "Garage Mécanique Fortin", contactName: "Sylvain Fortin", email: null, language: "fr", ccEmail: null, excluded: false, pausedUntil: null },
  { displayName: "Cabinet Juridique Morin", companyName: "Morin Avocats", contactName: "Me Catherine Morin", email: "cmorin@morinavocats.example", language: "fr", ccEmail: null, excluded: false, pausedUntil: null },
];

/**
 * Jours de retard visés pour les factures ouvertes (négatif = pas encore échu).
 * Couvre les étapes J-3, J+1, J+7, J+15, J+30, J+45 et chaque tranche d'âge.
 */
const OPEN_INVOICE_OVERDUE_DAYS = [-12, -3, -3, -1, 1, 3, 7, 7, 12, 15, 22, 30, 38, 45, 52, 67, 75, 96, 120];

export function generateDemoDataset(today: string, seed = 2026): DemoDataset {
  const rng = createRng(seed);

  const customers: DemoCustomer[] = CUSTOMERS.map((c, i) => ({
    ...c,
    externalId: String(i + 1),
    active: true,
    pausedUntil: c.pausedUntil === "PAUSE" ? addDays(today, 14) : c.pausedUntil,
  }));

  const invoices: ExternalInvoice[] = [];
  let docNumber = 1040;
  const terms = [15, 30, 30, 30, 45];
  const amount = () => rng.int(8, 120) * 5000 + rng.pick([0, 0, 2500, 7500]); // 400 $ à 6 000 $

  const push = (customer: DemoCustomer, dueDate: string, termDays: number, paidDate: string | null) => {
    docNumber += 1;
    const total = amount();
    invoices.push({
      externalId: String(9000 + invoices.length + 1),
      customerExternalId: customer.externalId,
      docNumber: String(docNumber),
      issueDate: addDays(dueDate, -termDays),
      dueDate,
      totalCents: total,
      balanceCents: paidDate ? 0 : total,
      currency: "CAD",
      voided: false,
      paidDate,
      invoiceLink: rng.chance(0.6)
        ? `https://connect.intuit.example/portal/app/CommerceNetwork/view/demo-${docNumber}`
        : null,
    });
  };

  // Factures ouvertes : réparties en boucle sur les clients (plusieurs par client → regroupement)
  OPEN_INVOICE_OVERDUE_DAYS.forEach((overdue, i) => {
    const customer = customers[(i * 5) % customers.length];
    push(customer, addDays(today, -overdue), rng.pick(terms), null);
  });

  // Factures payées des 6 derniers mois : certaines à temps, d'autres après relance
  for (let i = 0; i < 36; i++) {
    const customer = rng.pick(customers);
    const due = addDays(today, -rng.int(10, 180));
    const delay = rng.pick([-5, -2, 0, 2, 4, 9, 16, 21, 33, 48]);
    const paid = addDays(due, delay);
    if (paid >= today) continue;
    push(customer, due, rng.pick(terms), paid);
  }

  return {
    company: { externalId: "demo-realm", name: "Studio Démo inc.", email: "factures@studiodemo.example" },
    customers,
    invoices,
  };
}
