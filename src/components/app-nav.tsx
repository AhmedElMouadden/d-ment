"use client";
import clsx from "clsx";
import { Activity, CheckCheck, CreditCard, FileText, LayoutDashboard, ListOrdered, Settings, Users } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { Dictionary } from "@/i18n/fr";

const items = [
  { href: "/app", key: "dashboard", icon: LayoutDashboard },
  { href: "/app/invoices", key: "invoices", icon: FileText },
  { href: "/app/customers", key: "customers", icon: Users },
  { href: "/app/approvals", key: "approvals", icon: CheckCheck },
  { href: "/app/sequences", key: "sequences", icon: ListOrdered },
  { href: "/app/activity", key: "activity", icon: Activity },
  { href: "/app/settings", key: "settings", icon: Settings },
  { href: "/app/billing", key: "billing", icon: CreditCard },
] as const;

export function AppNav({ t }: { t: Dictionary["nav"] }) {
  const pathname = usePathname();
  return (
    <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
      {items.map(({ href, key, icon: Icon }) => {
        const active = href === "/app" ? pathname === "/app" : pathname.startsWith(href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={clsx(
              "flex shrink-0 items-center gap-3 rounded-xl px-3 py-2 text-sm font-medium transition",
              active ? "bg-brand-50 text-brand-800 dark:bg-brand-950 dark:text-brand-200" : "text-ink-muted hover:bg-surface-muted hover:text-ink",
            )}
          >
            <Icon className="size-4.5" aria-hidden />
            {t[key]}
          </Link>
        );
      })}
    </nav>
  );
}
