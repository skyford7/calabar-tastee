import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { Plus, Pencil, Trash2, ImagePlus } from "lucide-react";

const categories = ["Drinks", "Swallow", "Soups", "Main Course", "Sides", "Grills & Pepper Soups"];

export default function MenuPage() {
  const utils = trpc.useUtils();
  const { data: menuItems, refetch } = trpc.menu.list.useQuery();
  const [showAdd, setShowAdd] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    name: "", description: "", price: "", category: "Main Course",
    isPopular: false, isSpicy: false, isPreorder: false, dietary: "",
  });
  const [editForm, setEditForm] = useState({ name: "", description: "", price: "", category: "", isPopular: false, isSpicy: false, isPreorder: false, dietary: "" });
  const [imageFile, setImageFile] = useState<File | null>(null);

  const createMutation = trpc.menu.create.useMutation({
    onSuccess: () => { setMessage("Menu item added!"); setShowAdd(false); setForm({ name: "", description: "", price: "", category: "Main Course", isPopular: false, isSpicy: false, isPreorder: false, dietary: "" }); setImageFile(null); refetch(); },
  });
  const updateMutation = trpc.menu.update.useMutation({ onSuccess: () => { setEditingId(null); setMessage("Updated!"); refetch(); } });
  const deleteMutation = trpc.menu.delete.useMutation({ onSuccess: () => { setMessage("Removed!"); refetch(); } });

  async function handleUpload(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      const data = await res.json();
      return data.success ? data.path : null;
    } catch { return null; }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    let imagePath = null;
    if (imageFile) imagePath = await handleUpload(imageFile);
    createMutation.mutate({ ...form, imagePath: imagePath || undefined });
  }

  async function handleUpdate(e: React.FormEvent) {
    e.preventDefault();
    if (!editingId) return;
    updateMutation.mutate({ id: editingId, ...editForm });
  }

  return (
    <div className="space-y-6">
      {message && <div className="bg-green-600/20 border border-green-600/30 text-green-400 p-3 rounded-lg text-sm">{message} <button onClick={() => setMessage("")} className="ml-2">×</button></div>}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Menu Management</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Add Item</button>
      </div>

      {showAdd && (
        <div className="bg-[#231a14] border border-amber-900/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Menu Item</h3>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
            <div><label className="block text-sm text-amber-100/60 mb-1">Name *</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-3 py-2 text-white text-sm" /></div>
            <div><label className="block text-sm text-amber-100/60 mb-1">Price *</label><input required value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} placeholder="£0.00" className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-3 py-2 text-white text-sm" /></div>
            <div><label className="block text-sm text-amber-100/60 mb-1">Category *</label>
              <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-3 py-2 text-white text-sm">
                {categories.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div><label className="block text-sm text-amber-100/60 mb-1">Dietary Info</label><input value={form.dietary} onChange={e => setForm({ ...form, dietary: e.target.value })} placeholder="e.g. Dairy-Free" className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-3 py-2 text-white text-sm" /></div>
            <div className="sm:col-span-2"><label className="block text-sm text-amber-100/60 mb-1">Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} rows={2} className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-3 py-2 text-white text-sm" /></div>
            <div className="sm:col-span-2">
              <label className="block text-sm text-amber-100/60 mb-1">Image</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2 bg-[#1a1410] border border-amber-900/30 rounded-lg px-4 py-2 text-sm text-amber-100/60 hover:border-amber-500 cursor-pointer">
                  <ImagePlus className="w-4 h-4" />
                  {imageFile ? imageFile.name : "Choose Image"}
                  <input type="file" accept="image/*" onChange={e => setImageFile(e.target.files?.[0] || null)} className="hidden" />
                </label>
              </div>
            </div>
            <div className="sm:col-span-2 flex gap-6">
              <label className="flex items-center gap-2 text-sm text-amber-100/60"><input type="checkbox" checked={form.isPopular} onChange={e => setForm({ ...form, isPopular: e.target.checked })} /> Popular</label>
              <label className="flex items-center gap-2 text-sm text-amber-100/60"><input type="checkbox" checked={form.isSpicy} onChange={e => setForm({ ...form, isSpicy: e.target.checked })} /> Spicy (adjustable)</label>
              <label className="flex items-center gap-2 text-sm text-amber-100/60"><input type="checkbox" checked={form.isPreorder} onChange={e => setForm({ ...form, isPreorder: e.target.checked })} /> Pre-order only</label>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={createMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg text-sm">{createMutation.isPending ? "Adding..." : "Add Item"}</button>
              <button type="button" onClick={() => setShowAdd(false)} className="text-amber-100/60 hover:text-white px-4 py-2 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="grid gap-4">
        {menuItems?.map(item => (
          <div key={item.id} className="bg-[#231a14] border border-amber-900/30 rounded-xl p-4 flex gap-4">
            <img src={item.imagePath || '/placeholder.jpg'} alt={item.name} className="w-20 h-20 rounded-lg object-cover flex-shrink-0" />
            <div className="flex-1 min-w-0">
              {editingId === item.id ? (
                <form onSubmit={handleUpdate} className="grid sm:grid-cols-2 gap-3">
                  <input value={editForm.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-[#1a1410] border border-amber-900/30 rounded px-3 py-1 text-white text-sm" />
                  <input value={editForm.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} className="bg-[#1a1410] border border-amber-900/30 rounded px-3 py-1 text-white text-sm" />
                  <select value={editForm.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className="bg-[#1a1410] border border-amber-900/30 rounded px-3 py-1 text-white text-sm">
                    {categories.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <input value={editForm.dietary} onChange={e => setEditForm({ ...editForm, dietary: e.target.value })} placeholder="Dietary" className="bg-[#1a1410] border border-amber-900/30 rounded px-3 py-1 text-white text-sm" />
                  <textarea value={editForm.description} onChange={e => setEditForm({ ...editForm, description: e.target.value })} rows={2} className="sm:col-span-2 bg-[#1a1410] border border-amber-900/30 rounded px-3 py-1 text-white text-sm" />
                  <div className="sm:col-span-2 flex gap-4">
                    <label className="flex items-center gap-1 text-xs text-amber-100/60"><input type="checkbox" checked={editForm.isPopular} onChange={e => setEditForm({ ...editForm, isPopular: e.target.checked })} /> Popular</label>
                    <label className="flex items-center gap-1 text-xs text-amber-100/60"><input type="checkbox" checked={editForm.isSpicy} onChange={e => setEditForm({ ...editForm, isSpicy: e.target.checked })} /> Spicy</label>
                    <label className="flex items-center gap-1 text-xs text-amber-100/60"><input type="checkbox" checked={editForm.isPreorder} onChange={e => setEditForm({ ...editForm, isPreorder: e.target.checked })} /> Pre-order</label>
                  </div>
                  <div className="sm:col-span-2 flex gap-2">
                    <button type="submit" className="bg-amber-600 text-white px-4 py-1 rounded text-xs">Save</button>
                    <button type="button" onClick={() => setEditingId(null)} className="text-amber-100/60 px-3 py-1 text-xs">Cancel</button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-white font-semibold">{item.name}</h3>
                      <p className="text-amber-500 font-bold text-sm">{item.price}</p>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => { setEditForm({ name: item.name, description: item.description || "", price: item.price, category: item.category, isPopular: item.isPopular, isSpicy: item.isSpicy, isPreorder: item.isPreorder, dietary: item.dietary || "" }); setEditingId(item.id); }} className="p-1.5 text-amber-100/40 hover:text-amber-400 rounded"><Pencil className="w-4 h-4" /></button>
                      <button onClick={() => { if (confirm('Remove this item?')) deleteMutation.mutate({ id: item.id }); }} className="p-1.5 text-red-400/60 hover:text-red-400 rounded"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </div>
                  <p className="text-amber-100/60 text-sm mt-1 line-clamp-2">{item.description}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-xs text-amber-100/40 bg-amber-900/20 px-2 py-0.5 rounded">{item.category}</span>
                    {item.isPopular && <span className="text-xs text-amber-400 bg-amber-600/10 px-2 py-0.5 rounded">Popular</span>}
                    {item.isSpicy && <span className="text-xs text-red-400 bg-red-600/10 px-2 py-0.5 rounded">Spicy</span>}
                    {item.isPreorder && <span className="text-xs text-blue-400 bg-blue-600/10 px-2 py-0.5 rounded">Pre-order</span>}
                    {item.dietary && <span className="text-xs text-green-400 bg-green-600/10 px-2 py-0.5 rounded">{item.dietary}</span>}
                  </div>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
