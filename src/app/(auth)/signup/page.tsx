import Link from "next/link";
import { Card } from "@/components/ui";
import { getDictionary } from "@/i18n/server";
import { SignupForm } from "../auth-forms";
import { DemoButton } from "../demo-button";

export default async function SignupPage() {
  const { t } = await getDictionary();
  return (
    <>
      <h1 className="text-2xl font-semibold tracking-tight">{t.auth.signupTitle}</h1>
      <p className="mt-1 text-ink-muted">{t.auth.signupSubtitle}</p>
      <Card className="mt-6 p-6">
        <SignupForm t={t.auth} />
      </Card>
      <p className="mt-6 text-center text-sm text-ink-muted">
        {t.auth.haveAccount} <Link href="/login" className="font-medium text-brand-700 hover:underline dark:text-brand-400">{t.common.signIn}</Link>
      </p>
      <DemoButton label={t.common.tryDemo} />
    </>
  );
}
