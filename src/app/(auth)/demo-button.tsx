import { Sparkles } from "lucide-react";
import { buttonClass } from "@/components/ui";
import { isDemoEnabled } from "@/lib/env";
import { startDemo } from "./actions";

export function DemoButton({ label }: { label: string }) {
  if (!isDemoEnabled()) return null;
  return (
    <form action={startDemo} className="mt-3 text-center">
      <button type="submit" className={buttonClass("ghost", "sm")}>
        <Sparkles className="size-4" aria-hidden /> {label}
      </button>
    </form>
  );
}
