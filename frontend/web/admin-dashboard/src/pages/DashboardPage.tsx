import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { systemApi, schedulerApi } from '../api';
import {
  Users,
  Building2,
  Coins,
  TrendingUp,
  Activity,
  AlertCircle,
  RefreshCw,
  CheckCircle2,
  XCircle,
  Zap,
  Timer,
  ShieldCheck,
  ArrowUpRight,
  Wallet,
} from 'lucide-react';

interface OverviewData {
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
  const { user } = useAuth();
  const [data, setData] = useState<OverviewData | null>(null);
  const [scheduler, setScheduler] = useState<SchedulerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [now, setNow] = useState(new Date());

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

  // Live clock in the hero — refreshes every minute, light touch.
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="relative">
          <div className="w-12 h-12 rounded-full border-4 border-slate-200" />
          <div className="absolute inset-0 w-12 h-12 rounded-full border-4 border-[#0A2463] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-2xl bg-red-50 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-red-500" />
        </div>
        <p className="text-slate-700 font-medium mb-1">Couldn't load system overview</p>
        <p className="text-sm text-slate-500 mb-4">{error}</p>
        <button onClick={fetchData} className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#0A2463] hover:bg-[#0F3285] text-white rounded-xl text-sm font-medium transition-colors shadow-sm">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const totalCollected = data?.totalCollected || data?.totalContributions || 0;
  const stats = [
    { label: 'Total Members', value: data?.members || data?.totalUsers || 0, icon: Users, accent: 'from-blue-500 to-blue-600', tint: 'bg-blue-50 text-blue-600' },
    { label: 'Active Groups', value: data?.groups || data?.totalGroups || 0, icon: Building2, accent: 'from-emerald-500 to-emerald-600', tint: 'bg-emerald-50 text-emerald-600' },
    { label: 'Transactions', value: data?.totalTransactions || 0, icon: TrendingUp, accent: 'from-purple-500 to-purple-600', tint: 'bg-purple-50 text-purple-600' },
    { label: 'Admins', value: data?.admins || 0, icon: Activity, accent: 'from-teal-500 to-teal-600', tint: 'bg-teal-50 text-teal-600' },
  ];

  const verifiedPct = data?.verification
    ? Math.round((data.verification.verified / Math.max(1, data.verification.verified + data.verification.pending + data.verification.unverified + data.verification.failed)) * 100)
    : null;

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6 lg:space-y-8">
      {/* Hero — gradient banner with greeting, live time, primary metric */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0A2463] via-[#0F3285] to-[#1A43A8] text-white shadow-xl">
        {/* Decorative glows */}
        <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-[#D4A017]/15 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-72 h-72 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

        <div className="relative p-6 lg:p-10 grid grid-cols-1 lg:grid-cols-3 gap-6 lg:gap-8 items-center">
          <div className="lg:col-span-2">
            <p className="text-sm font-medium text-white/60 mb-1">{greeting},</p>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight">
              {user?.fullName?.split(' ')[0] || 'Admin'}
            </h1>
            <p className="text-sm text-white/55 mt-2">
              {now.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
              {' · '}
              {now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
            </p>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={fetchData}
                className="inline-flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/15 backdrop-blur rounded-xl text-sm font-medium transition-colors"
              >
                <RefreshCw className="w-4 h-4" />
                Refresh
              </button>
              {scheduler && (
                <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border backdrop-blur ${
                  scheduler.running
                    ? 'bg-emerald-400/15 text-emerald-200 border-emerald-300/30'
                    : 'bg-slate-400/15 text-slate-200 border-slate-300/30'
                }`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${scheduler.running ? 'bg-emerald-400 animate-pulse' : 'bg-slate-400'}`} />
                  Scheduler {scheduler.running ? 'running' : 'stopped'}
                </span>
              )}
            </div>
          </div>

          {/* Primary metric card */}
          <div className="lg:col-span-1">
            <div className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold tracking-wider uppercase text-white/55">Total Collected</span>
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#D4A017] to-[#B8860B] flex items-center justify-center shadow-md shadow-amber-500/30">
                  <Wallet className="w-5 h-5 text-white" />
                </div>
              </div>
              <p className="text-3xl lg:text-4xl font-extrabold tracking-tight">
                R {totalCollected.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}
              </p>
              <p className="mt-2 text-xs text-white/55">Lifetime contributions across all groups</p>
            </div>
          </div>
        </div>
      </section>

      {/* Stats grid */}
      <section>
        <h2 className="text-xs font-bold text-slate-500 uppercase tracking-[0.15em] mb-3 px-1">Key Metrics</h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-4">
          {stats.map(({ label, value, icon: Icon, accent, tint }) => (
            <div
              key={label}
              className="group relative overflow-hidden bg-white rounded-2xl border border-slate-200/70 shadow-sm hover:shadow-lg hover:-translate-y-0.5 hover:border-slate-300 transition-all p-5"
            >
              {/* Hover ribbon */}
              <div className={`absolute -top-10 -right-10 w-24 h-24 rounded-full bg-gradient-to-br ${accent} opacity-0 group-hover:opacity-10 blur-2xl transition-opacity`} />

              <div className="relative flex items-start justify-between mb-3">
                <div className={`w-10 h-10 rounded-xl ${tint} flex items-center justify-center`}>
                  <Icon className="w-5 h-5" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-500 transition-colors" />
              </div>
              <p className="relative text-sm font-medium text-slate-500">{label}</p>
              <p className="relative text-2xl lg:text-3xl font-extrabold text-slate-900 mt-1 tabular-nums">
                {typeof value === 'number' ? value.toLocaleString('en-ZA') : value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Verification + Scheduler row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 lg:gap-6">
        {/* Verification */}
        {data?.verification && (
          <section className="lg:col-span-1 bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#0A2463]/5 flex items-center justify-center">
                  <ShieldCheck className="w-5 h-5 text-[#0A2463]" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Identity Verification</h2>
                  {verifiedPct !== null && (
                    <p className="text-xs text-slate-500">{verifiedPct}% of users verified</p>
                  )}
                </div>
              </div>
            </div>

            {verifiedPct !== null && (
              <div className="mb-5">
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-emerald-400 to-emerald-500 transition-all"
                    style={{ width: `${verifiedPct}%` }}
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl bg-emerald-50/60 border border-emerald-100 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700/80">Verified</p>
                <p className="text-xl font-extrabold text-emerald-700 mt-1 tabular-nums">{data.verification.verified}</p>
              </div>
              <div className="rounded-xl bg-blue-50/60 border border-blue-100 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-blue-700/80">Pending</p>
                <p className="text-xl font-extrabold text-blue-700 mt-1 tabular-nums">{data.verification.pending}</p>
              </div>
              <div className="rounded-xl bg-slate-50 border border-slate-150 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Unverified</p>
                <p className="text-xl font-extrabold text-slate-700 mt-1 tabular-nums">{data.verification.unverified}</p>
              </div>
              <div className="rounded-xl bg-red-50/60 border border-red-100 p-3">
                <p className="text-[10px] font-bold uppercase tracking-wider text-red-700/80">Failed</p>
                <p className="text-xl font-extrabold text-red-700 mt-1 tabular-nums">{data.verification.failed}</p>
              </div>
            </div>
          </section>
        )}

        {/* Scheduler */}
        {scheduler && (
          <section className={`bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6 ${data?.verification ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-2.5">
                <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${scheduler.running ? 'bg-emerald-50' : 'bg-slate-100'}`}>
                  <Timer className={`w-5 h-5 ${scheduler.running ? 'text-emerald-600' : 'text-slate-400'}`} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Payout Scheduler</h2>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full ${
                      scheduler.running ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${scheduler.running ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
                      {scheduler.running ? 'Running' : 'Stopped'}
                    </span>
                    {scheduler.isProcessing && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded-full bg-blue-100 text-blue-700">
                        <Zap className="w-3 h-3" /> Processing
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <StatCell label="Last Run" value={
                scheduler.lastRunAt
                  ? new Date(scheduler.lastRunAt).toLocaleString('en-ZA', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
                  : 'Never'
              } />
              <StatCell label="Last Result" value={
                scheduler.lastRunResult === 'success' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> OK</span>
                ) : scheduler.lastRunResult === 'error' ? (
                  <span className="inline-flex items-center gap-1 text-red-600"><XCircle className="w-3.5 h-3.5" /> Error</span>
                ) : (<span className="text-slate-400">—</span>)
              } />
              <StatCell label="Pending Payouts" value={scheduler.pendingPayouts} tone={scheduler.pendingPayouts > 0 ? 'amber' : undefined} />
              <StatCell label="Failed Payouts" value={scheduler.failedPayouts} tone={scheduler.failedPayouts > 0 ? 'red' : undefined} />
              <StatCell label="Rotating Groups" value={scheduler.activeRotatingGroups} />
              <StatCell label="End-of-Term Groups" value={scheduler.activeEndOfTermGroups} />
            </div>

            {scheduler.lastError && (
              <div className="flex items-start gap-2 mt-4 p-3 bg-red-50 border border-red-100 rounded-xl text-sm text-red-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{scheduler.lastError}</span>
              </div>
            )}

            {scheduler.startedAt && (
              <p className="text-xs text-slate-400 mt-4">
                Started {new Date(scheduler.startedAt).toLocaleString('en-ZA')} · Interval: {(scheduler.intervalMs / 3600000).toFixed(0)}h
              </p>
            )}
          </section>
        )}
      </div>

      {/* Pending alerts callout */}
      <section className="bg-white rounded-2xl border border-slate-200/70 shadow-sm p-6">
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-amber-50 flex items-center justify-center">
            <Coins className="w-5 h-5 text-amber-600" />
          </div>
          <h2 className="text-base font-bold text-slate-900">Money in motion</h2>
        </div>
        <p className="text-sm text-slate-500">
          Total collected sits at <span className="font-bold text-slate-900 tabular-nums">R {totalCollected.toLocaleString('en-ZA')}</span> across {(data?.groups || data?.totalGroups || 0).toLocaleString()} active groups. {scheduler && scheduler.pendingPayouts > 0 && (
            <>You have <span className="font-bold text-amber-600">{scheduler.pendingPayouts} payouts pending</span> — head to <a href="/transactions" className="text-[#0A2463] font-semibold underline-offset-2 hover:underline">Transactions</a> to clear them.</>
          )}
          {scheduler && scheduler.pendingPayouts === 0 && scheduler.failedPayouts === 0 && (
            <>No pending or failed payouts — the queue is clean.</>
          )}
        </p>
      </section>
    </div>
  );
}

function StatCell({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'amber' | 'red' }) {
  const valueColor =
    tone === 'amber' ? 'text-amber-600' :
    tone === 'red' ? 'text-red-600' :
    'text-slate-900';
  return (
    <div className="rounded-xl bg-slate-50/70 border border-slate-150 p-3">
      <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-sm font-bold mt-1 ${valueColor} tabular-nums`}>{value}</p>
    </div>
  );
}
