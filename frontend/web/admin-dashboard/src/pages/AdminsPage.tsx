import { useState, useEffect } from 'react';
import { adminApi } from '../api';
import { Users, Plus, Trash2, AlertCircle, Phone, X, AlertTriangle } from 'lucide-react';

interface Admin {
  id: string;
  fullName: string;
  phoneNumber: string;
  email?: string;
  role: string;
  createdAt: string;
  isVerified: boolean;
  _count?: { members: number };
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showCreate, setShowCreate] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [form, setForm] = useState({ phoneNumber: '', fullName: '' });
  const [createError, setCreateError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [deleteError, setDeleteError] = useState('');

  const fetchAdmins = async () => {
    setLoading(true);
    try {
      const res = await adminApi.list();
      const body = res.data;
      const list = body.data?.admins || body.data || body.admins || [];
      setAdmins(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load admins');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAdmins(); }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreating(true);
    setCreateError('');
    try {
      const res = await adminApi.create(form);
      const body = res.data;
      if (body.success) {
        setShowCreate(false);
        setForm({ phoneNumber: '', fullName: '' });
        const pin = body.data?.tempPin;
        const msg = body.message || 'Admin created successfully';
        setSuccessMsg(pin ? `${msg}` : msg);
        fetchAdmins();
      } else {
        setCreateError(body.message || 'Failed to create admin');
      }
    } catch (err: any) {
      setCreateError(err.response?.data?.message || 'Failed to create admin');
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(deleteConfirm.id);
    setDeleteError('');
    try {
      await adminApi.delete(deleteConfirm.id);
      setAdmins(admins.filter(a => a.id !== deleteConfirm.id));
      setSuccessMsg(`Admin "${deleteConfirm.name}" deleted successfully`);
      setDeleteConfirm(null);
    } catch (err: any) {
      setDeleteError(err.response?.data?.message || 'Failed to delete admin');
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0A2463]" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Admin Users</h1>
          <p className="text-sm text-gray-500 mt-1">{admins.length} admin accounts</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[#0A2463] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A8A] transition-colors shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Create Admin
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {successMsg && (
        <div className="mb-4 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm">
          <div className="flex items-center justify-between">
            <span>{successMsg}</span>
            <button onClick={() => setSuccessMsg('')} className="text-green-600 hover:text-green-800 ml-2">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Create Admin Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between px-6 py-4 border-b">
              <h2 className="font-semibold text-gray-900">Create Admin Account</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-400 hover:text-gray-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreate} className="p-6 space-y-4">
              {createError && (
                <div className="p-3 bg-red-50 text-red-700 rounded-lg text-sm">{createError}</div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                <input
                  type="text"
                  value={form.fullName}
                  onChange={(e) => setForm({ ...form, fullName: e.target.value })}
                  placeholder="John Doe"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0A2463] focus:border-transparent outline-none"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Phone Number</label>
                <input
                  type="tel"
                  value={form.phoneNumber}
                  onChange={(e) => setForm({ ...form, phoneNumber: e.target.value })}
                  placeholder="0831234567"
                  required
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0A2463] focus:border-transparent outline-none"
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreate(false)}
                  className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creating}
                  className="flex-1 py-2.5 bg-[#0A2463] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A8A] disabled:opacity-60 transition-colors"
                >
                  {creating ? 'Creating...' : 'Create Admin'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Admins table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {admins.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400">
            <Users className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No admin accounts found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Phone</th>
                  <th className="px-6 py-3 text-left">Role</th>
                  <th className="px-6 py-3 text-left">Groups</th>
                  <th className="px-6 py-3 text-left">Created</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {admins.map((admin) => (
                  <tr key={admin.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <div>
                        <p className="font-medium text-gray-900">{admin.fullName}</p>
                        {admin.email && <p className="text-xs text-gray-400">{admin.email}</p>}
                      </div>
                    </td>
                    <td className="px-6 py-3 text-gray-500 flex items-center gap-1.5">
                      <Phone className="w-3.5 h-3.5" />
                      {admin.phoneNumber}
                    </td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        admin.role === 'SUPERADMIN'
                          ? 'bg-amber-50 text-amber-700'
                          : 'bg-blue-50 text-blue-700'
                      }`}>
                        {admin.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {admin._count?.members ?? '—'}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(admin.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      {admin.role !== 'SUPERADMIN' && (
                        <button
                          onClick={() => setDeleteConfirm({ id: admin.id, name: admin.fullName })}
                          disabled={deleting === admin.id}
                          className="text-red-500 hover:text-red-700 disabled:opacity-50 p-1"
                          title="Delete admin"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              <h3 className="font-semibold text-gray-900">Delete Admin</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.</p>
            {deleteError && (
              <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">{deleteError}</div>
            )}
            <div className="flex gap-3">
              <button onClick={() => { setDeleteConfirm(null); setDeleteError(''); }} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={!!deleting} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition-colors">{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
