import { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { systemApi, schedulerApi } from '../api';
import {
  Users,
  Building2,
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
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(t);
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="relative">
          <div className="w-10 h-10 rounded-full border-2 border-slate-200" />
          <div className="absolute inset-0 w-10 h-10 rounded-full border-2 border-[#0A2463] border-t-transparent animate-spin" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <AlertCircle className="w-7 h-7 text-slate-400" />
        </div>
        <p className="text-slate-800 font-medium mb-1">Couldn't load system overview</p>
        <p className="text-sm text-slate-500 mb-5">{error}</p>
        <button onClick={fetchData} className="inline-flex items-center gap-2 px-4 py-2 bg-[#0A2463] hover:bg-[#0F3285] text-white rounded-lg text-sm font-medium transition-colors">
          <RefreshCw className="w-4 h-4" /> Retry
        </button>
      </div>
    );
  }

  const totalCollected = data?.totalCollected || data?.totalContributions || 0;
  const stats = [
    { label: 'Members', value: data?.members || data?.totalUsers || 0, icon: Users },
    { label: 'Groups', value: data?.groups || data?.totalGroups || 0, icon: Building2 },
    { label: 'Transactions', value: data?.totalTransactions || 0, icon: TrendingUp },
    { label: 'Admins', value: data?.admins || 0, icon: Activity },
  ];

  const totalVerified = data?.verification
    ? data.verification.verified + data.verification.pending + data.verification.unverified + data.verification.failed
    : 0;
  const verifiedPct = data?.verification && totalVerified > 0
    ? Math.round((data.verification.verified / totalVerified) * 100)
    : null;

  const hour = now.getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="space-y-6">
      {/* Hero — restrained navy gradient, no decorative glows. Primary metric
          sits inline; the eye lands on the number, not on chrome. */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0A2463] to-[#1A43A8] text-white">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.06),transparent_40%)] pointer-events-none" />
        <div className="relative p-6 lg:p-8">
          <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-6">
            <div>
              <p className="text-xs font-medium text-white/55 mb-1 tracking-wide">{greeting}</p>
              <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight">
                {user?.fullName?.split(' ')[0] || 'Admin'}
              </h1>
              <p className="text-sm text-white/55 mt-1.5">
                {now.toLocaleDateString('en-ZA', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                {' · '}
                {now.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>

            <div className="lg:text-right">
              <p className="text-[11px] font-semibold tracking-[0.12em] uppercase text-white/45">Total Collected</p>
              <p className="text-3xl lg:text-4xl font-semibold tracking-tight mt-1 tabular-nums">
                R {totalCollected.toLocaleString('en-ZA', { maximumFractionDigits: 0 })}
              </p>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <button
              onClick={fetchData}
              className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/10 hover:bg-white/15 border border-white/15 rounded-lg text-xs font-medium transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
            {scheduler && (
              <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border ${
                scheduler.running
                  ? 'bg-emerald-400/15 text-emerald-100 border-emerald-300/25'
                  : 'bg-white/10 text-white/70 border-white/15'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full ${scheduler.running ? 'bg-emerald-300 animate-pulse' : 'bg-slate-300'}`} />
                Scheduler {scheduler.running ? 'running' : 'stopped'}
              </span>
            )}
            {scheduler && scheduler.pendingPayouts > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-amber-400/15 text-amber-100 border border-amber-300/25">
                {scheduler.pendingPayouts} pending payout{scheduler.pendingPayouts === 1 ? '' : 's'}
              </span>
            )}
          </div>
        </div>
      </section>

      {/* Stats grid — monochrome icons, no rainbow. Color stays reserved for status. */}
      <section>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {stats.map(({ label, value, icon: Icon }) => (
            <div
              key={label}
              className="group bg-white rounded-xl border border-slate-200 p-5 hover:border-slate-300 transition-colors"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center">
                  <Icon className="w-4 h-4 text-slate-500" />
                </div>
                <ArrowUpRight className="w-4 h-4 text-slate-300 group-hover:text-slate-400 transition-colors" />
              </div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</p>
              <p className="text-2xl font-semibold text-slate-900 mt-1 tabular-nums">
                {typeof value === 'number' ? value.toLocaleString('en-ZA') : value}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Verification + Scheduler row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {data?.verification && (
          <section className="lg:col-span-1 bg-white rounded-xl border border-slate-200 p-6">
            <div className="flex items-start justify-between mb-5">
              <div>
                <h2 className="text-sm font-semibold text-slate-900">Identity Verification</h2>
                <p className="text-xs text-slate-500 mt-0.5">{totalVerified.toLocaleString()} total members</p>
              </div>
              {verifiedPct !== null && (
                <span className="text-xs font-medium text-slate-500 tabular-nums">{verifiedPct}%</span>
              )}
            </div>

            {verifiedPct !== null && (
              <div className="mb-5">
                <div className="h-1.5 rounded-full bg-slate-100 overflow-hidden">
                  <div
                    className="h-full bg-[#0A2463] transition-all"
                    style={{ width: `${verifiedPct}%` }}
                  />
                </div>
              </div>
            )}

            <div className="space-y-0">
              <VerificationRow color="emerald" label="Verified" value={data.verification.verified} />
              <VerificationRow color="slate" label="Pending" value={data.verification.pending} />
              <VerificationRow color="slate-muted" label="Unverified" value={data.verification.unverified} />
              <VerificationRow color="rose" label="Failed" value={data.verification.failed} />
            </div>
          </section>
        )}

        {scheduler && (
          <section className={`bg-white rounded-xl border border-slate-200 p-6 ${data?.verification ? 'lg:col-span-2' : 'lg:col-span-3'}`}>
            <div className="flex items-start justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${
                  scheduler.running ? 'bg-emerald-50 border border-emerald-100' : 'bg-slate-50 border border-slate-100'
                }`}>
                  <Timer className={`w-4 h-4 ${scheduler.running ? 'text-emerald-600' : 'text-slate-400'}`} />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-slate-900">Payout Scheduler</h2>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`inline-flex items-center gap-1 text-xs font-medium ${
                      scheduler.running ? 'text-emerald-600' : 'text-slate-500'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${scheduler.running ? 'bg-emerald-500' : 'bg-slate-400'}`} />
                      {scheduler.running ? 'Running' : 'Stopped'}
                    </span>
                    {scheduler.isProcessing && (
                      <span className="inline-flex items-center gap-1 text-xs font-medium text-[#0A2463]">
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
              <StatCell label="Result" value={
                scheduler.lastRunResult === 'success' ? (
                  <span className="inline-flex items-center gap-1 text-emerald-600"><CheckCircle2 className="w-3.5 h-3.5" /> OK</span>
                ) : scheduler.lastRunResult === 'error' ? (
                  <span className="inline-flex items-center gap-1 text-rose-600"><XCircle className="w-3.5 h-3.5" /> Error</span>
                ) : (<span className="text-slate-400">—</span>)
              } />
              <StatCell label="Pending Payouts" value={scheduler.pendingPayouts} tone={scheduler.pendingPayouts > 0 ? 'amber' : undefined} />
              <StatCell label="Failed Payouts" value={scheduler.failedPayouts} tone={scheduler.failedPayouts > 0 ? 'rose' : undefined} />
              <StatCell label="Rotating Groups" value={scheduler.activeRotatingGroups} />
              <StatCell label="End-of-Term Groups" value={scheduler.activeEndOfTermGroups} />
            </div>

            {scheduler.lastError && (
              <div className="flex items-start gap-2 mt-4 p-3 bg-rose-50 border border-rose-100 rounded-lg text-sm text-rose-700">
                <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                <span>{scheduler.lastError}</span>
              </div>
            )}

            {scheduler.startedAt && (
              <p className="text-xs text-slate-400 mt-4">
                Started {new Date(scheduler.startedAt).toLocaleString('en-ZA')} · Interval {(scheduler.intervalMs / 3600000).toFixed(0)}h
              </p>
            )}
          </section>
        )}
      </div>

      {/* Summary line */}
      <section className="bg-white rounded-xl border border-slate-200 p-6">
        <div className="flex items-center gap-2 mb-2">
          <ShieldCheck className="w-4 h-4 text-slate-400" />
          <h2 className="text-sm font-semibold text-slate-900">System status</h2>
        </div>
        <p className="text-sm text-slate-600 leading-relaxed">
          Total collected sits at <span className="font-semibold text-slate-900 tabular-nums">R {totalCollected.toLocaleString('en-ZA')}</span> across {(data?.groups || data?.totalGroups || 0).toLocaleString()} active groups.
          {' '}
          {scheduler && scheduler.pendingPayouts > 0 && (
            <>You have <span className="font-semibold text-amber-700">{scheduler.pendingPayouts} payout{scheduler.pendingPayouts === 1 ? '' : 's'} pending</span> in the queue.</>
          )}
          {scheduler && scheduler.pendingPayouts === 0 && scheduler.failedPayouts === 0 && (
            <>No pending or failed payouts — the queue is clean.</>
          )}
        </p>
      </section>
    </div>
  );
}

function StatCell({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'amber' | 'rose' }) {
  const valueColor =
    tone === 'amber' ? 'text-amber-700' :
    tone === 'rose' ? 'text-rose-600' :
    'text-slate-900';
  return (
    <div className="rounded-lg bg-slate-50/60 border border-slate-100 p-3">
      <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      <p className={`text-sm font-semibold mt-1 ${valueColor} tabular-nums`}>{value}</p>
    </div>
  );
}

function VerificationRow({ color, label, value }: { color: 'emerald' | 'slate' | 'slate-muted' | 'rose'; label: string; value: number }) {
  const dot =
    color === 'emerald' ? 'bg-emerald-500' :
    color === 'rose' ? 'bg-rose-500' :
    color === 'slate' ? 'bg-slate-400' :
    'bg-slate-300';
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2.5">
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <span className="text-sm text-slate-700">{label}</span>
      </div>
      <span className="text-sm font-semibold text-slate-900 tabular-nums">{value.toLocaleString()}</span>
    </div>
  );
}
