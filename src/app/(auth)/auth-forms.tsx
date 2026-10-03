"use client";
import { Mail } from "lucide-react";
import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import type { Dictionary } from "@/i18n/fr";
import { sendMagicLink, signInWithPassword, signUp, type AuthState } from "./actions";

function Message({ state }: { state: AuthState }) {
  if (!state) return null;
  return state.error ? (
    <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:bg-rose-950 dark:text-rose-300">{state.error}</p>
  ) : (
    <p role="status" className="rounded-xl bg-brand-50 px-3 py-2 text-sm text-brand-800 dark:bg-brand-950 dark:text-brand-200">{state.info}</p>
  );
}

export function LoginForm({ t, next }: { t: Dictionary["auth"]; next?: string }) {
  const [pwState, pwAction, pwPending] = useActionState(signInWithPassword, undefined);
  const [mlState, mlAction, mlPending] = useActionState(sendMagicLink, undefined);
  return (
    <div className="space-y-6">
      <form action={pwAction} className="space-y-4">
        <input type="hidden" name="next" value={next ?? "/app"} />
        <div>
          <Label htmlFor="email">{t.email}</Label>
          <Input id="email" name="email" type="email" autoComplete="email" required />
        </div>
        <div>
          <Label htmlFor="password">{t.password}</Label>
          <Input id="password" name="password" type="password" autoComplete="current-password" required />
        </div>
        <Message state={pwState} />
        <Button type="submit" className="w-full" disabled={pwPending}>{t.submitLogin}</Button>
      </form>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wide text-ink-subtle">
        <span className="h-px flex-1 bg-line" />{t.or}<span className="h-px flex-1 bg-line" />
      </div>

      <form action={mlAction} className="space-y-3">
        <input type="hidden" name="next" value={next ?? "/app"} />
        <Label htmlFor="ml-email" className="sr-only">{t.email}</Label>
        <Input id="ml-email" name="email" type="email" autoComplete="email" placeholder={t.email} required />
        <Message state={mlState} />
        <Button type="submit" variant="secondary" className="w-full" disabled={mlPending}>
          <Mail className="size-4" aria-hidden /> {t.magicLink}
        </Button>
      </form>
    </div>
  );
}

export function SignupForm({ t }: { t: Dictionary["auth"] }) {
  const [state, action, pending] = useActionState(signUp, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="fullName">{t.fullName}</Label>
          <Input id="fullName" name="fullName" autoComplete="name" />
        </div>
        <div>
          <Label htmlFor="companyName">{t.companyName}</Label>
          <Input id="companyName" name="companyName" autoComplete="organization" />
        </div>
      </div>
      <div>
        <Label htmlFor="email">{t.email}</Label>
        <Input id="email" name="email" type="email" autoComplete="email" required />
      </div>
      <div>
        <Label htmlFor="password">{t.password}</Label>
        <Input id="password" name="password" type="password" autoComplete="new-password" minLength={8} required />
      </div>
      <Message state={state} />
      <Button type="submit" className="w-full" disabled={pending}>{t.submitSignup}</Button>
    </form>
  );
}
