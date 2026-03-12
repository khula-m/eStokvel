import { useState, useEffect } from 'react';
import { memberApi, overrideApi } from '../api';
import { UserCheck, Phone, AlertCircle, ChevronLeft, ChevronRight, Building2, Search, MoreVertical, KeyRound, Unlock, X, AlertTriangle, ShieldCheck, ShieldAlert, Clock } from 'lucide-react';
import CopyButton from '../components/CopyButton';

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
  verificationStatus?: string;
}

export default function MembersPage() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const limit = 50;

  // Inline action state
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [resetPinTarget, setResetPinTarget] = useState<{ id: string; name: string } | null>(null);
  const [unlockTarget, setUnlockTarget] = useState<{ id: string; name: string } | null>(null);
  const [newPin, setNewPin] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

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

  const handleResetPin = async () => {
    if (!resetPinTarget || !newPin) return;
    setActionLoading(true);
    setActionError('');
    try {
      await overrideApi.resetAdminPin(resetPinTarget.id, { newPin });
      setActionSuccess(`PIN reset for ${resetPinTarget.name}`);
      setResetPinTarget(null);
      setNewPin('');
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to reset PIN');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnlock = async () => {
    if (!unlockTarget) return;
    setActionLoading(true);
    setActionError('');
    try {
      await overrideApi.unlockAccount(unlockTarget.id);
      setActionSuccess(`Account unlocked for ${unlockTarget.name}`);
      setUnlockTarget(null);
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to unlock account');
    } finally {
      setActionLoading(false);
    }
  };

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
                  <th className="px-6 py-3 text-left">Verified</th>
                  <th className="px-6 py-3 text-left">Joined</th>
                  <th className="px-6 py-3 text-left">Last Login</th>
                  <th className="px-6 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {filtered.map((member) => (
                  <tr key={member.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{member.fullName || 'Unknown'}</p>
                      <CopyButton text={member.id} label="Copy User ID" />
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
                    <td className="px-6 py-3">
                      {(() => {
                        const vs = member.verificationStatus;
                        if (vs === 'VERIFIED') return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-50 text-green-700">
                            <ShieldCheck className="w-3 h-3" /> Verified
                          </span>
                        );
                        if (vs === 'PENDING_VERIFY') return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                            <Clock className="w-3 h-3" /> Pending
                          </span>
                        );
                        if (vs === 'FAILED') return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-50 text-red-700">
                            <ShieldAlert className="w-3 h-3" /> Failed
                          </span>
                        );
                        return (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-gray-50 text-gray-500">
                            Unverified
                          </span>
                        );
                      })()}
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
                    <td className="px-6 py-3 text-right relative">
                      <button
                        onClick={() => setActionMenu(actionMenu === member.id ? null : member.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {actionMenu === member.id && (
                        <div className="absolute right-6 top-10 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44">
                          <button
                            onClick={() => { setResetPinTarget({ id: member.id, name: member.fullName }); setActionMenu(null); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <KeyRound className="w-4 h-4" /> Reset PIN
                          </button>
                          <button
                            onClick={() => { setUnlockTarget({ id: member.id, name: member.fullName }); setActionMenu(null); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Unlock className="w-4 h-4" /> Unlock Account
                          </button>
                        </div>
                      )}
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

      {/* Feedback banners */}
      {actionSuccess && (
        <div className="fixed bottom-4 right-4 z-50 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm shadow-lg flex items-center gap-3">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess('')} className="text-green-600 hover:text-green-800"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Reset PIN Modal */}
      {resetPinTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 p-2 rounded-full"><KeyRound className="w-5 h-5 text-amber-600" /></div>
              <h3 className="font-semibold text-gray-900">Reset PIN</h3>
            </div>
            <p className="text-sm text-gray-600 mb-4">Set new PIN for <strong>{resetPinTarget.name}</strong></p>
            {actionError && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded-lg text-sm">{actionError}</div>}
            <input
              type="text"
              maxLength={6}
              value={newPin}
              onChange={e => setNewPin(e.target.value.replace(/\D/g, ''))}
              placeholder="New 4-6 digit PIN"
              className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm mb-4 focus:ring-2 focus:ring-[#0A2463] focus:border-transparent outline-none"
            />
            <div className="flex gap-3">
              <button onClick={() => { setResetPinTarget(null); setNewPin(''); setActionError(''); }} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleResetPin} disabled={actionLoading || newPin.length < 4} className="flex-1 py-2.5 bg-[#0A2463] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A8A] disabled:opacity-60 transition-colors">{actionLoading ? 'Resetting...' : 'Reset PIN'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Unlock Account Modal */}
      {unlockTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-full"><Unlock className="w-5 h-5 text-blue-600" /></div>
              <h3 className="font-semibold text-gray-900">Unlock Account</h3>
            </div>
            <p className="text-sm text-gray-600 mb-6">Unlock the account for <strong>{unlockTarget.name}</strong>?</p>
            {actionError && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded-lg text-sm">{actionError}</div>}
            <div className="flex gap-3">
              <button onClick={() => { setUnlockTarget(null); setActionError(''); }} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleUnlock} disabled={actionLoading} className="flex-1 py-2.5 bg-[#0A2463] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A8A] disabled:opacity-60 transition-colors">{actionLoading ? 'Unlocking...' : 'Unlock'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
