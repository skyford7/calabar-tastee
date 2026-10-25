import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "./supabase";

const WATCHED: { table: string; key: readonly string[] }[] = [
  { table: "shifts", key: ["shifts"] },
  { table: "time_off", key: ["time_off"] },
  { table: "announcements", key: ["center-net"] },
  { table: "announcement_comments", key: ["center-net"] },
];

/**
 * Keeps the open page up to date without a refresh:
 *  - Supabase Realtime pushes changes the moment they happen (needs the tables added to the
 *    supabase_realtime publication), and
 *  - a light 15 s refresh while the tab is visible covers anything Realtime misses.
 */
export function useLiveUpdates(enabled: boolean) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!enabled) return;
    const channel = supabase.channel("portal-live");
    for (const { table, key } of WATCHED) {
      channel.on("postgres_changes", { event: "*", schema: "public", table }, () => {
        void qc.invalidateQueries({ queryKey: key });
      });
    }
    channel.subscribe();

    const timer = window.setInterval(() => {
      if (document.visibilityState !== "visible") return;
      for (const { key } of WATCHED) void qc.invalidateQueries({ queryKey: key });
    }, 15_000);
    const onVisible = () => {
      if (document.visibilityState === "visible")
        for (const { key } of WATCHED) void qc.invalidateQueries({ queryKey: key });
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", onVisible);
      void supabase.removeChannel(channel);
    };
  }, [enabled, qc]);
}
