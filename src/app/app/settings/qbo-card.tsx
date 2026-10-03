"use client";
import { RefreshCw } from "lucide-react";
import { useActionState } from "react";
import { Button } from "@/components/ui";
import { syncNow } from "./actions";

export function SyncButton({ label, pendingLabel }: { label: string; pendingLabel: string }) {
  const [state, action, pending] = useActionState(syncNow, undefined);
  return (
    <form action={action} className="space-y-3">
      <Button type="submit" variant="secondary" disabled={pending}>
        <RefreshCw className={`size-4 ${pending ? "animate-spin" : ""}`} aria-hidden />
        {pending ? pendingLabel : label}
      </Button>
      {state?.ok && <p role="status" className="text-sm text-brand-700 dark:text-brand-300">{state.ok}</p>}
      {state?.error && <p role="alert" className="text-sm text-rose-700 dark:text-rose-300">{state.error}</p>}
    </form>
  );
}
