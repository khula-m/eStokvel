import { useState, useEffect } from 'react';
import { systemApi, schedulerApi } from '../api';
import {
  Users,
  Building2,
  Coins,
  TrendingUp,
  Activity,
  AlertCircle,
  RefreshCw,
  Clock,
  CheckCircle2,
  XCircle,
  Zap,
  Timer,
  ShieldCheck,
} from 'lucide-react';

interface OverviewData {
  // Backend field names
  admins?: number;
  groups?: number;
  members?: number;
  totalCollected?: number;
  totalTransactions?: number;
  verification?: {
    verified: number;
    pending: number;
    unverified: number;
    failed: number;
  };
  // Aliased field names (legacy)
  totalUsers?: number;
  totalGroups?: number;
  totalContributions?: number;
  activeGroups?: number;
  pendingTransactions?: number;
}

interface SchedulerData {
  running: boolean;
  isProcessing: boolean;
  lastRunAt: string | null;
  lastRunResult: 'success' | 'error' | null;
  lastError: string | null;
  rotatingGroupsProcessed: number;
  endOfTermGroupsProcessed: number;
  totalPayoutsCreated: number;
  startedAt: string | null;
  intervalMs: number;
  pendingPayouts: number;
  failedPayouts: number;
  activeRotatingGroups: number;
  activeEndOfTermGroups: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const [overviewRes, schedulerRes] = await Promise.all([
        systemApi.getOverview(),
        schedulerApi.getStatus().catch(() => null),
      ]);
      if (overviewRes.data.success) {
        setData(overviewRes.data.data || overviewRes.data);
      }
      if (schedulerRes?.data?.success) {
        setScheduler(schedulerRes.data.data);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load system overview');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#0A2463]" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
        <p className="text-gray-600 mb-4">{error}</p>
        <button onClick={fetchData} className="px-4 py-2 bg-[#0A2463] text-white rounded-lg text-sm">
          Retry
        </button>
      </div>
    );
  }

  const stats = [
    { label: 'Total Members', value: data?.members || data?.totalUsers || 0, icon: Users, color: 'bg-blue-500', lightColor: 'bg-blue-50' },
    { label: 'Total Groups', value: data?.groups || data?.totalGroups || 0, icon: Building2, color: 'bg-emerald-500', lightColor: 'bg-emerald-50' },
    { label: 'Total Collected (ZAR)', value: `R ${(data?.totalCollected || data?.totalContributions || 0).toLocaleString()}`, icon: Coins, color: 'bg-amber-500', lightColor: 'bg-amber-50' },
    { label: 'Transactions', value: data?.totalTransactions || 0, icon: TrendingUp, color: 'bg-purple-500', lightColor: 'bg-purple-50' },
    { label: 'Admins', value: data?.admins || 0, icon: Activity, color: 'bg-teal-500', lightColor: 'bg-teal-50' },
  ];

  const verifiedPct = data?.verification
    ? Math.round((data.verification.verified / Math.max(1, data.verification.verified + data.verification.pending + data.verification.unverified + data.verification.failed)) * 100)
    : null;

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">System Overview</h1>
          <p className="text-sm text-gray-500 mt-1">Real-time platform metrics</p>
        </div>
        <button
          onClick={fetchData}
          className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-lg text-sm text-gray-600 hover:bg-gray-50 transition-colors shadow-sm"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-8">
        {stats.map(({ label, value, icon: Icon, color, lightColor }) => (
          <div key={label} className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-gray-500 font-medium">{label}</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
              </div>
              <div className={`${lightColor} p-2.5 rounded-xl`}>
                <Icon className={`w-5 h-5 ${color.replace('bg-', 'text-')}`} />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Verification Overview */}
      {data?.verification && (
        <div className="bg-white rounded-xl border border-gray-100 p-5 shadow-sm mb-8">
          <div className="flex items-center gap-2 mb-4">
            <ShieldCheck className="w-5 h-5 text-[#0A2463]" />
            <h2 className="text-lg font-bold text-gray-900">Identity Verification</h2>
            {verifiedPct !== null && (
              <span className="ml-auto text-sm font-medium text-gray-500">{verifiedPct}% verified</span>
            )}
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-green-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-medium">Verified</p>
              <p className="text-xl font-bold text-green-700 mt-1">{data.verification.verified}</p>
            </div>
            <div className="bg-blue-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-medium">Pending</p>
              <p className="text-xl font-bold text-blue-700 mt-1">{data.verification.pending}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-medium">Unverified</p>
              <p className="text-xl font-bold text-gray-600 mt-1">{data.verification.unverified}</p>
            </div>
            <div className="bg-red-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-medium">Failed</p>
              <p className="text-xl font-bold text-red-700 mt-1">{data.verification.failed}</p>
            </div>
          </div>
        </div>
      )}

      {/* Scheduler Monitor */}
      {scheduler && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <div className={`p-2 rounded-lg ${scheduler.running ? 'bg-green-50' : 'bg-gray-50'}`}>
                <Timer className={`w-5 h-5 ${scheduler.running ? 'text-green-600' : 'text-gray-400'}`} />
              </div>
              <div>
                <h2 className="text-lg font-bold text-gray-900">Payout Scheduler</h2>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full ${
                    scheduler.running ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
                  }`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${scheduler.running ? 'bg-green-500 animate-pulse' : 'bg-gray-400'}`} />
                    {scheduler.running ? 'Running' : 'Stopped'}
                  </span>
                  {scheduler.isProcessing && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 text-blue-700">
                      <Zap className="w-3 h-3" /> Processing
                    </span>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-medium">Last Run</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">
                {scheduler.lastRunAt
                  ? new Date(scheduler.lastRunAt).toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : 'Never'}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-medium">Last Result</p>
              <p className="text-sm font-semibold mt-1">
                {scheduler.lastRunResult === 'success' ? (
                  <span className="flex items-center gap-1 text-green-600"><CheckCircle2 className="w-3.5 h-3.5" /> OK</span>
                ) : scheduler.lastRunResult === 'error' ? (
                  <span className="flex items-center gap-1 text-red-600"><XCircle className="w-3.5 h-3.5" /> Error</span>
                ) : (
                  <span className="text-gray-400">—</span>
                )}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-medium">Pending Payouts</p>
              <p className={`text-sm font-semibold mt-1 ${scheduler.pendingPayouts > 0 ? 'text-amber-600' : 'text-gray-900'}`}>
                {scheduler.pendingPayouts}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-medium">Failed Payouts</p>
              <p className={`text-sm font-semibold mt-1 ${scheduler.failedPayouts > 0 ? 'text-red-600' : 'text-gray-900'}`}>
                {scheduler.failedPayouts}
              </p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-medium">Rotating Groups</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{scheduler.activeRotatingGroups}</p>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <p className="text-xs text-gray-500 font-medium">End-of-Term Groups</p>
              <p className="text-sm font-semibold text-gray-900 mt-1">{scheduler.activeEndOfTermGroups}</p>
            </div>
          </div>

          {scheduler.lastError && (
            <div className="flex items-start gap-2 mt-4 p-3 bg-red-50 rounded-lg text-sm text-red-700">
              <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
              <span>{scheduler.lastError}</span>
            </div>
          )}

          {scheduler.startedAt && (
            <p className="text-xs text-gray-400 mt-4">
              Scheduler started {new Date(scheduler.startedAt).toLocaleString('en-ZA')} · Interval: {(scheduler.intervalMs / 3600000).toFixed(0)}h
            </p>
          )}
        </div>
      )}

    </div>
  );
}
