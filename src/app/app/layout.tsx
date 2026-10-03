import { LogOut, Sparkles } from "lucide-react";
import { signOut } from "@/app/(auth)/actions";
import { AppNav } from "@/components/app-nav";
import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { Badge, buttonClass } from "@/components/ui";
import { getDictionary } from "@/i18n/server";
import { requireSession, trialDaysLeft } from "@/lib/session";

export default async function AppLayout({ children }: LayoutProps<"/app">) {
  const session = await requireSession();
  const { t, locale } = await getDictionary();
  const trialDays = trialDaysLeft(session);

  return (
    <div className="flex flex-1 flex-col">
      {session.mode === "demo" && (
        <div className="flex items-center justify-center gap-2 bg-amber-100 px-4 py-2 text-center text-sm text-amber-900 dark:bg-amber-950 dark:text-amber-200">
          <Sparkles className="size-4 shrink-0" aria-hidden /> {t.common.demoBanner}
        </div>
      )}
      <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col lg:flex-row">
        <aside className="border-b border-line px-4 py-4 lg:sticky lg:top-0 lg:h-dvh lg:w-64 lg:shrink-0 lg:border-b-0 lg:border-r lg:py-6">
          <div className="flex items-center justify-between lg:flex-col lg:items-stretch lg:gap-6">
            <Logo name={t.common.appName} href="/app" />
            <div className="hidden lg:block">
              <p className="truncate text-sm font-medium">{session.organizationName}</p>
              {session.subscriptionStatus === "trialing" && trialDays !== null && (
                <div className="mt-1"><Badge tone="brand">{t.app.trialDaysLeft(trialDays)}</Badge></div>
              )}
            </div>
          </div>
          <div className="mt-4 lg:mt-6">
            <AppNav t={t.nav} />
          </div>
          <div className="mt-4 hidden flex-col gap-1 lg:mt-auto lg:flex lg:pt-8">
            <LanguageSwitcher locale={locale} label={t.common.switchTo} className="w-full justify-start" />
            <form action={signOut}>
              <button type="submit" className={`${buttonClass("ghost", "sm")} w-full justify-start`}>
                <LogOut className="size-4" aria-hidden /> {t.common.signOut}
              </button>
            </form>
          </div>
        </aside>
        <main className="min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-10 lg:py-10">{children}</main>
      </div>
    </div>
  );
}
