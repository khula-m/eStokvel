import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { groupApi, memberApi } from '../api';
import { ArrowLeft, Users, Coins, Calendar, Trash2, AlertCircle } from 'lucide-react';

interface GroupDetail {
  id: string;
  name: string;
  code: string;
  description?: string;
  contributionAmount: number;
  contributionFrequency: string;
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

  const handleRemoveMember = async (memberId: string, name: string) => {
    if (!confirm(`Remove ${name} from this group?`)) return;
    setRemovingMember(memberId);
    try {
      await memberApi.remove(memberId);
      setMembers(members.filter(m => m.id !== memberId));
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to remove member');
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
                        onClick={() => handleRemoveMember(m.id, m.user?.fullName || 'this member')}
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
    </div>
  );
}
