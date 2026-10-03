import { Card } from "@/components/ui";
import { getDictionary } from "@/i18n/server";
import { requireSession } from "@/lib/session";

export default async function DashboardPage() {
  const session = await requireSession();
  const { t } = await getDictionary();
  const firstName = session.fullName?.split(" ")[0];
  return (
    <div>
      <h1 className="text-2xl font-semibold tracking-tight">
        {t.app.welcome}{firstName ? `, ${firstName}` : ""} 👋
      </h1>
      <p className="mt-1 text-ink-muted">{session.organizationName}</p>
      <Card className="mt-8 p-8 text-ink-muted">{t.app.upcomingStep}</Card>
    </div>
  );
}
