import { useMemo, useState, type FormEvent } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Eye,
  EyeOff,
  ImagePlus,
  Pencil,
  Plus,
  Search,
  Trash2,
  UtensilsCrossed,
} from "lucide-react";
import { MENU_IMAGES_BUCKET, errorMessage, supabase } from "@/lib/supabase";
import { qk, useCategories, useMenuItems } from "@/lib/queries";
import { formatPrice } from "@/lib/format";
import type { MenuItem } from "@/lib/types";
import { menuImage } from "@/lib/siteImages";
import {
  Badge,
  Button,
  Checkbox,
  EmptyState,
  ErrorBlock,
  Field,
  Input,
  LoadingBlock,
  Modal,
  PageHeader,
  Select,
  Textarea,
  useConfirm,
} from "../ui";

type Draft = Omit<MenuItem, "id" | "updated_at" | "price"> & {
  id?: number;
  price: string;
};

const blank = (category_id: number): Draft => ({
  category_id,
  name: "",
  description: "",
  price: "",
  image_url: null,
  dietary: null,
  is_available: true,
  is_popular: false,
  is_best_seller: false,
  is_spicy: false,
  is_preorder: false,
  sort_order: 0,
});

export function MenuPage() {
  const qc = useQueryClient();
  const confirm = useConfirm();
  const menu = useMenuItems();
  const cats = useCategories();
  const [filterCat, setFilterCat] = useState<number | "all">("all");
  const [search, setSearch] = useState("");
  const [draft, setDraft] = useState<Draft | null>(null);

  const catName = useMemo(
    () => new Map((cats.data ?? []).map(c => [c.id, c.name])),
    [cats.data]
  );
  const items = (menu.data ?? []).filter(
    i =>
      (filterCat === "all" || i.category_id === filterCat) &&
      (!search ||
        `${i.name} ${i.description}`
          .toLowerCase()
          .includes(search.toLowerCase()))
  );

  const invalidate = () => qc.invalidateQueries({ queryKey: qk.menu });

  const save = useMutation({
    mutationFn: async (d: Draft) => {
      const price = Number(d.price.replace(/[£,\s]/g, ""));
      if (!Number.isFinite(price) || price < 0)
        throw new Error("Enter a valid price, e.g. 12.50");
      const row = {
        category_id: d.category_id,
        name: d.name.trim(),
        description: d.description.trim(),
        price: Math.round(price * 100) / 100,
        image_url: d.image_url || null,
        dietary: d.dietary?.trim() || null,
        is_available: d.is_available,
        is_popular: d.is_popular,
        is_best_seller: d.is_best_seller,
        is_spicy: d.is_spicy,
        is_preorder: d.is_preorder,
        sort_order: Number(d.sort_order) || 0,
      };
      const { error } = d.id
        ? await supabase.from("menu_items").update(row).eq("id", d.id)
        : await supabase.from("menu_items").insert(row);
      if (error) throw error;
    },
    onSuccess: (_d, v) => {
      toast.success(v.id ? "Menu item updated" : "Menu item added");
      setDraft(null);
      void invalidate();
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const toggleAvailable = useMutation({
    mutationFn: async (i: MenuItem) => {
      const { error } = await supabase
        .from("menu_items")
        .update({ is_available: !i.is_available })
        .eq("id", i.id);
      if (error) throw error;
    },
    onSuccess: () => void invalidate(),
    onError: e => toast.error(errorMessage(e)),
  });

  const remove = useMutation({
    mutationFn: async (i: MenuItem) => {
      const { error } = await supabase
        .from("menu_items")
        .delete()
        .eq("id", i.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Menu item deleted");
      void invalidate();
    },
    onError: e => toast.error(errorMessage(e)),
  });

  const onDelete = async (i: MenuItem) => {
    const ok = await confirm({
      title: "Delete menu item?",
      message: (
        <>
          <strong className="text-white">{i.name}</strong> will be removed from
          the menu permanently. To hide it temporarily, use the eye icon
          instead.
        </>
      ),
      confirmLabel: "Delete",
      danger: true,
    });
    if (ok) remove.mutate(i);
  };

  const firstCat = cats.data?.[0]?.id;

  return (
    <>
      <PageHeader
        title="Menu items"
        description="Changes appear on calabartastee.com straight away. Every change is recorded in the activity log."
        actions={
          <Button
            onClick={() =>
              firstCat &&
              setDraft(blank(filterCat === "all" ? firstCat : filterCat))
            }
            disabled={!firstCat}
          >
            <Plus className="h-4 w-4" /> Add item
          </Button>
        }
      />

      <div className="mb-4 flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-amber-100/30" />
          <Input
            placeholder="Search dishes…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select
          value={filterCat}
          onChange={e =>
            setFilterCat(
              e.target.value === "all" ? "all" : Number(e.target.value)
            )
          }
          className="sm:w-56"
        >
          <option value="all">All categories</option>
          {cats.data?.map(c => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </div>

      {menu.error ? (
        <ErrorBlock error={menu.error} />
      ) : menu.isLoading || cats.isLoading ? (
        <LoadingBlock />
      ) : !cats.data?.length ? (
        <EmptyState title="Create a category first.">
          Menu items belong to a category, e.g. Soups or Drinks.
        </EmptyState>
      ) : !items.length ? (
        <EmptyState
          title={
            search || filterCat !== "all"
              ? "No dishes match."
              : "No menu items yet."
          }
        />
      ) : (
        <div className="space-y-2">
          {items.map(i => (
            <div
              key={i.id}
              className="flex items-center gap-4 rounded-xl border border-amber-900/30 bg-[#231a14] p-3 transition-colors hover:border-amber-700/40"
            >
              <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-[#2a1f18]">
                {i.image_url ? (
                  <img
                    src={menuImage(i.image_url) ?? undefined}
                    alt=""
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <UtensilsCrossed className="h-5 w-5 text-amber-700/60" />
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={
                      i.is_available
                        ? "font-medium text-white"
                        : "font-medium text-amber-100/40 line-through"
                    }
                  >
                    {i.name}
                  </span>
                  {!i.is_available && <Badge tone="neutral">Hidden</Badge>}
                  {i.is_best_seller && <Badge tone="amber">Best seller</Badge>}
                  {i.is_popular && <Badge tone="amber">Popular</Badge>}
                  {i.is_spicy && <Badge tone="red">Spicy</Badge>}
                  {i.is_preorder && <Badge tone="blue">Pre-order</Badge>}
                  {i.dietary && <Badge tone="green">{i.dietary}</Badge>}
                </div>
                <div className="truncate text-xs text-amber-100/40">
                  {catName.get(i.category_id)}{" "}
                  {i.description && `· ${i.description}`}
                </div>
              </div>
              <div className="text-right font-semibold text-amber-400">
                {formatPrice(i.price)}
              </div>
              <div className="flex shrink-0 gap-1">
                <IconBtn
                  title={
                    i.is_available ? "Hide from website" : "Show on website"
                  }
                  onClick={() => toggleAvailable.mutate(i)}
                >
                  {i.is_available ? (
                    <Eye className="h-4 w-4" />
                  ) : (
                    <EyeOff className="h-4 w-4" />
                  )}
                </IconBtn>
                <IconBtn
                  title="Edit"
                  onClick={() =>
                    setDraft({ ...i, price: Number(i.price).toFixed(2) })
                  }
                >
                  <Pencil className="h-4 w-4" />
                </IconBtn>
                <IconBtn title="Delete" danger onClick={() => void onDelete(i)}>
                  <Trash2 className="h-4 w-4" />
                </IconBtn>
              </div>
            </div>
          ))}
        </div>
      )}

      {draft && (
        <ItemForm
          draft={draft}
          setDraft={setDraft}
          categories={cats.data ?? []}
          saving={save.isPending}
          onSubmit={() => save.mutate(draft)}
        />
      )}
    </>
  );
}

function IconBtn({
  children,
  title,
  onClick,
  danger,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={`rounded-lg p-2 transition-colors ${danger ? "text-red-400/80 hover:bg-red-900/20 hover:text-red-300" : "text-amber-100/60 hover:bg-amber-900/30 hover:text-amber-300"}`}
    >
      {children}
    </button>
  );
}

function ItemForm({
  draft,
  setDraft,
  categories,
  saving,
  onSubmit,
}: {
  draft: Draft;
  setDraft: (d: Draft | null) => void;
  categories: { id: number; name: string }[];
  saving: boolean;
  onSubmit: () => void;
}) {
  const [uploading, setUploading] = useState(false);
  const set = <K extends keyof Draft>(k: K, v: Draft[K]) =>
    setDraft({ ...draft, [k]: v });

  const upload = async (file: File) => {
    if (file.size > 5 * 1024 * 1024)
      return toast.error("Images must be under 5 MB.");
    setUploading(true);
    try {
      const ext = file.name.split(".").pop()?.toLowerCase() || "jpg";
      const path = `items/${crypto.randomUUID()}.${ext}`;
      const { error } = await supabase.storage
        .from(MENU_IMAGES_BUCKET)
        .upload(path, file, {
          cacheControl: "31536000",
          contentType: file.type,
        });
      if (error) throw error;
      const { data } = supabase.storage
        .from(MENU_IMAGES_BUCKET)
        .getPublicUrl(path);
      set("image_url", data.publicUrl);
    } catch (e) {
      toast.error(errorMessage(e));
    } finally {
      setUploading(false);
    }
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    onSubmit();
  };

  return (
    <Modal
      open
      wide
      onClose={() => setDraft(null)}
      title={draft.id ? "Edit menu item" : "New menu item"}
      footer={
        <>
          <Button variant="ghost" onClick={() => setDraft(null)}>
            Cancel
          </Button>
          <Button
            type="submit"
            form="menu-item-form"
            loading={saving}
            disabled={uploading}
          >
            Save
          </Button>
        </>
      }
    >
      <form
        id="menu-item-form"
        onSubmit={submit}
        className="grid gap-4 sm:grid-cols-2"
      >
        <Field label="Name" className="sm:col-span-2">
          <Input
            required
            maxLength={120}
            value={draft.name}
            onChange={e => set("name", e.target.value)}
          />
        </Field>
        <Field label="Price (£)">
          <Input
            required
            inputMode="decimal"
            placeholder="12.50"
            value={draft.price}
            onChange={e => set("price", e.target.value)}
          />
        </Field>
        <Field label="Category">
          <Select
            value={draft.category_id}
            onChange={e => set("category_id", Number(e.target.value))}
          >
            {categories.map(c => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea
            rows={3}
            maxLength={1000}
            value={draft.description}
            onChange={e => set("description", e.target.value)}
          />
        </Field>
        <Field label="Dietary label" hint="Optional, e.g. Vegan, Gluten free">
          <Input
            maxLength={60}
            value={draft.dietary ?? ""}
            onChange={e => set("dietary", e.target.value)}
          />
        </Field>
        <Field label="Sort order" hint="Lower numbers show first">
          <Input
            type="number"
            value={draft.sort_order}
            onChange={e => set("sort_order", Number(e.target.value))}
          />
        </Field>

        <div className="sm:col-span-2">
          <span className="mb-1.5 block text-xs font-medium uppercase tracking-wide text-amber-100/60">
            Photo
          </span>
          <div className="flex items-center gap-4">
            <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-lg bg-[#2a1f18]">
              {draft.image_url ? (
                <img
                  src={menuImage(draft.image_url) ?? undefined}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <ImagePlus className="h-6 w-6 text-amber-700/60" />
              )}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex h-8 cursor-pointer items-center rounded-lg border border-amber-900/40 bg-[#2a1f18] px-3 text-xs text-amber-100 hover:border-amber-500/50">
                {uploading
                  ? "Uploading…"
                  : draft.image_url
                    ? "Replace photo"
                    : "Upload photo"}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/avif"
                  className="hidden"
                  disabled={uploading}
                  onChange={e =>
                    e.target.files?.[0] && void upload(e.target.files[0])
                  }
                />
              </label>
              {draft.image_url && (
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  onClick={() => set("image_url", null)}
                >
                  Remove
                </Button>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-x-6 gap-y-3 sm:col-span-2">
          <Checkbox
            label="Show on website"
            checked={draft.is_available}
            onChange={v => set("is_available", v)}
          />
          <Checkbox
            label="Best seller"
            checked={draft.is_best_seller}
            onChange={v => set("is_best_seller", v)}
          />
          <Checkbox
            label="Popular"
            checked={draft.is_popular}
            onChange={v => set("is_popular", v)}
          />
          <Checkbox
            label="Spicy"
            checked={draft.is_spicy}
            onChange={v => set("is_spicy", v)}
          />
          <Checkbox
            label="Pre-order only"
            checked={draft.is_preorder}
            onChange={v => set("is_preorder", v)}
          />
        </div>
      </form>
    </Modal>
  );
}
