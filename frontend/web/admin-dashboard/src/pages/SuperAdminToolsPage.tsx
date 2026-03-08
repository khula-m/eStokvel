import { useState } from 'react';
import { overrideApi } from '../api';
import {
  Wrench,
  ArrowLeftRight,
  DollarSign,
  RotateCcw,
  KeyRound,
  Unlock,
  UserCog,
  CheckCircle2,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface ToolResult {
  success: boolean;
  message: string;
}

function ToolCard({ title, icon: Icon, color, children }: {
  title: string;
  icon: React.ElementType;
  color: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className={`flex items-center gap-3 px-5 py-4 border-b border-gray-100 ${color}`}>
        <Icon className="w-5 h-5" />
        <h3 className="font-semibold text-sm">{title}</h3>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function ResultBanner({ result, onDismiss }: { result: ToolResult; onDismiss: () => void }) {
  return (
    <div className={`flex items-start gap-3 p-3 rounded-lg text-sm mb-4 ${result.success ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'}`}>
      {result.success ? <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
      <span className="flex-1">{result.message}</span>
      <button onClick={onDismiss} className="text-gray-400 hover:text-gray-600">&times;</button>
    </div>
  );
}

export default function SuperAdminToolsPage() {
  // ── Update Transaction Status ──
  const [txId, setTxId] = useState('');
  const [txStatus, setTxStatus] = useState('COMPLETED');
  const [txReason, setTxReason] = useState('');
  const [txResult, setTxResult] = useState<ToolResult | null>(null);
  const [txLoading, setTxLoading] = useState(false);

  // ── Create Adjustment ──
  const [adjGroupId, setAdjGroupId] = useState('');
  const [adjMemberId, setAdjMemberId] = useState('');
  const [adjAmount, setAdjAmount] = useState('');
  const [adjReason, setAdjReason] = useState('');
  const [adjResult, setAdjResult] = useState<ToolResult | null>(null);
  const [adjLoading, setAdjLoading] = useState(false);

  // ── Retry Payout ──
  const [retryTxId, setRetryTxId] = useState('');
  const [retryResult, setRetryResult] = useState<ToolResult | null>(null);
  const [retryLoading, setRetryLoading] = useState(false);

  // ── Reset PIN ──
  const [pinUserId, setPinUserId] = useState('');
  const [newPin, setNewPin] = useState('');
  const [pinResult, setPinResult] = useState<ToolResult | null>(null);
  const [pinLoading, setPinLoading] = useState(false);

  // ── Unlock Account ──
  const [unlockUserId, setUnlockUserId] = useState('');
  const [unlockResult, setUnlockResult] = useState<ToolResult | null>(null);
  const [unlockLoading, setUnlockLoading] = useState(false);

  // ── Transfer Admin ──
  const [transferGroupId, setTransferGroupId] = useState('');
  const [fromMemberId, setFromMemberId] = useState('');
  const [toMemberId, setToMemberId] = useState('');
  const [transferReason, setTransferReason] = useState('');
  const [transferResult, setTransferResult] = useState<ToolResult | null>(null);
  const [transferLoading, setTransferLoading] = useState(false);

  const handleApiCall = async (
    fn: () => Promise<any>,
    setLoading: (v: boolean) => void,
    setResult: (v: ToolResult) => void,
  ) => {
    setLoading(true);
    try {
      const res = await fn();
      setResult({ success: res.data.success, message: res.data.message || 'Success' });
    } catch (err: any) {
      setResult({ success: false, message: err.response?.data?.message || err.message || 'Request failed' });
    } finally {
      setLoading(false);
    }
  };

  const inputClass = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#0A2463]/20 focus:border-[#0A2463]';
  const btnClass = 'flex items-center justify-center gap-2 px-4 py-2 bg-[#0A2463] text-white rounded-lg text-sm font-medium hover:bg-[#0A2463]/90 transition-colors disabled:opacity-50';

  return (
    <div>
      <div className="flex items-center gap-3 mb-8">
        <Wrench className="w-7 h-7 text-[#0A2463]" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">SuperAdmin Tools</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manual override tools for recovery scenarios</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Update Transaction Status */}
        <ToolCard title="Update Transaction Status" icon={ArrowLeftRight} color="bg-blue-50 text-blue-700">
          {txResult && <ResultBanner result={txResult} onDismiss={() => setTxResult(null)} />}
          <form onSubmit={(e) => { e.preventDefault(); handleApiCall(() => overrideApi.updateTransactionStatus(txId, { status: txStatus, reason: txReason }), setTxLoading, setTxResult); }} className="space-y-3">
            <input placeholder="Transaction ID" value={txId} onChange={e => setTxId(e.target.value)} className={inputClass} required />
            <select value={txStatus} onChange={e => setTxStatus(e.target.value)} className={inputClass}>
              <option value="COMPLETED">COMPLETED</option>
              <option value="FAILED">FAILED</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="REVERSED">REVERSED</option>
            </select>
            <input placeholder="Reason (min 5 chars)" value={txReason} onChange={e => setTxReason(e.target.value)} className={inputClass} required minLength={5} />
            <button type="submit" disabled={txLoading} className={btnClass}>
              {txLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Update Status
            </button>
          </form>
        </ToolCard>

        {/* Create Adjustment */}
        <ToolCard title="Create Adjustment" icon={DollarSign} color="bg-amber-50 text-amber-700">
          {adjResult && <ResultBanner result={adjResult} onDismiss={() => setAdjResult(null)} />}
          <form onSubmit={(e) => { e.preventDefault(); handleApiCall(() => overrideApi.createAdjustment({ groupId: adjGroupId, memberId: adjMemberId, amount: Number(adjAmount), reason: adjReason }), setAdjLoading, setAdjResult); }} className="space-y-3">
            <input placeholder="Group ID" value={adjGroupId} onChange={e => setAdjGroupId(e.target.value)} className={inputClass} required />
            <input placeholder="Member ID" value={adjMemberId} onChange={e => setAdjMemberId(e.target.value)} className={inputClass} required />
            <input placeholder="Amount (ZAR)" type="number" step="0.01" value={adjAmount} onChange={e => setAdjAmount(e.target.value)} className={inputClass} required />
            <input placeholder="Reason (min 5 chars)" value={adjReason} onChange={e => setAdjReason(e.target.value)} className={inputClass} required minLength={5} />
            <button type="submit" disabled={adjLoading} className={btnClass}>
              {adjLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Create Adjustment
            </button>
          </form>
        </ToolCard>

        {/* Retry Failed Payout */}
        <ToolCard title="Retry Failed Payout" icon={RotateCcw} color="bg-purple-50 text-purple-700">
          {retryResult && <ResultBanner result={retryResult} onDismiss={() => setRetryResult(null)} />}
          <form onSubmit={(e) => { e.preventDefault(); handleApiCall(() => overrideApi.retryPayout(retryTxId), setRetryLoading, setRetryResult); }} className="space-y-3">
            <input placeholder="Payout Transaction ID" value={retryTxId} onChange={e => setRetryTxId(e.target.value)} className={inputClass} required />
            <button type="submit" disabled={retryLoading} className={btnClass}>
              {retryLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Retry Payout
            </button>
          </form>
        </ToolCard>

        {/* Reset Admin PIN */}
        <ToolCard title="Reset User PIN" icon={KeyRound} color="bg-red-50 text-red-700">
          {pinResult && <ResultBanner result={pinResult} onDismiss={() => setPinResult(null)} />}
          <form onSubmit={(e) => { e.preventDefault(); handleApiCall(() => overrideApi.resetAdminPin(pinUserId, { newPin }), setPinLoading, setPinResult); }} className="space-y-3">
            <input placeholder="User ID" value={pinUserId} onChange={e => setPinUserId(e.target.value)} className={inputClass} required />
            <input placeholder="New PIN (5 digits)" value={newPin} onChange={e => setNewPin(e.target.value)} className={inputClass} required pattern="\d{5}" maxLength={5} />
            <button type="submit" disabled={pinLoading} className={btnClass}>
              {pinLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Reset PIN
            </button>
          </form>
        </ToolCard>

        {/* Unlock Account */}
        <ToolCard title="Unlock Account" icon={Unlock} color="bg-emerald-50 text-emerald-700">
          {unlockResult && <ResultBanner result={unlockResult} onDismiss={() => setUnlockResult(null)} />}
          <form onSubmit={(e) => { e.preventDefault(); handleApiCall(() => overrideApi.unlockAccount(unlockUserId), setUnlockLoading, setUnlockResult); }} className="space-y-3">
            <input placeholder="User ID" value={unlockUserId} onChange={e => setUnlockUserId(e.target.value)} className={inputClass} required />
            <button type="submit" disabled={unlockLoading} className={btnClass}>
              {unlockLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Unlock Account
            </button>
          </form>
        </ToolCard>

        {/* Transfer Group Admin */}
        <ToolCard title="Transfer Group Admin" icon={UserCog} color="bg-teal-50 text-teal-700">
          {transferResult && <ResultBanner result={transferResult} onDismiss={() => setTransferResult(null)} />}
          <form onSubmit={(e) => { e.preventDefault(); handleApiCall(() => overrideApi.transferGroupAdmin(transferGroupId, { fromMemberId, toMemberId, reason: transferReason }), setTransferLoading, setTransferResult); }} className="space-y-3">
            <input placeholder="Group ID" value={transferGroupId} onChange={e => setTransferGroupId(e.target.value)} className={inputClass} required />
            <input placeholder="Current Admin Member ID" value={fromMemberId} onChange={e => setFromMemberId(e.target.value)} className={inputClass} required />
            <input placeholder="New Admin Member ID" value={toMemberId} onChange={e => setToMemberId(e.target.value)} className={inputClass} required />
            <input placeholder="Reason" value={transferReason} onChange={e => setTransferReason(e.target.value)} className={inputClass} required />
            <button type="submit" disabled={transferLoading} className={btnClass}>
              {transferLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : null} Transfer Admin
            </button>
          </form>
        </ToolCard>
      </div>
    </div>
  );
}
