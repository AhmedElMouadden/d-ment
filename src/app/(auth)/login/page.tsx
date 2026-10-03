import Link from "next/link";
import { Card } from "@/components/ui";
import { getDictionary } from "@/i18n/server";
import { LoginForm } from "../auth-forms";
import { DemoButton } from "../demo-button";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { t } = await getDictionary();
  const { next, error } = await searchParams;
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{t.auth.loginTitle}</h1>
      <p className="mt-1 text-ink-muted">{t.auth.loginSubtitle}</p>
      <Card className="mt-6 p-6">
        {error ? <p role="alert" className="mb-4 rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{t.auth.errors.generic}</p> : null}
        <LoginForm t={t.auth} next={typeof next === "string" ? next : undefined} />
      </Card>
      <p className="mt-6 text-center text-sm text-ink-muted">
        {t.auth.noAccount} <Link href="/signup" className="font-medium text-brand-700 hover:underline dark:text-brand-400">{t.common.signUp}</Link>
      </p>
      <DemoButton label={t.common.tryDemo} />
    </>
  );
}
