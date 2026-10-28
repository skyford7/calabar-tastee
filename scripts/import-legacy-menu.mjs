#!/usr/bin/env node
/**
 * One-off: copy the menu from the OLD Supabase project into the NEW one.
 *
 * Run AFTER 01_schema.sql and 02_seed.sql on the new project:
 *
 *   LEGACY_SUPABASE_URL=https://fnwlnevaqxbabnvmxdtq.supabase.co \
 *   LEGACY_SUPABASE_ANON_KEY=<old anon key> \
 *   NEXT_PUBLIC_SUPABASE_URL=https://<new-ref>.supabase.co \
 *   SUPABASE_SECRET_KEY=<new secret/service_role key> \
 *   node scripts/import-legacy-menu.mjs            # add --dry-run to preview
 *
 * - Creates any categories that don't exist yet (matched by name).
 * - Converts the old text prices ("£12.50") to numbers.
 * - Skips dishes that already exist in the same category (safe to re-run).
 * - Old image paths are not copied (the old site used placeholders); upload
 *   photos in the portal instead.
 */
import { createClient } from "@supabase/supabase-js";

const dryRun = process.argv.includes("--dry-run");
const need = (k) => {
  const v = process.env[k];
  if (!v) {
    console.error(`Missing env var ${k}`);
    process.exit(1);
  }
  return v;
};

const legacy = createClient(need("LEGACY_SUPABASE_URL"), need("LEGACY_SUPABASE_ANON_KEY"), {
  auth: { persistSession: false },
});
const next = createClient(need("NEXT_PUBLIC_SUPABASE_URL"), need("SUPABASE_SECRET_KEY"), {
  auth: { persistSession: false },
});

const toPrice = (p) => {
  const n = Number(String(p ?? "").replace(/[^0-9.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : 0;
};

const { data: oldItems, error: readErr } = await legacy.from("menu_items").select("*").order("sort_order");
if (readErr) {
  console.error("Could not read the old menu:", readErr.message);
  process.exit(1);
}
console.log(`Found ${oldItems.length} items in the old project.`);

const { data: cats, error: catErr } = await next.from("categories").select("id, name, sort_order");
if (catErr) throw catErr;
const catByName = new Map(cats.map((c) => [c.name.toLowerCase(), c.id]));
let nextOrder = Math.max(0, ...cats.map((c) => c.sort_order)) + 10;

for (const name of [...new Set(oldItems.map((i) => (i.category || "Other").trim()))]) {
  if (catByName.has(name.toLowerCase())) continue;
  console.log(`+ category "${name}"`);
  if (dryRun) {
    catByName.set(name.toLowerCase(), -1);
    continue;
  }
  const { data, error } = await next
    .from("categories")
    .insert({ name, slug: "", sort_order: nextOrder })
    .select("id")
    .single();
  if (error) throw error;
  catByName.set(name.toLowerCase(), data.id);
  nextOrder += 10;
}

const { data: existing, error: exErr } = await next.from("menu_items").select("name, category_id");
if (exErr) throw exErr;
const seen = new Set(existing.map((e) => `${e.category_id}|${e.name.toLowerCase()}`));

const rows = [];
for (const i of oldItems) {
  const category_id = catByName.get((i.category || "Other").trim().toLowerCase());
  if (seen.has(`${category_id}|${String(i.name).toLowerCase()}`)) continue;
  rows.push({
    category_id,
    name: String(i.name).trim(),
    description: i.description ?? "",
    price: toPrice(i.price),
    dietary: i.dietary || null,
    is_available: true,
    is_popular: !!i.is_popular,
    is_best_seller: !!i.is_best_seller,
    is_spicy: !!i.is_spicy,
    is_preorder: !!i.is_preorder,
    sort_order: i.sort_order ?? 0,
  });
}

console.log(`${rows.length} new items to import.`);
rows.forEach((r) => console.log(`  · ${r.name} — £${r.price.toFixed(2)}`));

if (!dryRun && rows.length) {
  const { error } = await next.from("menu_items").insert(rows);
  if (error) throw error;
  console.log("Done.");
} else if (dryRun) {
  console.log("Dry run — nothing written.");
}
