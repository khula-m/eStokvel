import { useState, useEffect } from 'react';
import { memberApi } from '../api';
import { UserCheck, Phone, AlertCircle, ChevronLeft, ChevronRight, Building2, Search } from 'lucide-react';

interface MemberGroup {
  id: string;
  name: string;
  isActive: boolean;
  memberId: string;
  paymentStatus: string;
  joinedAt: string;
}

interface Member {
  id: string;
  fullName: string;
  phoneNumber: string;
  role: string;
  createdAt: string;
  lastLogin: string | null;
  groups: MemberGroup[];
  paymentStatus: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const limit = 50;

  const fetchMembers = async (p: number) => {
    setLoading(true);
    try {
      const res = await memberApi.list({ page: p, limit });
      const body = res.data;
      const list = body.data?.members || [];
      setMembers(Array.isArray(list) ? list : []);
      setTotal(body.data?.total || 0);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load members');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchMembers(page); }, [page]);

  const filtered = search
    ? members.filter(m =>
        m.fullName?.toLowerCase().includes(search.toLowerCase()) ||
        m.phoneNumber?.includes(search) ||
        m.groups?.some(g => g.name.toLowerCase().includes(search.toLowerCase()))
      )
    : members;

  const totalPages = Math.ceil(total / limit);

  if (loading && members.length === 0) {
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
          <h1 className="text-2xl font-bold text-gray-900">Members</h1>
          <p className="text-sm text-gray-500 mt-1">{total} member accounts across all groups</p>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search name, phone, group..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0A2463] focus:border-transparent outline-none w-64"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      {/* Members table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400">
            <UserCheck className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>{search ? 'No members match your search' : 'No members found'}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                <tr>
                  <th className="px-6 py-3 text-left">Name</th>
                  <th className="px-6 py-3 text-left">Phone</th>
                  <th className="px-6 py-3 text-left">Groups</th>
                  <th className="px-6 py-3 text-left">Status</th>
                  <th className="px-6 py-3 text-left">Joined</th>
                  <th className="px-6 py-3 text-left">Last Login</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{member.fullName || 'Unknown'}</p>
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5" />
                        {member.phoneNumber}
                      </span>
                    </td>
                    <td className="px-6 py-3">
                      <div className="flex flex-wrap gap-1">
                        {member.groups?.length > 0 ? member.groups.map((g) => (
                          <span key={g.memberId} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs font-medium">
                            <Building2 className="w-3 h-3" />
                            {g.name}
                          </span>
                        )) : (
                          <span className="text-gray-400 text-xs">No groups</span>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-3">
                      {member.groups?.length > 0 ? (
                        <div className="flex flex-wrap gap-1">
                          {member.groups.map((g) => (
                            <span key={g.memberId} className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              g.paymentStatus === 'PAID' ? 'bg-green-50 text-green-700' :
                              g.paymentStatus === 'PENDING' ? 'bg-amber-50 text-amber-700' :
                              'bg-red-50 text-red-700'
                            }`}>
                              {g.paymentStatus}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {new Date(member.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-3 text-gray-500">
                      {member.lastLogin
                        ? new Date(member.lastLogin).toLocaleDateString()
                        : <span className="text-gray-400">Never</span>
                      }
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <p className="text-sm text-gray-500">
            Page {page} of {totalPages} ({total} total)
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft className="w-4 h-4" /> Prev
            </button>
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              className="flex items-center gap-1 px-3 py-1.5 bg-white border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              Next <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
