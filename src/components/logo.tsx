import Link from "next/link";

export function Logo({ name, href = "/" }: { name: string; href?: string }) {
  return (
    <Link href={href} className="flex items-center gap-2 font-semibold tracking-tight text-ink">
      <span className="grid size-8 place-items-center rounded-lg bg-brand-600 text-white shadow-sm">
        <svg viewBox="0 0 24 24" className="size-4.5" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
          <path d="M4 12a8 8 0 0 1 13.7-5.6L20 8.7" />
          <path d="M20 4v4.7h-4.7" />
          <path d="m8.5 12.5 2.5 2.5 4.5-5" />
        </svg>
      </span>
      <span>{name}</span>
    </Link>
  );
}
