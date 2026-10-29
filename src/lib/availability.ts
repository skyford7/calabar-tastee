import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import { qk } from "./queries";
import type { Availability } from "./types";

export const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"] as const;

/** Rows the signed-in user may see: their own, or everyone's for admins / DBAs (enforced by RLS). */
export function useAvailability() {
  return useQuery({
    queryKey: qk.availability,
    queryFn: async () => {
      const { data, error } = await supabase.from("availability").select("*");
      if (error) return [] as Availability[]; // table not created yet
      return data as Availability[];
    },
  });
}

/** 0 = Monday … 6 = Sunday for a YYYY-MM-DD date. */
export const weekdayOf = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;

/**
 * Is this person available on this date? A date exception beats the weekly pattern.
 * null = they haven't said.
 */
export function availabilityFor(list: Availability[], staffId: string, date: string): boolean | null {
  const own = list.filter(a => a.staff_id === staffId);
  const exact = own.find(a => a.on_date === date);
  if (exact) return exact.available;
  const weekly = own.find(a => a.weekday === weekdayOf(date));
  return weekly ? weekly.available : null;
}
