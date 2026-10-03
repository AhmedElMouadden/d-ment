import { LanguageSwitcher } from "@/components/language-switcher";
import { Logo } from "@/components/logo";
import { getDictionary } from "@/i18n/server";

export default async function AuthLayout({ children }: LayoutProps<"/">) {
  const { t, locale } = await getDictionary();
  return (
    <div className="flex flex-1 flex-col">
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5 sm:px-6">
        <Logo name={t.common.appName} />
        <LanguageSwitcher locale={locale} label={t.common.switchTo} />
      </header>
      <main className="flex flex-1 items-start justify-center px-4 pb-16 pt-8 sm:pt-16">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
