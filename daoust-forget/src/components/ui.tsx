import clsx from "clsx";
import type { ComponentProps, ReactNode } from "react";

export type ButtonVariant = "primary" | "secondary" | "quiet" | "light";

const variants: Record<ButtonVariant, string> = {
  primary: "bg-forest text-white hover:bg-forest-deep shadow-sm",
  secondary: "bg-white text-forest ring-1 ring-inset ring-forest/30 hover:bg-forest-soft",
  quiet: "text-forest underline-offset-4 hover:underline px-0! min-h-0!",
  light: "bg-paper text-forest-deep hover:bg-white",
};

/** Touch targets are at least 44 px high (WCAG 2.5.8 asks 24, we go further). */
export function buttonClass(variant: ButtonVariant = "primary", size: "md" | "lg" = "md", className?: string) {
  return clsx(
    "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-colors",
    "disabled:cursor-not-allowed disabled:opacity-60",
    size === "md" && "min-h-11 px-5 text-[0.9375rem]",
    size === "lg" && "min-h-12 px-6 text-base",
    variants[variant],
    className,
  );
}

export function Container({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8", className)} {...props} />;
}

export function Section({
  id,
  className,
  tone = "paper",
  labelledBy,
  children,
}: {
  id?: string;
  className?: string;
  tone?: "paper" | "linen" | "forest";
  labelledBy?: string;
  children: ReactNode;
}) {
  return (
    <section
      id={id}
      aria-labelledby={labelledBy}
      className={clsx(
        "py-16 sm:py-20",
        tone === "linen" && "bg-linen",
        tone === "forest" && "on-dark bg-forest-deep text-paper",
        className,
      )}
    >
      <Container>{children}</Container>
    </section>
  );
}

export function Eyebrow({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p className={clsx("mb-3 text-sm font-semibold tracking-wide text-moss uppercase", className)}>{children}</p>
  );
}

export function SectionHeading({
  id,
  eyebrow,
  title,
  lead,
  className,
}: {
  id: string;
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx("mb-10 max-w-2xl", className)}>
      {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
      <h2 id={id} className="text-3xl sm:text-4xl">
        {title}
      </h2>
      {lead && <p className="mt-4 text-lg text-muted">{lead}</p>}
    </div>
  );
}

export function Card({ className, ...props }: ComponentProps<"div">) {
  return <div className={clsx("rounded-[var(--radius-card)] border border-line bg-white", className)} {...props} />;
}

export function Chip({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "forest" | "clay" }) {
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold",
        tone === "neutral" && "bg-sand text-ink",
        tone === "forest" && "bg-forest-soft text-forest-deep",
        tone === "clay" && "bg-clay-soft text-clay",
      )}
    >
      {children}
    </span>
  );
}

export function PageHeader({ title, lead, children }: { title: string; lead?: string; children?: ReactNode }) {
  return (
    <div className="border-b border-line bg-linen">
      <Container className="py-12 sm:py-16">
        <h1 className="max-w-3xl text-4xl sm:text-5xl">{title}</h1>
        {lead && <p className="mt-4 max-w-2xl text-lg text-muted">{lead}</p>}
        {children}
      </Container>
    </div>
  );
}
