import { useState, useEffect } from 'react';
import { transactionApi } from '../api';
import { ArrowLeftRight, AlertCircle, Search, ChevronLeft, ChevronRight } from 'lucide-react';

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

  const fetchTransactions = async () => {
    setLoading(true);
    try {
      const res = await transactionApi.list({ page, limit: 50 });
      setTransactions(res.data.data || res.data.transactions || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load transactions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTransactions(); }, [page]);

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
    </div>
  );
}
