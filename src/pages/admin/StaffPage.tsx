import { useState } from "react";
import { trpc } from "@/providers/trpc";
import { useLocalAuth } from "@/hooks/useLocalAuth";
import { Plus, Pencil, Lock, LockOpen, Trash2, RotateCcw, UserX, UserCheck, Eye, EyeOff } from "lucide-react";

export default function StaffPage() {
  const { user: currentUser, isSuperAdmin } = useLocalAuth();
  const utils = trpc.useUtils();
  const { data: staffList, refetch } = trpc.staff.list.useQuery();
  const [showAdd, setShowAdd] = useState(false);
  const [showEdit, setShowEdit] = useState<number | null>(null);
  const [showResetPw, setShowResetPw] = useState<number | null>(null);
  const [message, setMessage] = useState("");

  const [form, setForm] = useState({
    firstName: "", surname: "", jobTitle: "", role: "staff" as "admin" | "staff",
    username: "", tempPassword: "",
    mustChangePassword: true, canChangePassword: true,
  });
  const [editForm, setEditForm] = useState({ firstName: "", surname: "", jobTitle: "", username: "" });
  const [resetPw, setResetPw] = useState("");

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createMutation = trpc.staff.create.useMutation({
    onSuccess: (data: any) => {
      if (data.success) { setMessage("Staff member created!"); setShowAdd(false); setForm({ firstName: "", surname: "", jobTitle: "", role: "staff", username: "", tempPassword: "", mustChangePassword: true, canChangePassword: true }); refetch(); }
      else setMessage(data.message || "Failed to create");
    },
  });
  const updateMutation = trpc.staff.update.useMutation({ onSuccess: () => { setShowEdit(null); refetch(); setMessage("Updated!"); } });
  const suspendMutation = trpc.staff.suspend.useMutation({ onSuccess: () => refetch() });
  const resetPwMutation = trpc.staff.resetPassword.useMutation({ onSuccess: () => { setShowResetPw(null); setResetPw(""); setMessage("Password reset!"); } });
  const deleteMutation = trpc.staff.delete.useMutation({ onSuccess: () => refetch() });
  const togglePwMutation = trpc.staff.togglePasswordChange.useMutation({ onSuccess: () => refetch() });

  const visibleStaff = staffList?.filter(s => {
    if (isSuperAdmin) return true;
    return s.role !== "super_admin";
  });

  function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (!form.firstName || !form.username || !form.tempPassword) return;
    createMutation.mutate(form);
  }

  return (
    <div className="space-y-6">
      {message && <div className="bg-green-600/20 border border-green-600/30 text-green-400 p-3 rounded-lg text-sm">{message} <button onClick={() => setMessage("")} className="ml-2 text-green-300">×</button></div>}

      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold text-white">Staff Management</h2>
        <button onClick={() => setShowAdd(!showAdd)} className="bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm flex items-center gap-2"><Plus className="w-4 h-4" /> Add Staff</button>
      </div>

      {showAdd && (
        <div className="bg-[#231a14] border border-amber-900/30 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4">Add New Staff</h3>
          <form onSubmit={handleCreate} className="grid sm:grid-cols-2 gap-4">
            <div><label className="block text-sm text-amber-100/60 mb-1">First Name *</label><input required value={form.firstName} onChange={e => setForm({ ...form, firstName: e.target.value })} className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-3 py-2 text-white text-sm" /></div>
            <div><label className="block text-sm text-amber-100/60 mb-1">Surname</label><input value={form.surname} onChange={e => setForm({ ...form, surname: e.target.value })} className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-3 py-2 text-white text-sm" /></div>
            <div><label className="block text-sm text-amber-100/60 mb-1">Job Title</label><input value={form.jobTitle} onChange={e => setForm({ ...form, jobTitle: e.target.value })} className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-3 py-2 text-white text-sm" /></div>
            <div><label className="block text-sm text-amber-100/60 mb-1">Role *</label>
              <select value={form.role} onChange={e => setForm({ ...form, role: e.target.value as "admin" | "staff" })} className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-3 py-2 text-white text-sm">
                <option value="staff">Staff</option>
                {isSuperAdmin && <option value="admin">Admin</option>}
              </select>
            </div>
            <div><label className="block text-sm text-amber-100/60 mb-1">Username *</label><input required value={form.username} onChange={e => setForm({ ...form, username: e.target.value })} className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-3 py-2 text-white text-sm" /></div>
            <div><label className="block text-sm text-amber-100/60 mb-1">Temporary Password *</label><input type="password" required value={form.tempPassword} onChange={e => setForm({ ...form, tempPassword: e.target.value })} className="w-full bg-[#1a1410] border border-amber-900/30 rounded-lg px-3 py-2 text-white text-sm" /></div>
            <div className="sm:col-span-2 flex gap-6">
              <label className="flex items-center gap-2 text-sm text-amber-100/60"><input type="checkbox" checked={form.mustChangePassword} onChange={e => setForm({ ...form, mustChangePassword: e.target.checked })} className="rounded" /> Force password change on first login</label>
              <label className="flex items-center gap-2 text-sm text-amber-100/60"><input type="checkbox" checked={form.canChangePassword} onChange={e => setForm({ ...form, canChangePassword: e.target.checked })} className="rounded" /> Allow password changes</label>
            </div>
            <div className="sm:col-span-2 flex gap-3">
              <button type="submit" disabled={createMutation.isPending} className="bg-amber-600 hover:bg-amber-700 text-white px-6 py-2 rounded-lg text-sm">{createMutation.isPending ? "Creating..." : "Create User"}</button>
              <button type="button" onClick={() => setShowAdd(false)} className="text-amber-100/60 hover:text-white px-4 py-2 text-sm">Cancel</button>
            </div>
          </form>
        </div>
      )}

      <div className="bg-[#231a14] border border-amber-900/30 rounded-xl overflow-hidden">
        <table className="w-full text-sm">
          <thead><tr className="border-b border-amber-900/30 text-amber-100/40 text-left"><th className="px-4 py-3">Name</th><th className="px-4 py-3">Username</th><th className="px-4 py-3">Role</th><th className="px-4 py-3">Status</th><th className="px-4 py-3 text-right">Actions</th></tr></thead>
          <tbody>
            {visibleStaff?.map(member => (
              <tr key={member.id} className="border-b border-amber-900/20 hover:bg-amber-900/5">
                <td className="px-4 py-3">
                  <div className="text-white font-medium">{member.firstName} {member.surname || ""}</div>
                  {member.jobTitle && <div className="text-amber-100/40 text-xs">{member.jobTitle}</div>}
                </td>
                <td className="px-4 py-3 text-amber-100/60">{member.username}</td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs font-medium ${member.role === 'super_admin' ? 'bg-purple-600/20 text-purple-400' : member.role === 'admin' ? 'bg-blue-600/20 text-blue-400' : 'bg-amber-600/20 text-amber-400'}`}>{member.role.replace('_', ' ')}</span></td>
                <td className="px-4 py-3"><span className={`px-2 py-1 rounded-full text-xs ${member.isSuspended ? 'bg-red-600/20 text-red-400' : 'bg-green-600/20 text-green-400'}`}>{member.isSuspended ? 'Suspended' : 'Active'}</span></td>
                <td className="px-4 py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    {showEdit === member.id ? (
                      <div className="bg-[#1a1410] border border-amber-900/30 rounded-lg p-3 absolute right-8 z-10 w-72">
                        <input value={editForm.firstName} onChange={e => setEditForm({ ...editForm, firstName: e.target.value })} placeholder="First Name" className="w-full bg-[#231a14] border border-amber-900/30 rounded px-3 py-2 text-white text-sm mb-2" />
                        <input value={editForm.surname} onChange={e => setEditForm({ ...editForm, surname: e.target.value })} placeholder="Surname" className="w-full bg-[#231a14] border border-amber-900/30 rounded px-3 py-2 text-white text-sm mb-2" />
                        <input value={editForm.jobTitle} onChange={e => setEditForm({ ...editForm, jobTitle: e.target.value })} placeholder="Job Title" className="w-full bg-[#231a14] border border-amber-900/30 rounded px-3 py-2 text-white text-sm mb-2" />
                        <div className="flex gap-2">
                          <button onClick={() => { updateMutation.mutate({ id: member.id, ...editForm }); }} className="bg-amber-600 text-white px-3 py-1 rounded text-xs">Save</button>
                          <button onClick={() => setShowEdit(null)} className="text-amber-100/60 px-3 py-1 text-xs">Cancel</button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => { setEditForm({ firstName: member.firstName || "", surname: member.surname || "", jobTitle: member.jobTitle || "", username: member.username }); setShowEdit(member.id); }} className="p-1.5 text-amber-100/40 hover:text-amber-400 rounded-lg hover:bg-amber-600/10" title="Edit"><Pencil className="w-4 h-4" /></button>
                        <button onClick={() => { setShowResetPw(showResetPw === member.id ? null : member.id); setResetPw(""); }} className="p-1.5 text-amber-100/40 hover:text-amber-400 rounded-lg hover:bg-amber-600/10" title="Reset Password"><RotateCcw className="w-4 h-4" /></button>
                        <button onClick={() => togglePwMutation.mutate({ id: member.id, canChange: !member.canChangePassword })} className="p-1.5 text-amber-100/40 hover:text-amber-400 rounded-lg hover:bg-amber-600/10" title={member.canChangePassword ? "Block password change" : "Allow password change"}>
                          {member.canChangePassword ? <LockOpen className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                        </button>
                        <button onClick={() => suspendMutation.mutate({ id: member.id, suspended: !member.isSuspended })} className={`p-1.5 rounded-lg ${member.isSuspended ? 'text-green-400 hover:bg-green-600/10' : 'text-red-400 hover:bg-red-600/10'}`} title={member.isSuspended ? "Reactivate" : "Suspend"}>
                          {member.isSuspended ? <UserCheck className="w-4 h-4" /> : <UserX className="w-4 h-4" />}
                        </button>
                        {isSuperAdmin && member.role !== "super_admin" && (
                          <button onClick={() => { if (confirm(`Delete ${member.username}?`)) deleteMutation.mutate({ id: member.id }); }} className="p-1.5 text-red-400/60 hover:text-red-400 rounded-lg hover:bg-red-600/10" title="Delete"><Trash2 className="w-4 h-4" /></button>
                        )}
                      </>
                    )}
                  </div>
                  {showResetPw === member.id && (
                    <div className="mt-2 flex gap-2">
                      <input type="password" value={resetPw} onChange={e => setResetPw(e.target.value)} placeholder="New password" className="flex-1 bg-[#1a1410] border border-amber-900/30 rounded px-3 py-1 text-white text-sm" />
                      <button onClick={() => { if (resetPw.length >= 6) resetPwMutation.mutate({ id: member.id, newPassword: resetPw }); }} className="bg-amber-600 text-white px-3 py-1 rounded text-xs">Reset</button>
                      <button onClick={() => setShowResetPw(null)} className="text-amber-100/60 px-2 text-xs">×</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
