import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { groupApi, memberApi } from '../api';
import { ArrowLeft, Users, Coins, Calendar, Trash2, AlertCircle, X, AlertTriangle } from 'lucide-react';

interface GroupDetail {
  id: string;
  name: string;
  code: string;
  description?: string;
  contributionAmount: number;
  contributionFrequency: string;
  payoutModel?: 'ROTATING' | 'END_OF_TERM';
  durationMonths: number;
  isActive: boolean;
  startDate: string;
  endDate?: string;
  createdAt: string;
  bankName?: string;
  accountNumber?: string;
  accountHolder?: string;
  members?: Member[];
}

interface Member {
  id: string;
  role: string;
  joinedAt: string;
  user: {
    id: string;
    fullName: string;
    phoneNumber: string;
  };
}

interface GroupStats {
  totalContributions: number;
  totalPayouts: number;
  balance: number;
  memberCount: number;
  transactionCount: number;
}

export default function GroupDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [group, setGroup] = useState<GroupDetail | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [stats, setStats] = useState<GroupStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [removingMember, setRemovingMember] = useState<string | null>(null);
  const [removeConfirm, setRemoveConfirm] = useState<{ id: string; name: string } | null>(null);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  useEffect(() => {
    if (!id) return;
    const fetchAll = async () => {
      setLoading(true);
      try {
        const [groupRes, membersRes, statsRes] = await Promise.all([
          groupApi.get(id),
          groupApi.members(id).catch(() => ({ data: { data: [] } })),
          groupApi.stats(id).catch(() => ({ data: { data: null } })),
        ]);
        setGroup(groupRes.data.data || groupRes.data.group);
        setMembers(membersRes.data.data || membersRes.data.members || []);
        setStats(statsRes.data.data || statsRes.data.stats || null);
      } catch (err: any) {
        setError(err.response?.data?.message || 'Failed to load group');
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, [id]);

  const handleRemoveMember = async () => {
    if (!removeConfirm) return;
    setRemovingMember(removeConfirm.id);
    setActionError('');
    try {
      await memberApi.remove(removeConfirm.id);
      setMembers(members.filter(m => m.id !== removeConfirm.id));
      setActionSuccess(`"${removeConfirm.name}" removed from group`);
      setRemoveConfirm(null);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to remove member');
      setRemoveConfirm(null);
    } finally {
      setRemovingMember(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0A2463]" />
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="flex flex-col items-center py-20">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <p className="text-gray-600">{error || 'Group not found'}</p>
        <Link to="/groups" className="mt-4 text-sm text-[#0A2463] hover:underline">
          ← Back to Groups
        </Link>
      </div>
    );
  }

  return (
    <div>
      <Link to="/groups" className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-[#0A2463] mb-4">
        <ArrowLeft className="w-4 h-4" /> Back to Groups
      </Link>

      {/* Group header */}
      <div className="bg-white rounded-xl border border-gray-100 p-6 shadow-sm mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{group.name}</h1>
            <p className="text-sm text-gray-400 font-mono mt-1">Code: {group.code}</p>
            {group.description && <p className="text-sm text-gray-500 mt-2">{group.description}</p>}
          </div>
          <span className={`self-start px-3 py-1 rounded-full text-sm font-medium ${
            group.isActive ? 'bg-emerald-50 text-emerald-700' : 'bg-gray-100 text-gray-500'
          }`}>
            {group.isActive ? 'Active' : 'Inactive'}
          </span>
        </div>

        {/* Quick stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-6 border-t border-gray-100">
          <div>
            <p className="text-xs text-gray-400">Contribution</p>
            <p className="text-lg font-bold text-gray-900">R{Number(group.contributionAmount).toFixed(0)}</p>
            <p className="text-xs text-gray-500">{group.contributionFrequency}</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Duration</p>
            <p className="text-lg font-bold text-gray-900">{group.durationMonths}mo</p>
          </div>
          <div>
            <p className="text-xs text-gray-400">Payout Model</p>
            <p className={`text-sm font-semibold mt-1 ${group.payoutModel === 'END_OF_TERM' ? 'text-amber-600' : 'text-blue-600'}`}>
              {group.payoutModel === 'END_OF_TERM' ? 'End-of-Term (Savings)' : 'Rotating'}
            </p>
          </div>
          {stats && (
            <>
              <div>
                <p className="text-xs text-gray-400">Total Contributions</p>
                <p className="text-lg font-bold text-emerald-600">R{stats.totalContributions?.toLocaleString()}</p>
              </div>
              <div>
                <p className="text-xs text-gray-400">Total Payouts</p>
                <p className="text-lg font-bold text-amber-600">R{stats.totalPayouts?.toLocaleString()}</p>
              </div>
            </>
          )}
        </div>

        {group.bankName && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <p className="text-xs text-gray-400 mb-1">Bank Details</p>
            <p className="text-sm text-gray-700">{group.bankName} • {group.accountNumber} • {group.accountHolder}</p>
          </div>
        )}
      </div>

      {/* Members table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Users className="w-5 h-5 text-gray-400" />
            Members ({members.length})
          </h2>
        </div>

        {members.length === 0 ? (
          <div className="px-6 py-12 text-center text-gray-400">
            <Users className="w-10 h-10 mx-auto mb-2 opacity-50" />
            No members in this group
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Phone</th>
                  <th className="px-6 py-3 text-left">Role</th>
                  <th className="px-6 py-3 text-left">Joined</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {members.map((m) => (
                  <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3 font-medium text-gray-900">{m.user?.fullName || '—'}</td>
                    <td className="px-6 py-3 text-gray-500">{m.user?.phoneNumber || '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                        m.role === 'ADMIN' ? 'bg-blue-50 text-blue-700' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {m.role}
                      </span>
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(m.joinedAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-right">
                      <button
                        onClick={() => setRemoveConfirm({ id: m.id, name: m.user?.fullName || 'this member' })}
                        disabled={removingMember === m.id}
                        className="text-red-500 hover:text-red-700 disabled:opacity-50 p-1"
                        title="Remove member"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Feedback banners */}
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

      {/* Remove Member Confirmation Modal */}
      {removeConfirm && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-red-100 p-2 rounded-full"><AlertTriangle className="w-5 h-5 text-red-600" /></div>
              <h3 className="font-semibold text-gray-900">Remove Member</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">Are you sure you want to remove <strong>{removeConfirm.name}</strong> from this group?</p>
            <div className="flex gap-3">
              <button onClick={() => setRemoveConfirm(null)} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleRemoveMember} disabled={!!removingMember} className="flex-1 py-2.5 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-60 transition-colors">{removingMember ? 'Removing...' : 'Remove'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
