"use client";

import { Clock } from "lucide-react";
import { useEffect, useState } from "react";
import type { WeekHours } from "@/content/branches";
import type { Dict } from "@/dictionaries";
import { fmt } from "@/lib/fmt";
import { dayNames, formatTime, localNow, openState, type OpenState } from "@/lib/hours";
import type { Locale } from "@/lib/i18n";

/** Live open/closed status. Computed after mount so server HTML never goes stale. */
export function OpenNow({ hours, lang, dict }: { hours: WeekHours | null; lang: Locale; dict: Dict["branch"] }) {
  const [state, setState] = useState<OpenState | null>(null);
  const [today, setToday] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setState(openState(hours, now));
      setToday(localNow(now).day);
    };
    tick();
    const id = setInterval(tick, 60_000);
    return () => clearInterval(id);
  }, [hours]);

  if (!hours) {
    return (
      <p className="flex gap-2 text-muted">
        <Clock aria-hidden className="mt-1 size-4 shrink-0 text-moss" />
        {dict.hoursUnknown}
      </p>
    );
  }
  if (!state) return <p className="h-6" aria-hidden />;

  let text: string;
  if (state.state === "open") text = fmt(dict.openNow, { time: formatTime(state.closesAt, lang) });
  else if (state.state === "closed" && state.opensAt !== undefined && state.opensDay !== undefined) {
    const day = state.opensDay === today ? dict.today : dayNames[lang][state.opensDay].toLowerCase();
    text = `${dict.closedNow} · ${fmt(dict.opensAt, { day, time: formatTime(state.opensAt, lang) })}`;
  } else if (state.state === "closed") text = dict.closedNow;
  else text = dict.hoursUnknown;

  return (
    <p className="flex gap-2">
      <Clock aria-hidden className="mt-1 size-4 shrink-0 text-moss" />
      <span className={state.state === "open" ? "font-semibold text-success" : "text-muted"}>{text}</span>
    </p>
  );
}
