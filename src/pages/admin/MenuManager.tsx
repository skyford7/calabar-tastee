import { useState } from "react";
import { AdminLayout } from "./AdminLayout";
import { trpc } from "@/providers/trpc";
import { Plus, Pencil, Trash2, X, Check } from "lucide-react";

const categories = ["Drinks", "Swallow", "Soups", "Main Course", "Sides", "Grills & Pepper Soups"];

export function MenuManager() {
  const menuQuery = trpc.menu.list.useQuery();
  const createMutation = trpc.menu.create.useMutation({
    onSuccess: () => menuQuery.refetch(),
  });
  const updateMutation = trpc.menu.update.useMutation({
    onSuccess: () => menuQuery.refetch(),
  });
  const deleteMutation = trpc.menu.delete.useMutation({
    onSuccess: () => menuQuery.refetch(),
  });

  const [editing, setEditing] = useState<number | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({
    name: "", description: "", price: "", image_path: "/placeholder.jpg",
    category: "Soups", is_popular: false, is_best_seller: false,
    is_spicy: false, is_preorder: false, dietary: "",
  });
  const [editForm, setEditForm] = useState<Record<string, any>>({});

  const handleCreate = () => {
    createMutation.mutate(form as any);
    setShowAdd(false);
    setForm({ name: "", description: "", price: "", image_path: "/placeholder.jpg", category: "Soups", is_popular: false, is_best_seller: false, is_spicy: false, is_preorder: false, dietary: "" });
  };

  const handleUpdate = (id: number) => {
    updateMutation.mutate({ id, ...editForm });
    setEditing(null);
  };

  const items = menuQuery.data || [];

  return (
    <AdminLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-white">Menu Manager</h1>
        <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors">
          <Plus className="w-4 h-4" /> Add Item
        </button>
      </div>

      {showAdd && (
        <div className="bg-[#231a14] border border-amber-900/30 rounded-xl p-5 mb-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-white font-semibold">Add New Item</h3>
            <button onClick={() => setShowAdd(false)} className="text-amber-100/50 hover:text-white"><X className="w-5 h-5" /></button>
          </div>
          <div className="grid sm:grid-cols-2 gap-4 mb-4">
            <input placeholder="Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} className="bg-[#1a1410] border border-amber-900/30 rounded-lg px-4 py-2 text-white text-sm" />
            <input placeholder="Price" value={form.price} onChange={e => setForm({ ...form, price: e.target.value })} className="bg-[#1a1410] border border-amber-900/30 rounded-lg px-4 py-2 text-white text-sm" />
            <select value={form.category} onChange={e => setForm({ ...form, category: e.target.value })} className="bg-[#1a1410] border border-amber-900/30 rounded-lg px-4 py-2 text-white text-sm">
              {categories.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
            <input placeholder="Image Path" value={form.image_path} onChange={e => setForm({ ...form, image_path: e.target.value })} className="bg-[#1a1410] border border-amber-900/30 rounded-lg px-4 py-2 text-white text-sm" />
            <textarea placeholder="Description" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} className="bg-[#1a1410] border border-amber-900/30 rounded-lg px-4 py-2 text-white text-sm sm:col-span-2" rows={2} />
          </div>
          <div className="flex flex-wrap gap-3 mb-4">
            {["is_popular", "is_best_seller", "is_spicy", "is_preorder"].map((k) => (
              <label key={k} className="flex items-center gap-2 text-sm text-amber-100/70 cursor-pointer">
                <input type="checkbox" checked={(form as any)[k]} onChange={e => setForm({ ...form, [k]: e.target.checked })} className="rounded accent-amber-500" />
                {k.replace("is_", "").replace("_", " ")}
              </label>
            ))}
          </div>
          <button onClick={handleCreate} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-medium">Save Item</button>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-amber-100/50 border-b border-amber-900/30 text-left">
              <th className="pb-3 pr-4">Name</th>
              <th className="pb-3 pr-4">Category</th>
              <th className="pb-3 pr-4">Price</th>
              <th className="pb-3 pr-4">Tags</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {items.map((item) => (
              <tr key={item.id} className="border-b border-amber-900/20 text-amber-100/70">
                {editing === item.id ? (
                  <>
                    <td className="py-3 pr-4">
                      <input defaultValue={item.name} onChange={e => setEditForm({ ...editForm, name: e.target.value })} className="bg-[#1a1410] border border-amber-900/30 rounded px-2 py-1 text-white text-sm w-full" />
                    </td>
                    <td className="py-3 pr-4">
                      <select defaultValue={item.category} onChange={e => setEditForm({ ...editForm, category: e.target.value })} className="bg-[#1a1410] border border-amber-900/30 rounded px-2 py-1 text-white text-sm">
                        {categories.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    </td>
                    <td className="py-3 pr-4">
                      <input defaultValue={item.price} onChange={e => setEditForm({ ...editForm, price: e.target.value })} className="bg-[#1a1410] border border-amber-900/30 rounded px-2 py-1 text-white text-sm w-20" />
                    </td>
                    <td className="py-3 pr-4">-</td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => handleUpdate(item.id)} className="text-green-400 hover:text-green-300"><Check className="w-4 h-4" /></button>
                        <button onClick={() => setEditing(null)} className="text-red-400 hover:text-red-300"><X className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-3 pr-4 font-medium text-white">{item.name}</td>
                    <td className="py-3 pr-4">{item.category}</td>
                    <td className="py-3 pr-4">{item.price}</td>
                    <td className="py-3 pr-4">
                      <div className="flex flex-wrap gap-1">
                        {item.is_popular && <span className="px-2 py-0.5 bg-amber-600/20 text-amber-400 rounded text-xs">Popular</span>}
                        {item.is_best_seller && <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 rounded text-xs">Best</span>}
                        {item.is_spicy && <span className="px-2 py-0.5 bg-red-600/20 text-red-400 rounded text-xs">Spicy</span>}
                        {item.is_preorder && <span className="px-2 py-0.5 bg-blue-600/20 text-blue-400 rounded text-xs">Pre</span>}
                      </div>
                    </td>
                    <td className="py-3">
                      <div className="flex gap-2">
                        <button onClick={() => { setEditing(item.id); setEditForm({}); }} className="text-amber-400 hover:text-amber-300"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => deleteMutation.mutate({ id: item.id })} className="text-red-400 hover:text-red-300"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
