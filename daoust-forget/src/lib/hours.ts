import type { WeekHours } from "@/content/branches";
import type { Locale } from "./i18n";

export const TIME_ZONE = "America/Toronto"; // Same rules as Montréal.

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Monday = 0 … Sunday = 6, and minutes since midnight, in Québec time. */
export function localNow(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].indexOf(get("weekday"));
  return { day, minutes: Number(get("hour")) * 60 + Number(get("minute")) };
}

export type OpenState =
  | { state: "open"; closesAt: string }
  | { state: "closed"; opensAt?: string; opensDay?: number }
  | { state: "unknown" };

export function openState(hours: WeekHours | null, now: Date): OpenState {
  if (!hours) return { state: "unknown" };
  const { day, minutes } = localNow(now);
  const today = hours[day];
  if (today === "unknown") return { state: "unknown" };
  if (today && minutes >= toMinutes(today[0]) && minutes < toMinutes(today[1])) {
    return { state: "open", closesAt: today[1] };
  }
  if (today && minutes < toMinutes(today[0])) return { state: "closed", opensAt: today[0], opensDay: day };
  for (let i = 1; i <= 7; i++) {
    const d = (day + i) % 7;
    const h = hours[d];
    if (h === "unknown") return { state: "closed" };
    if (h) return { state: "closed", opensAt: h[0], opensDay: d };
  }
  return { state: "closed" };
}

export function formatTime(hhmm: string, lang: Locale) {
  const [h, m] = hhmm.split(":").map(Number);
  if (lang === "fr") return m ? `${h} h ${String(m).padStart(2, "0")}` : `${h} h`;
  const period = h < 12 ? "a.m." : "p.m.";
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export const dayNames: Record<Locale, string[]> = {
  fr: ["Lundi", "Mardi", "Mercredi", "Jeudi", "Vendredi", "Samedi", "Dimanche"],
  en: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"],
};

/** schema.org openingHoursSpecification for confirmed days only. */
export function openingHoursSpec(hours: WeekHours) {
  const schemaDays = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
  return hours.flatMap((h, i) =>
    Array.isArray(h)
      ? [{ "@type": "OpeningHoursSpecification", dayOfWeek: schemaDays[i], opens: h[0], closes: h[1] }]
      : [],
  );
}
