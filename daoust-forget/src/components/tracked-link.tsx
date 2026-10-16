"use client";

import Link from "next/link";
import type { ComponentProps } from "react";
import { track, type AnalyticsEvents, type EventName } from "@/lib/analytics";

type Props<E extends EventName> = Omit<ComponentProps<"a">, "href"> & {
  href: string;
  event: E;
  params: AnalyticsEvents[E];
};

/** Internal links use next/link; tel:, mailto: and external URLs use <a>. */
export function TrackedLink<E extends EventName>({ href, event, params, onClick, ...rest }: Props<E>) {
  const handle: ComponentProps<"a">["onClick"] = (e) => {
    track(event, params);
    onClick?.(e);
  };
  if (href.startsWith("/")) return <Link href={href} onClick={handle} {...rest} />;
  return <a href={href} onClick={handle} {...rest} />;
}
