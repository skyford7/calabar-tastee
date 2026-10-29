import { useQuery } from "@tanstack/react-query";
import { supabase } from "./supabase";
import type { Category, DirectoryEntry, MenuItem, OpeningHours } from "./types";
import { menuImage } from "./siteImages";

export const qk = {
  categories: ["categories"] as const,
  menu: ["menu_items"] as const,
  hours: ["opening_hours"] as const,
  team: ["team"] as const,
  directory: ["team_directory"] as const,
  timeOff: ["time_off"] as const,
  availability: ["availability"] as const,
  shifts: (from: string, to: string) => ["shifts", from, to] as const,
  feedback: ["feedback"] as const,
  activity: ["activity_logs"] as const,
};

async function unwrap<T>(
  p: PromiseLike<{ data: T | null; error: unknown }>
): Promise<T> {
  const { data, error } = await p;
  if (error) throw error;
  return (data ?? []) as T;
}

/** RLS decides visibility: public sees visible categories; team sees all. */
export const useCategories = () =>
  useQuery({
    queryKey: qk.categories,
    queryFn: () =>
      unwrap<Category[]>(
        supabase
          .from("categories")
          .select("*")
          .order("sort_order")
          .order("name")
      ),
  });

/** RLS decides visibility: public sees available items; team sees all. */
export const useMenuItems = () =>
  useQuery({
    queryKey: qk.menu,
    queryFn: () =>
      unwrap<MenuItem[]>(
        supabase
          .from("menu_items")
          .select("*")
          .order("sort_order")
          .order("name")
      ).then(rows =>
        rows.map(r => ({ ...r, image_url: menuImage(r.image_url) }))
      ),
  });

export const useOpeningHours = () =>
  useQuery({
    queryKey: qk.hours,
    queryFn: () =>
      unwrap<OpeningHours[]>(
        supabase.from("opening_hours").select("*").order("id")
      ),
  });

export const useTeamDirectory = () =>
  useQuery({
    queryKey: qk.directory,
    queryFn: () => unwrap<DirectoryEntry[]>(supabase.rpc("team_directory")),
  });
