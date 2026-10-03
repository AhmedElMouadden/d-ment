"use client";
import { useActionState } from "react";
import { Button, Input, Label } from "@/components/ui";
import { en } from "@/i18n/en";
import { fr } from "@/i18n/fr";
import { saveOrgSettings } from "./actions";

export function OrgForm({ uiLang, values }: {
  uiLang: "fr" | "en";
  values: { senderName: string; replyTo: string; defaultLanguage: "fr" | "en"; approval: boolean };
}) {
  const t = (uiLang === "fr" ? fr : en).settings.org;
  const [state, action, pending] = useActionState(saveOrgSettings, undefined);
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="senderName">{t.senderName}</Label>
          <Input id="senderName" name="senderName" defaultValue={values.senderName} maxLength={120} />
        </div>
        <div>
          <Label htmlFor="replyTo">{t.replyTo}</Label>
          <Input id="replyTo" name="replyTo" type="email" defaultValue={values.replyTo} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <Label htmlFor="defaultLanguage">{t.defaultLanguage}</Label>
          <select id="defaultLanguage" name="defaultLanguage" defaultValue={values.defaultLanguage}
            className="mt-1.5 block w-full rounded-xl border-0 bg-surface px-3 py-2.5 text-sm ring-1 ring-inset ring-line focus:ring-2 focus:ring-brand-600">
            <option value="fr">Français</option>
            <option value="en">English</option>
          </select>
        </div>
        <label className="flex items-center gap-2 self-end pb-2.5 text-sm font-medium">
          <input type="checkbox" name="approval" defaultChecked={values.approval} className="size-4 accent-brand-600" /> {t.approval}
        </label>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{t.save}</Button>
        {state?.ok && <p role="status" className="text-sm text-brand-700 dark:text-brand-300">{t.saved}</p>}
        {state?.error === "invalidEmail" && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{t.invalidEmail}</p>}
      </div>
    </form>
  );
}
