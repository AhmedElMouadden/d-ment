import { useId, type ReactNode } from "react";
import type { Dict } from "@/dictionaries";
import { canShow, isPreview, type Sourced, type Verification } from "@/lib/verification";

/**
 * Preview-only disclosure that a fact still needs confirmation. Built from
 * phrasing content (button + popover span) so it can sit inside headings and
 * paragraphs; the native Popover API handles focus, Escape and light dismiss.
 */
export function VerificationBadge({ v, dict }: { v: Verification; dict: Pick<Dict, "preview"> }) {
  const id = useId();
  if (!isPreview || v.status === "verified") return null;
  return (
    <>
      <button
        type="button"
        popoverTarget={id}
        className="inline-flex min-h-6 cursor-help items-center rounded-full bg-clay-soft px-2 align-middle font-sans text-[0.6875rem] font-semibold tracking-normal text-clay normal-case ring-1 ring-clay/30 ring-inset"
      >
        {dict.preview.badge}
      </button>
      <span
        id={id}
        popover="auto"
        className="m-auto w-80 max-w-[calc(100vw-2rem)] rounded-xl border border-line bg-white p-4 text-left font-sans text-sm leading-relaxed font-normal tracking-normal text-ink normal-case shadow-xl backdrop:bg-ink/20"
      >
        <span className="block">
          <strong>{dict.preview.source} :</strong> <span className="break-words">{v.source}</span>
        </span>
        {v.note && (
          <span className="mt-2 block">
            <strong>{dict.preview.toConfirm} :</strong> {v.note}
          </span>
        )}
      </span>
    </>
  );
}

/** Render a sourced fact, or a fallback when it cannot be shown in strict mode. */
export function Fact<T>({
  fact,
  dict,
  children,
  fallback = null,
}: {
  fact: Sourced<T> | null | undefined;
  dict: Pick<Dict, "preview">;
  children: (value: T) => ReactNode;
  fallback?: ReactNode;
}) {
  if (!fact || !canShow(fact.verification)) return <>{fallback}</>;
  return (
    <>
      {children(fact.value)} <VerificationBadge v={fact.verification} dict={dict} />
    </>
  );
}
