import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { groupApi, memberApi, overrideApi } from '../api';
import { ArrowLeft, Users, Coins, Calendar, Trash2, AlertCircle, X, AlertTriangle, DollarSign, UserCog, MoreVertical, KeyRound, Unlock } from 'lucide-react';
import CopyButton from '../components/CopyButton';

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

  // Inline action state
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [adjustForm, setAdjustForm] = useState({ memberId: '', amount: '', reason: '' });
  const [showTransferAdmin, setShowTransferAdmin] = useState(false);
  const [transferForm, setTransferForm] = useState({ fromMemberId: '', toMemberId: '', reason: '' });
  const [resetPinTarget, setResetPinTarget] = useState<{ id: string; name: string } | null>(null);
  const [unlockTarget, setUnlockTarget] = useState<{ id: string; name: string } | null>(null);
  const [newPin, setNewPin] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

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

  const handleCreateAdjustment = async () => {
    if (!id || !adjustForm.memberId || !adjustForm.amount || !adjustForm.reason) return;
    setActionLoading(true);
    setActionError('');
    try {
      await overrideApi.createAdjustment({
        groupId: id,
        memberId: adjustForm.memberId,
        amount: parseFloat(adjustForm.amount),
        reason: adjustForm.reason,
      });
      setActionSuccess('Adjustment created successfully');
      setShowAdjustment(false);
      setAdjustForm({ memberId: '', amount: '', reason: '' });
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to create adjustment');
    } finally {
      setActionLoading(false);
    }
  };

  const handleTransferAdmin = async () => {
    if (!id || !transferForm.fromMemberId || !transferForm.toMemberId || !transferForm.reason) return;
    setActionLoading(true);
    setActionError('');
    try {
      await overrideApi.transferGroupAdmin(id, {
        fromMemberId: transferForm.fromMemberId,
        toMemberId: transferForm.toMemberId,
        reason: transferForm.reason,
      });
      setActionSuccess('Group admin transferred successfully');
      setShowTransferAdmin(false);
      setTransferForm({ fromMemberId: '', toMemberId: '', reason: '' });
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to transfer admin');
    } finally {
      setActionLoading(false);
    }
  };

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

        {/* Group-level actions */}
        <div className="flex gap-2 mt-4">
          <button
            onClick={() => setShowAdjustment(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 rounded-lg text-sm font-medium hover:bg-emerald-100 transition-colors"
          >
            <DollarSign className="w-4 h-4" /> Create Adjustment
          </button>
          <button
            onClick={() => setShowTransferAdmin(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors"
          >
            <UserCog className="w-4 h-4" /> Transfer Admin
          </button>
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
                    <td className="px-6 py-3">
                      <p className="font-medium text-gray-900">{m.user?.fullName || '—'}</p>
                      <div className="flex gap-1 mt-0.5">
                        <CopyButton text={m.id} label="Member ID" />
                        <CopyButton text={m.user?.id || ''} label="User ID" />
                      </div>
                    </td>
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
                    <td className="px-6 py-3 text-right relative">
                      <button
                        onClick={() => setActionMenu(actionMenu === m.id ? null : m.id)}
                        className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                      {actionMenu === m.id && (
                        <div className="absolute right-6 top-10 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44">
                          <button
                            onClick={() => { setResetPinTarget({ id: m.user?.id, name: m.user?.fullName }); setActionMenu(null); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <KeyRound className="w-4 h-4" /> Reset PIN
                          </button>
                          <button
                            onClick={() => { setUnlockTarget({ id: m.user?.id, name: m.user?.fullName }); setActionMenu(null); }}
                            className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                          >
                            <Unlock className="w-4 h-4" /> Unlock Account
                          </button>
                          <button
                            onClick={() => { setRemoveConfirm({ id: m.id, name: m.user?.fullName || 'this member' }); setActionMenu(null); }}
                            disabled={removingMember === m.id}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" /> Remove Member
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

      {/* Create Adjustment Modal */}
      {showAdjustment && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-emerald-100 p-2 rounded-full"><DollarSign className="w-5 h-5 text-emerald-600" /></div>
              <h3 className="font-semibold text-gray-900">Create Adjustment</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">Adjust balance for a member in <strong>{group.name}</strong></p>
            {actionError && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded-lg text-sm">{actionError}</div>}
            <div className="space-y-3 mb-4">
              <select
                value={adjustForm.memberId}
                onChange={e => setAdjustForm({ ...adjustForm, memberId: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0A2463] focus:border-transparent outline-none"
              >
                <option value="">Select member</option>
                {members.map(m => (
                  <option key={m.id} value={m.id}>{m.user?.fullName} ({m.user?.phoneNumber})</option>
                ))}
              </select>
              <input
                type="number"
                step="0.01"
                value={adjustForm.amount}
                onChange={e => setAdjustForm({ ...adjustForm, amount: e.target.value })}
                placeholder="Amount (negative for debit)"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0A2463] focus:border-transparent outline-none"
              />
              <input
                type="text"
                value={adjustForm.reason}
                onChange={e => setAdjustForm({ ...adjustForm, reason: e.target.value })}
                placeholder="Reason for adjustment"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0A2463] focus:border-transparent outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowAdjustment(false); setActionError(''); }} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleCreateAdjustment} disabled={actionLoading || !adjustForm.memberId || !adjustForm.amount || !adjustForm.reason} className="flex-1 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors">{actionLoading ? 'Creating...' : 'Create'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Transfer Admin Modal */}
      {showTransferAdmin && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-full"><UserCog className="w-5 h-5 text-blue-600" /></div>
              <h3 className="font-semibold text-gray-900">Transfer Admin</h3>
            </div>
            <p className="text-sm text-gray-500 mb-4">Transfer admin role in <strong>{group.name}</strong></p>
            {actionError && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded-lg text-sm">{actionError}</div>}
            <div className="space-y-3 mb-4">
              <div>
                <label className="block text-xs text-gray-500 mb-1">Current Admin</label>
                <select
                  value={transferForm.fromMemberId}
                  onChange={e => setTransferForm({ ...transferForm, fromMemberId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0A2463] focus:border-transparent outline-none"
                >
                  <option value="">Select current admin</option>
                  {members.filter(m => m.role === 'ADMIN').map(m => (
                    <option key={m.id} value={m.id}>{m.user?.fullName} ({m.user?.phoneNumber})</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-500 mb-1">New Admin</label>
                <select
                  value={transferForm.toMemberId}
                  onChange={e => setTransferForm({ ...transferForm, toMemberId: e.target.value })}
                  className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0A2463] focus:border-transparent outline-none"
                >
                  <option value="">Select new admin</option>
                  {members.filter(m => m.id !== transferForm.fromMemberId).map(m => (
                    <option key={m.id} value={m.id}>{m.user?.fullName} ({m.user?.phoneNumber})</option>
                  ))}
                </select>
              </div>
              <input
                type="text"
                value={transferForm.reason}
                onChange={e => setTransferForm({ ...transferForm, reason: e.target.value })}
                placeholder="Reason for transfer"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0A2463] focus:border-transparent outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setShowTransferAdmin(false); setActionError(''); }} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleTransferAdmin} disabled={actionLoading || !transferForm.fromMemberId || !transferForm.toMemberId || !transferForm.reason} className="flex-1 py-2.5 bg-[#0A2463] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A8A] disabled:opacity-60 transition-colors">{actionLoading ? 'Transferring...' : 'Transfer'}</button>
            </div>
          </div>
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
