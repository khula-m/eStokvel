import { useState, useEffect } from 'react';
import { transactionApi, overrideApi } from '../api';
import { ArrowLeftRight, AlertCircle, Search, ChevronLeft, ChevronRight, MoreVertical, RefreshCw, FileEdit, X } from 'lucide-react';
import CopyButton from '../components/CopyButton';

interface Transaction {
  id: string;
  transactionType: string;
  amount: number;
  currency: string;
  status: string;
  paymentMethod: string;
  transactionDate: string;
  referenceNumber?: string;
  notes?: string;
  member?: {
    user?: { fullName: string; phoneNumber: string };
  };
  group?: { name: string; code: string };
}

export default function TransactionsPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Inline action state
  const [actionMenu, setActionMenu] = useState<string | null>(null);
  const [statusTarget, setStatusTarget] = useState<Transaction | null>(null);
  const [statusForm, setStatusForm] = useState({ status: '', reason: '' });
  const [retryTarget, setRetryTarget] = useState<Transaction | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await transactionApi.list({ page, limit: 50 });
      const body = res.data;
      const list = body.data?.transactions || body.data || body.transactions || [];
      setTransactions(Array.isArray(list) ? list : []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, [page]);

  const handleUpdateStatus = async () => {
    if (!statusTarget || !statusForm.status || !statusForm.reason) return;
    setActionLoading(true);
    setActionError('');
    try {
      await overrideApi.updateTransactionStatus(statusTarget.id, statusForm);
      setActionSuccess(`Transaction status updated to ${statusForm.status}`);
      setStatusTarget(null);
      setStatusForm({ status: '', reason: '' });
      fetchTransactions();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to update status');
    } finally {
      setActionLoading(false);
    }
  };

  const handleRetryPayout = async () => {
    if (!retryTarget) return;
    setActionLoading(true);
    setActionError('');
    try {
      await overrideApi.retryPayout(retryTarget.id);
      setActionSuccess('Payout retry initiated');
      setRetryTarget(null);
      fetchTransactions();
    } catch (err: any) {
      setActionError(err.response?.data?.message || 'Failed to retry payout');
    } finally {
      setActionLoading(false);
    }
  };

  const statusColor = (s: string) => {
    switch (s) {
      case 'COMPLETED': return 'bg-emerald-50 text-emerald-700';
      case 'PENDING': return 'bg-amber-50 text-amber-700';
      case 'FAILED': return 'bg-red-50 text-red-700';
      case 'REVERSED': return 'bg-purple-50 text-purple-700';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  const typeColor = (t: string) => {
    switch (t) {
      case 'CONTRIBUTION': return 'text-emerald-600';
      case 'PAYOUT': return 'text-blue-600';
      case 'EXPENSE': return 'text-red-600';
      default: return 'text-gray-600';
    }
  };

  const filtered = transactions.filter(t =>
    (t.member?.user?.fullName || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.group?.name || '').toLowerCase().includes(search.toLowerCase()) ||
    (t.referenceNumber || '').toLowerCase().includes(search.toLowerCase()) ||
    t.transactionType.toLowerCase().includes(search.toLowerCase())
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
          <h1 className="text-2xl font-bold text-gray-900">Transactions</h1>
          <p className="text-sm text-gray-500 mt-1">All platform transactions</p>
        </div>
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search transactions..."
            className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-[#0A2463] focus:border-transparent outline-none"
          />
        </div>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="px-6 py-16 text-center text-gray-400">
            <ArrowLeftRight className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No transactions found</p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-gray-500 text-xs uppercase">
                  <tr>
                    <th className="px-6 py-3 text-left">Date</th>
                    <th className="px-6 py-3 text-left">Type</th>
                    <th className="px-6 py-3 text-left">Member</th>
                    <th className="px-6 py-3 text-left">Group</th>
                    <th className="px-6 py-3 text-right">Amount</th>
                    <th className="px-6 py-3 text-left">Method</th>
                    <th className="px-6 py-3 text-left">Status</th>
                    <th className="px-6 py-3 text-left">Reference</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {filtered.map((t) => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(t.transactionDate).toLocaleDateString()}
                      </td>
                      <td className={`px-6 py-3 font-medium ${typeColor(t.transactionType)}`}>
                        {t.transactionType}
                      </td>
                      <td className="px-6 py-3 text-gray-900">
                        {t.member?.user?.fullName || '—'}
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {t.group?.name || '—'}
                      </td>
                      <td className="px-6 py-3 text-right font-medium text-gray-900 whitespace-nowrap">
                        R{Number(t.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </td>
                      <td className="px-6 py-3 text-gray-500 text-xs uppercase">
                        {t.paymentMethod?.replace('_', ' ')}
                      </td>
                      <td className="px-6 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${statusColor(t.status)}`}>
                          {t.status}
                        </span>
                      </td>
                      <td className="px-6 py-3 text-gray-400 text-xs font-mono">
                        {t.referenceNumber || '—'}
                        <CopyButton text={t.id} label="Copy Txn ID" />
                      </td>
                      <td className="px-6 py-3 text-right relative">
                        <button
                          onClick={() => setActionMenu(actionMenu === t.id ? null : t.id)}
                          className="p-1 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                        {actionMenu === t.id && (
                          <div className="absolute right-6 top-10 z-20 bg-white border border-gray-200 rounded-lg shadow-lg py-1 w-44">
                            <button
                              onClick={() => { setStatusTarget(t); setStatusForm({ status: '', reason: '' }); setActionMenu(null); }}
                              className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                            >
                              <FileEdit className="w-4 h-4" /> Update Status
                            </button>
                            {t.transactionType === 'PAYOUT' && (t.status === 'FAILED' || t.status === 'PENDING') && (
                              <button
                                onClick={() => { setRetryTarget(t); setActionMenu(null); }}
                                className="w-full px-4 py-2 text-left text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                              >
                                <RefreshCw className="w-4 h-4" /> Retry Payout
                              </button>
                            )}
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-6 py-3 border-t border-gray-100">
              <p className="text-sm text-gray-500">
                Showing {filtered.length} transactions (page {page})
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => setPage(Math.max(1, page - 1))}
                  disabled={page === 1}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(page + 1)}
                  disabled={filtered.length < 50}
                  className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-gray-50 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Success toast */}
      {actionSuccess && (
        <div className="fixed bottom-4 right-4 z-50 p-4 bg-green-50 border border-green-200 text-green-800 rounded-lg text-sm shadow-lg flex items-center gap-3">
          <span>{actionSuccess}</span>
          <button onClick={() => setActionSuccess('')} className="text-green-600 hover:text-green-800"><X className="w-4 h-4" /></button>
        </div>
      )}

      {/* Update Status Modal */}
      {statusTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-blue-100 p-2 rounded-full"><FileEdit className="w-5 h-5 text-blue-600" /></div>
              <h3 className="font-semibold text-gray-900">Update Status</h3>
            </div>
            <p className="text-sm text-gray-600 mb-1">
              <strong>{statusTarget.transactionType}</strong> — R{Number(statusTarget.amount).toFixed(2)}
            </p>
            <p className="text-xs text-gray-400 mb-4">{statusTarget.member?.user?.fullName || 'Unknown'} • {statusTarget.group?.name || '—'}</p>
            {actionError && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded-lg text-sm">{actionError}</div>}
            <div className="space-y-3 mb-4">
              <select
                value={statusForm.status}
                onChange={e => setStatusForm({ ...statusForm, status: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0A2463] focus:border-transparent outline-none"
              >
                <option value="">Select new status</option>
                <option value="COMPLETED">COMPLETED</option>
                <option value="PENDING">PENDING</option>
                <option value="FAILED">FAILED</option>
                <option value="REVERSED">REVERSED</option>
              </select>
              <input
                type="text"
                value={statusForm.reason}
                onChange={e => setStatusForm({ ...statusForm, reason: e.target.value })}
                placeholder="Reason for change"
                className="w-full px-4 py-2.5 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-[#0A2463] focus:border-transparent outline-none"
              />
            </div>
            <div className="flex gap-3">
              <button onClick={() => { setStatusTarget(null); setActionError(''); }} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleUpdateStatus} disabled={actionLoading || !statusForm.status || !statusForm.reason} className="flex-1 py-2.5 bg-[#0A2463] text-white rounded-lg text-sm font-medium hover:bg-[#1E3A8A] disabled:opacity-60 transition-colors">{actionLoading ? 'Updating...' : 'Update'}</button>
            </div>
          </div>
        </div>
      )}

      {/* Retry Payout Modal */}
      {retryTarget && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-sm shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="bg-amber-100 p-2 rounded-full"><RefreshCw className="w-5 h-5 text-amber-600" /></div>
              <h3 className="font-semibold text-gray-900">Retry Payout</h3>
            </div>
            <p className="text-sm text-gray-600 mb-1">Retry payout of <strong>R{Number(retryTarget.amount).toFixed(2)}</strong></p>
            <p className="text-xs text-gray-400 mb-6">{retryTarget.member?.user?.fullName || 'Unknown'} • {retryTarget.group?.name || '—'}</p>
            {actionError && <div className="mb-3 p-2 bg-red-50 text-red-700 rounded-lg text-sm">{actionError}</div>}
            <div className="flex gap-3">
              <button onClick={() => { setRetryTarget(null); setActionError(''); }} className="flex-1 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">Cancel</button>
              <button onClick={handleRetryPayout} disabled={actionLoading} className="flex-1 py-2.5 bg-amber-600 text-white rounded-lg text-sm font-medium hover:bg-amber-700 disabled:opacity-60 transition-colors">{actionLoading ? 'Retrying...' : 'Retry'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
