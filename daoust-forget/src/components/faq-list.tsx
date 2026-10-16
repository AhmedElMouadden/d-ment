"use client";

import { ChevronDown } from "lucide-react";
import Link from "next/link";
import { track } from "@/lib/analytics";

export type FaqEntry = { id: string; q: string; a: string; link?: { href: string; label: string } };

/** Native <details>: keyboard and screen-reader support with no custom ARIA. */
export function FaqList({ items, placement }: { items: FaqEntry[]; placement: string }) {
  return (
    <div className="divide-y divide-line rounded-[var(--radius-card)] border border-line bg-white">
      {items.map((item) => (
        <details
          key={item.id}
          id={`faq-${item.id}`}
          className="group px-5 sm:px-6"
          onToggle={(e) => {
            if ((e.currentTarget as HTMLDetailsElement).open) track("faq_open", { question_id: item.id, placement });
          }}
        >
          <summary className="flex min-h-14 items-center justify-between gap-4 py-4">
            <span className="text-base font-semibold sm:text-lg">{item.q}</span>
            <ChevronDown aria-hidden className="size-5 shrink-0 text-moss transition-transform group-open:rotate-180" />
          </summary>
          <div className="pb-5 text-muted">
            <p>{item.a}</p>
            {item.link && (
              <Link href={item.link.href} className="mt-3 inline-block font-semibold text-forest underline-offset-4 hover:underline">
                {item.link.label}
              </Link>
            )}
          </div>
        </details>
      ))}
    </div>
  );
}
