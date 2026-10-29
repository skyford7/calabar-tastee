import { SUPABASE_URL } from "./env";
import { MENU_IMAGES_BUCKET } from "./supabase";

/** Website (non-menu) photos, hosted in Supabase Storage under menu-images/site/. */
export const SITE_IMAGES = [
  { file: "restaurant-hero.jpg", label: "Hero background" },
  { file: "about-image-1.jpg", label: "About — photo 1" },
  { file: "about-image-2.jpg", label: "About — photo 2" },
  { file: "founder.jpg", label: "Meet the Founder" },
  { file: "customer-1.jpg", label: "Customer 1" },
  { file: "customer-2.jpg", label: "Customer 2" },
  { file: "customer-3.jpg", label: "Customer 3" },
  { file: "customer-4.jpg", label: "Customer 4" },
] as const;

export type SiteImageFile = (typeof SITE_IMAGES)[number]["file"];

export function storagePublicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${MENU_IMAGES_BUCKET}/${path}`;
}

/** Photos shipped with the website itself (public/photos/<name>.webp). */
const BUNDLED = new Set([
  "about-image-1", "about-image-2", "abula", "afang-soup-new", "amstel-malt", "appletiser",
  "ayamase-ofada-stew", "ayamase", "bottled-water", "catfish-pepper-soup", "coca-cola",
  "coconut-rice-new", "combo-deal", "vegan-combo", "coffee-biscoff", "customer-1", "customer-2", "customer-3", "customer-4", "eba",
  "edikaikong-new", "efo-riro-new", "egusi-soup-new", "ekpang-nkwkwo", "fanta", "founder",
  "fried-plantain", "fried-rice", "goat-head-isi-ewu", "grilled-chicken", "grilled-fish",
  "jollof-rice-plantain", "jollof-rice", "malta-guinness", "meatpie", "moi-moi-new",
  "ogbono-soup-new", "okra-soup-new", "pepper-soup-goat", "peppered-snail", "poundo-yam",
  "puffpuff", "restaurant-hero", "rice-and-stew", "san-pellegrino-lemon",
  "san-pellegrino-orange", "sprite", "stew-beef", "stew-chicken", "suya-new",
  "vegetarian-beans-dodo", "zobo-small",
]);

function bundled(fileName: string): string | null {
  const stem = fileName.replace(/\.[a-z0-9]+$/i, "");
  return BUNDLED.has(stem) ? `/photos/${stem}.webp` : null;
}

/** Public URL of a website photo. */
export function siteImage(file: SiteImageFile): string {
  return bundled(file) ?? storagePublicUrl(`site/${file}`);
}

/** URL to show for a dish photo: an uploaded photo if there is one, otherwise the built-in copy. */
export function menuImage(url: string | null | undefined): string | null {
  if (!url) return null;
  if (isHosted(url)) return url;
  return bundled(fileNameOf(url)) ?? url;
}

/** True when an image URL points at our own storage (not the old site). */
export function isHosted(url: string | null | undefined): boolean {
  return !!url && url.includes("/storage/v1/object/public/");
}

/** "https://x/y/egusi-soup-new.jpg?v=1" → "egusi-soup-new.jpg" */
export function fileNameOf(url: string | null | undefined): string {
  if (!url) return "";
  const clean = url.split("?")[0].split("#")[0];
  return decodeURIComponent(clean.substring(clean.lastIndexOf("/") + 1)).toLowerCase();
}

/** Shrink a photo in the browser before upload (max 1600px, JPEG). Falls back to the original. */
export async function compressImage(file: File, maxSide = 1600, quality = 0.85): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
    const w = Math.round(bitmap.width * scale);
    const h = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, w, h);
    bitmap.close();
    const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", quality));
    return blob && blob.size < file.size ? blob : file;
  } catch {
    return file;
  }
}
