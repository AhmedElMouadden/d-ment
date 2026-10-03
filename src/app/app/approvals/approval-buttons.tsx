"use client";
import { Check, X } from "lucide-react";
import { useTransition } from "react";
import { Button } from "@/components/ui";
import { decideReminders } from "../actions";

export function ApprovalButtons({ ids, approve, reject, all }: { ids: string[]; approve: string; reject?: string; all?: boolean }) {
  const [pending, start] = useTransition();
  return (
    <div className="flex gap-2">
      {reject && (
        <Button type="button" variant="ghost" size="sm" disabled={pending} onClick={() => start(() => decideReminders(ids, "rejected"))}>
          <X className="size-4" aria-hidden /> {reject}
        </Button>
      )}
      <Button type="button" variant={all ? "secondary" : "primary"} size="sm" disabled={pending} onClick={() => start(() => decideReminders(ids, "approved"))}>
        <Check className="size-4" aria-hidden /> {approve}
      </Button>
    </div>
  );
}
