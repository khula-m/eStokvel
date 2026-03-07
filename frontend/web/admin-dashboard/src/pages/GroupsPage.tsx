import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { groupApi } from '../api';
import { Building2, Users, Coins, ChevronRight, Search, AlertCircle, X, AlertTriangle } from 'lucide-react';

interface Group {
  id: string;
  name: string;
  code: string;
  contributionAmount: number;
  contributionFrequency: string;
  payoutModel?: 'ROTATING' | 'END_OF_TERM';
  isActive: boolean;
  createdAt: string;
  _count?: { members: number; transactions: number };
  members?: any[];
}

export default function GroupsPage() {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [deleting, setDeleting] = useState<string | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchGroups = async () => {
    setLoading(true);
    try {
      const res = await groupApi.list();
      const body = res.data;
      const list = body.data?.groups || body.data || body.groups || [];
      setGroups(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load groups');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchGroups(); }, []);

  const handleDelete = async () => {
    if (!deleteConfirm) return;
    setDeleting(deleteConfirm.id);
    setActionError('');
    try {
      await groupApi.delete(deleteConfirm.id);
      setGroups(groups.filter(g => g.id !== deleteConfirm.id));
      setActionSuccess(`Group "${deleteConfirm.name}" deleted successfully`);
      setDeleteConfirm(null);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to delete group');
      setDeleteConfirm(null);
    } finally {
      setDeleting(null);
    }
  };

  const filtered = groups.filter(g =>
    g.name.toLowerCase().includes(search.toLowerCase()) ||
    g.code.toLowerCase().includes(search.toLowerCase())
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Groups</h1>
          <p className="text-sm text-gray-500 mt-1">{groups.length} stokvel groups registered</p>
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search groups..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0A2463] focus:border-transparent outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {actionError && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center justify-between">
          <div className="flex items-center gap-2"><AlertCircle className="w-4 h-4" /> {actionError}</div>
          <button onClick={() => setActionError('')} className="text-red-600 hover:text-red-800"><X className="w-4 h-4" /></button>
        </div>
      )}

      {actionSuccess && (
        <div className="mb-4 p-3 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm flex items-center justify-between">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess('')} className="text-green-600 hover:text-green-800"><X className="w-4 h-4" /></button>
        </div>
      )}

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-gray-400">
          <Building2 className="w-12 h-12 mx-auto mb-3 opacity-50" />
          <p>No groups found</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map((group) => (
            <div key={group.id} className="bg-white rounded-xl border border-gray-100 shadow-sm hover:shadow-md transition-shadow">
              <div className="p-5">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h3 className="font-semibold text-gray-900">{group.name}</h3>
                    <p className="text-xs text-gray-400 mt-0.5 font-mono">Code: {group.code}</p>
                  </div>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    group.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    {group.isActive ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-500 mb-3">
                  <span className="flex items-center gap-1">
                    <Coins className="w-3.5 h-3.5" />
                    R{Number(group.contributionAmount).toFixed(0)} / {group.contributionFrequency?.toLowerCase()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Users className="w-3.5 h-3.5" />
                    {group._count?.members || group.members?.length || 0} members
                  </span>
                </div>
                <div className="mb-4">
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                    group.payoutModel === 'END_OF_TERM' ? 'bg-amber-50 text-amber-700' : 'bg-blue-50 text-blue-700'
                  }`}>
                    {group.payoutModel === 'END_OF_TERM' ? 'Savings (End-of-Term)' : 'Rotating'}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <Link
                    to={`/groups/${group.id}`}
                    className="flex-1 flex items-center justify-center gap-1 px-3 py-2 bg-[#0A2463] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A8A] transition-colors"
                  >
                    View details
                    <ChevronRight className="w-3.5 h-3.5" />
                  </Link>
                  <button
                    onClick={() => setDeleteConfirm({ id: group.id, name: group.name })}
                    disabled={deleting === group.id}
                    className="px-3 py-2 text-sm text-red-600 border border-red-200 rounded-lg hover:bg-red-50 disabled:opacity-50 transition-colors"
                  >
                    {deleting === group.id ? '...' : 'Delete'}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              <h3 className="font-semibold text-gray-900">Delete Group</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to delete <strong>{deleteConfirm.name}</strong>? This action cannot be undone.</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleDelete} disabled={!!deleting} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition-colors">{deleting ? 'Deleting...' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
