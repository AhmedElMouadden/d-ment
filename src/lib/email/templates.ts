import type { Lang, Tone } from "../engine/engine";

/**
 * Modèles par défaut. Variables disponibles (identiques en FR et en EN) :
 *   {{client_name}}     nom du contact ou du client
 *   {{company_name}}    votre entreprise (expéditeur)
 *   {{invoice_number}}  numéro de la facture principale (la plus en retard)
 *   {{amount}}          solde de cette facture
 *   {{due_date}}        son échéance
 *   {{days_overdue}}    ses jours de retard
 *   {{total_due}}       total de toutes les factures listées
 *   {{invoice_count}}   nombre de factures listées
 *   {{invoice_list}}    tableau des factures (inséré automatiquement)
 *   {{payment_link}}    lien de paiement QuickBooks ; la ligne disparaît s'il n'existe pas
 */
export const TEMPLATE_VARIABLES = [
  "client_name", "company_name", "invoice_number", "amount", "due_date",
  "days_overdue", "total_due", "invoice_count", "invoice_list", "payment_link",
] as const;
export type TemplateVariable = (typeof TEMPLATE_VARIABLES)[number];

export interface Template { subject: string; body: string }

/** Rappel avant échéance (étapes négatives) : ton courtois, rien n'est en retard. */
export const UPCOMING: Record<Lang, Template> = {
  fr: {
    subject: "Petit rappel : facture {{invoice_number}} à échéance le {{due_date}}",
    body: `Bonjour {{client_name}},

Un petit rappel amical : la facture {{invoice_number}} de {{amount}} arrive à échéance le {{due_date}}.

{{invoice_list}}

Vous pouvez la régler en ligne ici : {{payment_link}}

Si c'est déjà fait, merci beaucoup et ne tenez pas compte de ce message.

Bonne journée,
{{company_name}}`,
  },
  en: {
    subject: "Friendly reminder: invoice {{invoice_number}} due {{due_date}}",
    body: `Hi {{client_name}},

Just a friendly reminder that invoice {{invoice_number}} for {{amount}} is due on {{due_date}}.

{{invoice_list}}

You can pay online here: {{payment_link}}

If you've already taken care of it, thank you, and please disregard this message.

Have a great day,
{{company_name}}`,
  },
};

export const DEFAULT_TEMPLATES: Record<Tone, Record<Lang, Template>> = {
  courteous: {
    fr: {
      subject: "Rappel : facture {{invoice_number}} en attente de paiement",
      body: `Bonjour {{client_name}},

Sauf erreur de notre part, nous n'avons pas encore reçu le paiement de la facture {{invoice_number}} ({{amount}}), arrivée à échéance le {{due_date}}.

{{invoice_list}}

Pour régler en ligne : {{payment_link}}

C'est peut-être simplement passé sous le radar. Si le paiement est déjà en route, merci et ne tenez pas compte de ce courriel. Pour toute question, répondez simplement à ce message.

Merci et bonne journée,
{{company_name}}`,
    },
    en: {
      subject: "Reminder: invoice {{invoice_number}} awaiting payment",
      body: `Hi {{client_name}},

According to our records, we haven't yet received payment for invoice {{invoice_number}} ({{amount}}), which was due on {{due_date}}.

{{invoice_list}}

To pay online: {{payment_link}}

It may simply have slipped through the cracks. If payment is already on its way, thank you, and please disregard this email. If you have any questions, just reply to this message.

Thanks, and have a great day,
{{company_name}}`,
    },
  },
  firm: {
    fr: {
      subject: "Paiement en retard : {{total_due}} à régler",
      body: `Bonjour {{client_name}},

Malgré nos rappels précédents, le solde ci-dessous demeure impayé. La facture {{invoice_number}} est maintenant en retard de {{days_overdue}} jours.

{{invoice_list}}

Total à régler : {{total_due}}

Nous vous demandons de procéder au paiement dans les plus brefs délais : {{payment_link}}

Si un problème empêche le paiement, répondez à ce courriel afin que nous trouvions une solution ensemble.

Cordialement,
{{company_name}}`,
    },
    en: {
      subject: "Overdue payment: {{total_due}} outstanding",
      body: `Hi {{client_name}},

Despite our previous reminders, the balance below remains unpaid. Invoice {{invoice_number}} is now {{days_overdue}} days overdue.

{{invoice_list}}

Total outstanding: {{total_due}}

Please arrange payment as soon as possible: {{payment_link}}

If something is preventing payment, reply to this email so we can work out a solution together.

Regards,
{{company_name}}`,
    },
  },
  final: {
    fr: {
      subject: "Dernier avis avant mise en demeure : {{total_due}}",
      body: `Bonjour {{client_name}},

Ceci est notre dernier avis concernant le solde impayé ci-dessous. La facture {{invoice_number}} est en retard de {{days_overdue}} jours, malgré plusieurs rappels.

{{invoice_list}}

Total à régler : {{total_due}}

Sans paiement ou entente de votre part dans les 10 prochains jours, nous devrons envisager l'envoi d'une mise en demeure.

Pour régler maintenant : {{payment_link}}

Nous préférerions de loin régler la situation à l'amiable. Répondez à ce courriel pour en discuter.

{{company_name}}`,
    },
    en: {
      subject: "Final notice before formal demand: {{total_due}}",
      body: `Hi {{client_name}},

This is our final notice regarding the unpaid balance below. Invoice {{invoice_number}} is {{days_overdue}} days overdue, despite several reminders.

{{invoice_list}}

Total outstanding: {{total_due}}

Without payment or an arrangement from you within the next 10 days, we will have to consider sending a formal demand letter.

To pay now: {{payment_link}}

We would much prefer to resolve this amicably. Reply to this email to discuss.

{{company_name}}`,
    },
  },
};
