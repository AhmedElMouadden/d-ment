"use client";
import { Download, Trash2 } from "lucide-react";
import Link from "next/link";
import { useActionState, useState } from "react";
import { Button, buttonClass, Input } from "@/components/ui";
import { en } from "@/i18n/en";
import { fr } from "@/i18n/fr";
import { deleteAccount } from "./actions";

export function DataCard({ uiLang }: { uiLang: "fr" | "en" }) {
  const t = (uiLang === "fr" ? fr : en).settings.data;
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [state, action, pending] = useActionState(deleteAccount, undefined);
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <a href="/api/account/export" className={buttonClass("secondary")}><Download className="size-4" aria-hidden /> {t.export}</a>
        <Link href="/privacy" className={buttonClass("ghost")}>{t.privacy}</Link>
      </div>
      {!open ? (
        <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-2 text-sm font-medium text-rose-700 hover:underline dark:text-rose-400">
          <Trash2 className="size-4" aria-hidden /> {t.delete}
        </button>
      ) : (
        <form action={action} className="space-y-3 rounded-xl bg-rose-50 p-4 dark:bg-rose-950/40">
          <p className="text-sm text-rose-800 dark:text-rose-200">{t.deleteConfirm}</p>
          <Input name="confirm" value={word} onChange={(e) => setWord(e.target.value)} placeholder={t.deleteWord} aria-label={t.deleteConfirm} />
          {state?.billing && <p role="alert" className="text-sm font-medium text-rose-800 dark:text-rose-200">{t.deleteBillingError}</p>}
          <Button type="submit" disabled={pending || word.trim().toUpperCase() !== t.deleteWord} className="bg-rose-600 hover:bg-rose-700 disabled:bg-rose-300">
            <Trash2 className="size-4" aria-hidden /> {t.delete}
          </Button>
        </form>
      )}
    </div>
  );
}
