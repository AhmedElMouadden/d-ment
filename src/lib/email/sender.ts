export interface OutgoingEmail {
  from: string;
  replyTo: string | null;
  to: string;
  cc: string | null;
  subject: string;
  html: string;
  text: string;
  /** Clé d'idempotence : le fournisseur refuse un second envoi avec la même clé. */
  idempotencyKey: string;
  unsubscribeUrl: string;
}

export interface EmailSender {
  readonly name: string;
  send(email: OutgoingEmail): Promise<{ id: string }>;
}

/** Nom affiché « Studio Bleu inc. » + adresse technique Dûment. */
export function formatFrom(senderName: string, address: string) {
  const safe = senderName.replace(/["<>\r\n]/g, "").trim() || "Dûment";
  return `"${safe}" <${address}>`;
}

export class ResendSender implements EmailSender {
  readonly name = "resend";
  constructor(private readonly apiKey: string, private readonly fetchImpl: typeof fetch = fetch) {}

  async send(e: OutgoingEmail) {
    const res = await this.fetchImpl("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
        "Idempotency-Key": e.idempotencyKey,
      },
      body: JSON.stringify({
        from: e.from,
        to: [e.to],
        cc: e.cc ? [e.cc] : undefined,
        reply_to: e.replyTo ?? undefined,
        subject: e.subject,
        html: e.html,
        text: e.text,
        headers: {
          "List-Unsubscribe": `<${e.unsubscribeUrl}>`,
          "List-Unsubscribe-Post": "List-Unsubscribe=One-Click",
        },
      }),
    });
    const json = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(`Resend ${res.status}: ${json.message ?? "erreur inconnue"}`);
    return { id: json.id as string };
  }
}

/** Mode démo et tests : rien ne part, les courriels sont gardés en mémoire. */
export class MemorySender implements EmailSender {
  readonly name = "memory";
  readonly outbox: OutgoingEmail[] = [];
  async send(e: OutgoingEmail) {
    this.outbox.push(e);
    return { id: `mem_${this.outbox.length}` };
  }
}

export function createSender(): EmailSender {
  const key = process.env.RESEND_API_KEY;
  if (!key) throw new Error("RESEND_API_KEY manquant");
  return new ResendSender(key);
}
