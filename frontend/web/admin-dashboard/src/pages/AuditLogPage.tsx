import { useState, useEffect, useCallback } from 'react';
import { auditApi } from '../api';
import {
  ScrollText,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  AlertCircle,
  Filter,
} from 'lucide-react';

interface AuditEntry {
  id: string;
  action: string;
  userId: string | null;
  userRole: string | null;
  ip: string | null;
  method: string;
  path: string;
  params: Record<string, any> | null;
  body: Record<string, any> | null;
  result: string | null;
  statusCode: number | null;
  createdAt: string;
}

interface Pagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditEntry[]>([]);
  const [pagination, setPagination] = useState<Pagination>({ page: 1, limit: 50, total: 0, totalPages: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [actionFilter, setActionFilter] = useState('');
  const [resultFilter, setResultFilter] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const fetchLogs = useCallback(async (page = 1) => {
    setLoading(true);
    setError('');
    try {
      const params: any = { page, limit: 50 };
      if (actionFilter) params.action = actionFilter;
      if (resultFilter) params.result = resultFilter;
      if (fromDate) params.from = new Date(fromDate).toISOString();
      if (toDate) params.to = new Date(toDate + 'T23:59:59').toISOString();

      const res = await auditApi.list(params);
      if (res.data.success) {
        setLogs(res.data.data || []);
        setPagination(res.data.pagination || { page, limit: 50, total: 0, totalPages: 0 });
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [actionFilter, resultFilter, fromDate, toDate]);

  useEffect(() => { fetchLogs(1); }, [fetchLogs]);

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' }) +
      ' ' + d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const resultBadge = (result: string | null) => {
    if (!result) return <span className="text-gray-400 text-xs">—</span>;
    return result === 'SUCCESS'
      ? <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-green-100 text-green-700">SUCCESS</span>
      : <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded-full bg-red-100 text-red-700">FAILED</span>;
  };

  const inputClass = 'px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2463]/20 focus:border-[#0A2463]';

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <ScrollText className="w-7 h-7 text-[#0A2463]" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Audit Logs</h1>
            <p className="text-sm text-gray-500 mt-0.5">{pagination.total.toLocaleString()} total entries</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-sm transition-colors ${showFilters ? 'bg-[#0A2463] text-white border-[#0A2463]' : 'bg-white text-gray-600 border-gray-200 hover:bg-gray-50'}`}
          >
            <Filter className="w-4 h-4" />
            Filters
          </button>
          <button
            onClick={() => fetchLogs(1)}
            className="flex items-center gap-2 px-3 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white border border-gray-100 rounded-xl p-4 mb-6 shadow-sm">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Action</label>
              <div className="relative">
                <Search className="absolute left-3 top-2.5 w-4 h-4 text-gray-400" />
                <input
                  placeholder="e.g. SUPERADMIN"
                  value={actionFilter}
                  onChange={e => setActionFilter(e.target.value)}
                  className={`${inputClass} pl-9 w-full`}
                />
              </div>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Result</label>
              <select value={resultFilter} onChange={e => setResultFilter(e.target.value)} className={`${inputClass} w-full`}>
                <option value="">All</option>
                <option value="SUCCESS">SUCCESS</option>
                <option value="FAILED">FAILED</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">From Date</label>
              <input type="date" value={fromDate} onChange={e => setFromDate(e.target.value)} className={`${inputClass} w-full`} />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">To Date</label>
              <input type="date" value={toDate} onChange={e => setToDate(e.target.value)} className={`${inputClass} w-full`} />
            </div>
          </div>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="flex items-center gap-3 p-4 bg-red-50 text-red-700 rounded-xl mb-6">
          <AlertCircle className="w-5 h-5 shrink-0" />
          <span className="text-sm">{error}</span>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 border-b border-gray-100">
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Time</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Action</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">User</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Method</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Path</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">Result</th>
                <th className="text-left px-4 py-3 font-semibold text-gray-600">IP</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#0A2463] mx-auto" />
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-gray-400">No audit logs found</td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="border-b border-gray-50 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap text-xs">{formatDate(log.createdAt)}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex px-2 py-0.5 text-xs font-medium rounded bg-gray-100 text-gray-700">{log.action}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 whitespace-nowrap">
                      <div className="text-xs">{log.userId || '—'}</div>
                      {log.userRole && <div className="text-xs text-gray-400">{log.userRole}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-mono px-1.5 py-0.5 rounded ${
                        log.method === 'DELETE' ? 'bg-red-50 text-red-600' :
                        log.method === 'POST' ? 'bg-blue-50 text-blue-600' :
                        log.method === 'PUT' || log.method === 'PATCH' ? 'bg-amber-50 text-amber-600' :
                        'bg-gray-50 text-gray-600'
                      }`}>{log.method}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs font-mono max-w-[200px] truncate" title={log.path}>{log.path}</td>
                    <td className="px-4 py-3">{resultBadge(log.result)}</td>
                    <td className="px-4 py-3 text-gray-400 text-xs font-mono">{log.ip || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50/50">
            <span className="text-sm text-gray-500">
              Page {pagination.page} of {pagination.totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => fetchLogs(pagination.page - 1)}
                disabled={pagination.page <= 1}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                <ChevronLeft className="w-4 h-4" /> Prev
              </button>
              <button
                onClick={() => fetchLogs(pagination.page + 1)}
                disabled={pagination.page >= pagination.totalPages}
                className="flex items-center gap-1 px-3 py-1.5 border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-white disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Next <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
