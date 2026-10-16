"use client";

import { ExternalLink } from "lucide-react";
import { track } from "@/lib/analytics";
import { fmt } from "@/lib/fmt";
import { buttonClass, type ButtonVariant } from "./ui";

/**
 * Link to an ordering platform on another domain. The visible note tells the
 * customer they are leaving this site before they click. This records a
 * click only; completed orders must be measured on the platform itself.
 */
export function OutboundOrderLink({
  url,
  host,
  label,
  leavingTemplate,
  destination,
  placement,
  variant = "primary",
}: {
  url: string;
  host: string;
  label: string;
  leavingTemplate: string;
  destination: string;
  placement: string;
  variant?: ButtonVariant;
}) {
  const noteId = `leave-${destination}-${placement}`;
  return (
    <div>
      <a
        href={url}
        rel="noopener"
        aria-describedby={noteId}
        className={buttonClass(variant, "lg")}
        onClick={() => track("order_cta_click", { destination, placement })}
      >
        {label}
        <ExternalLink aria-hidden className="size-4" />
      </a>
      <p id={noteId} className="mt-2 text-sm text-muted">
        {fmt(leavingTemplate, { host })}
      </p>
    </div>
  );
}
