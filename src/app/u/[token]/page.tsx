import { CheckCircle2 } from "lucide-react";
import { notFound } from "next/navigation";
import { Button, Card } from "@/components/ui";
import { findByUnsubscribeToken, unsubscribe } from "@/lib/unsubscribe";

const TEXT = {
  fr: {
    title: "Ne plus recevoir les rappels de paiement",
    body: (c: string) => `Vous ne recevrez plus de rappels automatiques de ${c} à cette adresse. Vos factures restent dues ; ${c} pourra toujours vous écrire directement.`,
    confirm: "Confirmer la désinscription",
    done: "C'est fait. Vous ne recevrez plus ces rappels.",
  },
  en: {
    title: "Stop receiving payment reminders",
    body: (c: string) => `You will no longer receive automatic reminders from ${c} at this address. Your invoices remain due; ${c} can still contact you directly.`,
    confirm: "Confirm unsubscribe",
    done: "Done. You will no longer receive these reminders.",
  },
};

/** Page publique de désinscription. Le GET n'agit pas (les antivirus ouvrent les liens) : il faut confirmer. */
export default async function UnsubscribePage({ params }: PageProps<"/u/[token]">) {
  const { token } = await params;
  const customer = await findByUnsubscribeToken(token);
  if (!customer) notFound();
  const org = customer.organizations as unknown as { name: string; sender_name: string | null; default_language: "fr" | "en" } | null;
  const lang = (customer.language ?? org?.default_language ?? "fr") as "fr" | "en";
  const t = TEXT[lang];
  const company = org?.sender_name || org?.name || "";

  async function confirm() {
    "use server";
    await unsubscribe(token);
  }

  return (
    <main lang={lang === "fr" ? "fr-CA" : "en-CA"} className="flex flex-1 items-start justify-center px-4 py-16">
      <Card className="w-full max-w-md p-8">
        <h1 className="text-xl font-semibold tracking-tight">{t.title}</h1>
        {customer.unsubscribed_at ? (
          <p className="mt-4 flex items-start gap-2 text-ink-muted"><CheckCircle2 className="mt-0.5 size-5 shrink-0 text-brand-600" aria-hidden /> {t.done}</p>
        ) : (
          <>
            <p className="mt-4 text-ink-muted">{t.body(company)}</p>
            <form action={confirm} className="mt-6">
              <Button type="submit" className="w-full">{t.confirm}</Button>
            </form>
          </>
        )}
      </Card>
    </main>
  );
}
