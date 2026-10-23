export const TIME_ZONE = "Europe/London";

const gbp = new Intl.NumberFormat("en-GB", {
  style: "currency",
  currency: "GBP",
});
export const formatPrice = (n: number | string) => gbp.format(Number(n));

/** "12:00:00" → "12:00" */
export const hhmm = (t: string | null | undefined) => (t ? t.slice(0, 5) : "");

/** Today's date in London as YYYY-MM-DD, regardless of the device's timezone. */
export function londonToday(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIME_ZONE }).format(
    new Date()
  );
}

/** Current London wall-clock: weekday name (lowercase) and minutes since midnight. */
export function londonNow(): { day: string; minutes: number } {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    weekday: "long",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? "";
  return {
    day: get("weekday").toLowerCase(),
    minutes: Number(get("hour")) * 60 + Number(get("minute")),
  };
}

// Pure date arithmetic on YYYY-MM-DD strings (UTC-anchored, no DST surprises).
const toUTC = (d: string) => new Date(`${d}T00:00:00Z`);
const fromUTC = (d: Date) => d.toISOString().slice(0, 10);

export function addDays(date: string, n: number): string {
  const d = toUTC(date);
  d.setUTCDate(d.getUTCDate() + n);
  return fromUTC(d);
}

/** Monday of the week containing `date`. */
export function startOfWeek(date: string): string {
  const dow = (toUTC(date).getUTCDay() + 6) % 7; // 0 = Monday
  return addDays(date, -dow);
}

export function weekDays(monday: string): string[] {
  return Array.from({ length: 7 }, (_, i) => addDays(monday, i));
}

export function formatDay(
  date: string,
  opts: Intl.DateTimeFormatOptions = {
    weekday: "short",
    day: "numeric",
    month: "short",
  }
) {
  return new Intl.DateTimeFormat("en-GB", { ...opts, timeZone: "UTC" }).format(
    toUTC(date)
  );
}

export function formatDateTime(iso: string) {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

/** Shift length in hours from two HH:MM(:SS) strings on the same day. */
export function shiftHours(start: string, end: string): number {
  const m = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  return Math.max(0, (m(end) - m(start)) / 60);
}
