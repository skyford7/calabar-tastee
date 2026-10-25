import { useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, ImageOff, ImageUp, Loader2, XCircle } from "lucide-react";
import { MENU_IMAGES_BUCKET, errorMessage, supabase } from "@/lib/supabase";
import { qk, useMenuItems } from "@/lib/queries";
import {
  SITE_IMAGES,
  compressImage,
  fileNameOf,
  isHosted,
  siteImage,
  storagePublicUrl,
} from "@/lib/siteImages";
import { Badge, Button, Card, LoadingBlock, PageHeader } from "../ui";

type Row = { name: string; target: string; status: "waiting" | "uploading" | "done" | "skipped" | "error"; note?: string };

const SITE_FILES = new Set<string>(SITE_IMAGES.map(s => s.file));

function Thumb({ src, alt }: { src: string; alt: string }) {
  const [broken, setBroken] = useState(false);
  return broken ? (
    <div className="flex h-full w-full items-center justify-center bg-[#1a1410] text-amber-100/30">
      <ImageOff className="h-6 w-6" />
    </div>
  ) : (
    <img src={src} alt={alt} loading="lazy" className="h-full w-full object-cover" onError={() => setBroken(true)} />
  );
}

export function PhotosPage() {
  const qc = useQueryClient();
  const menu = useMenuItems();
  const input = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [busy, setBusy] = useState(false);
  const [bust, setBust] = useState(() => Date.now());

  const items = menu.data ?? [];
  const hostedCount = items.filter(i => isHosted(i.image_url)).length;

  const update = (name: string, patch: Partial<Row>) =>
    setRows(rs => rs.map(r => (r.name === name ? { ...r, ...patch } : r)));

  const onFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list);
    // Work out where each file goes from its name.
    const plan = files.map(f => {
      const name = f.name.toLowerCase();
      if (SITE_FILES.has(name)) return { file: f, name, kind: "site" as const, ids: [] as number[] };
      const ids = items.filter(i => fileNameOf(i.image_url) === name).map(i => i.id);
      return { file: f, name, kind: ids.length ? ("menu" as const) : ("none" as const), ids };
    });
    setRows(
      plan.map(p => ({
        name: p.name,
        target:
          p.kind === "site"
            ? (SITE_IMAGES.find(s => s.file === p.name)?.label ?? "Website")
            : p.kind === "menu"
              ? items
                  .filter(i => p.ids.includes(i.id))
                  .map(i => i.name)
                  .join(", ")
              : "No match",
        status: p.kind === "none" ? "skipped" : "waiting",
        note: p.kind === "none" ? "File name doesn't match a dish or website photo" : undefined,
      }))
    );

    setBusy(true);
    let ok = 0;
    for (const p of plan) {
      if (p.kind === "none") continue;
      update(p.name, { status: "uploading" });
      try {
        const blob = await compressImage(p.file);
        const path = `${p.kind === "site" ? "site" : "menu"}/${p.name}`;
        const { error } = await supabase.storage.from(MENU_IMAGES_BUCKET).upload(path, blob, {
          upsert: true,
          contentType: blob.type || "image/jpeg",
          cacheControl: "3600",
        });
        if (error) throw error;
        if (p.kind === "menu") {
          const url = `${storagePublicUrl(path)}?v=${Date.now()}`;
          const { error: uError } = await supabase.from("menu_items").update({ image_url: url }).in("id", p.ids);
          if (uError) throw uError;
        }
        ok++;
        update(p.name, { status: "done" });
      } catch (e) {
        update(p.name, { status: "error", note: errorMessage(e) });
      }
    }
    setBusy(false);
    setBust(Date.now());
    if (input.current) input.current.value = "";
    void qc.invalidateQueries({ queryKey: qk.menu });
    toast.success(`${ok} photo${ok === 1 ? "" : "s"} uploaded`);
  };

  return (
    <>
      <PageHeader
        title="Website photos"
        description="Upload all the website and dish photos at once. Each file is matched by its name and goes live straight away."
        actions={
          <>
            <input
              ref={input}
              type="file"
              accept="image/*"
              multiple
              className="hidden"
              onChange={e => void onFiles(e.target.files)}
            />
            <Button onClick={() => input.current?.click()} loading={busy}>
              <ImageUp className="h-4 w-4" /> Choose photos
            </Button>
          </>
        }
      />

      <Card className="mb-6 p-4 text-sm text-amber-100/70">
        Select every photo from the <b className="text-amber-200">Calabar Tastee photo pack</b> in one go (on iPhone: Choose
        Files → open the unzipped folder → Select → Select All). Files keep their names like <code>egusi-soup-new.jpg</code> so
        each one lands on the right dish. Photos are resized automatically.
      </Card>

      {rows.length > 0 && (
        <Card className="mb-6 divide-y divide-amber-900/20">
          {rows.map(r => (
            <div key={r.name} className="flex items-center gap-3 px-4 py-2.5 text-sm">
              {r.status === "done" ? (
                <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-green-400" />
              ) : r.status === "uploading" ? (
                <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-amber-400" />
              ) : r.status === "error" || r.status === "skipped" ? (
                <XCircle className="h-4 w-4 flex-shrink-0 text-red-400" />
              ) : (
                <span className="h-4 w-4 flex-shrink-0 rounded-full border border-amber-900/50" />
              )}
              <span className="min-w-0 flex-1 truncate font-mono text-xs text-amber-100/80">{r.name}</span>
              <span className="hidden min-w-0 flex-1 truncate text-xs text-amber-100/50 sm:block">{r.note ?? r.target}</span>
            </div>
          ))}
        </Card>
      )}

      <h2 className="mb-3 text-lg font-semibold text-white">Website photos</h2>
      <div className="mb-8 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {SITE_IMAGES.map(s => (
          <div key={s.file} className="overflow-hidden rounded-xl border border-amber-900/30 bg-[#231a14]">
            <div className="h-28">
              <Thumb key={bust} src={`${siteImage(s.file)}?v=${bust}`} alt={s.label} />
            </div>
            <div className="px-3 py-2">
              <div className="text-xs font-medium text-white">{s.label}</div>
              <div className="truncate font-mono text-[11px] text-amber-100/40">{s.file}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="mb-3 flex items-center gap-3">
        <h2 className="text-lg font-semibold text-white">Dish photos</h2>
        {!menu.isLoading && (
          <Badge tone={hostedCount === items.length ? "green" : "amber"}>
            {hostedCount} / {items.length} uploaded
          </Badge>
        )}
      </div>
      {menu.isLoading ? (
        <LoadingBlock />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {items.map(i => (
            <div key={i.id} className="overflow-hidden rounded-xl border border-amber-900/30 bg-[#231a14]">
              <div className="h-28">{i.image_url ? <Thumb src={i.image_url} alt={i.name} /> : <Thumb src="" alt="" />}</div>
              <div className="px-3 py-2">
                <div className="truncate text-xs font-medium text-white">{i.name}</div>
                <div className="truncate font-mono text-[11px] text-amber-100/40">
                  {isHosted(i.image_url) ? "✓ hosted" : fileNameOf(i.image_url) || "no photo"}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </>
  );
}
