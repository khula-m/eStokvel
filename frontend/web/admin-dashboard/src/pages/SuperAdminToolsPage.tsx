import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { systemApi } from '../api';
import {
  Wrench,
  ArrowLeftRight,
  DollarSign,
  RotateCcw,
  KeyRound,
  Unlock,
  UserCog,
  ExternalLink,
  ShieldCheck,
  ShieldAlert,
  ShieldQuestion,
  Users,
  Clock,
} from 'lucide-react';

const tools = [
  {
    title: 'Reset PIN',
    description: 'Reset a user\'s login PIN from their row in the table.',
    icon: KeyRound,
    color: 'bg-amber-50 text-amber-700',
    location: 'Members or Admins page',
    link: '/members',
  },
  {
    title: 'Unlock Account',
    description: 'Unlock a locked user account directly from the user list.',
    icon: Unlock,
    color: 'bg-blue-50 text-blue-700',
    location: 'Members or Admins page',
    link: '/members',
  },
  {
    title: 'Update Transaction Status',
    description: 'Change the status of any transaction from its row.',
    icon: ArrowLeftRight,
    color: 'bg-purple-50 text-purple-700',
    location: 'Transactions page',
    link: '/transactions',
  },
  {
    title: 'Retry Failed Payout',
    description: 'Retry a failed or pending payout from the transaction row.',
    icon: RotateCcw,
    color: 'bg-red-50 text-red-700',
    location: 'Transactions page (PAYOUT rows)',
    link: '/transactions',
  },
  {
    title: 'Create Adjustment',
    description: 'Create a balance adjustment for a group member.',
    icon: DollarSign,
    color: 'bg-emerald-50 text-emerald-700',
    location: 'Group Detail page',
    link: '/groups',
  },
  {
    title: 'Transfer Group Admin',
    description: 'Transfer the admin role between group members.',
    icon: UserCog,
    color: 'bg-teal-50 text-teal-700',
    location: 'Group Detail page',
    link: '/groups',
  },
];

interface VerificationStats {
  verified: number;
  pending: number;
  unverified: number;
  failed: number;
}

export default function SuperAdminToolsPage() {
  const [verificationStats, setVerificationStats] = useState<VerificationStats | null>(null);

  useEffect(() => {
    systemApi.getOverview().then(res => {
      const d = res.data?.data;
      if (d?.verification) setVerificationStats(d.verification);
    }).catch(() => {});
  }, []);

  return (
    <div>
      <div className="flex items-center gap-3 mb-2">
        <Wrench className="w-7 h-7 text-[#0A2463]" />
        <h1 className="text-2xl font-bold text-gray-900">SuperAdmin Tools</h1>
      </div>
      <p className="text-sm text-gray-500 mb-8">
        All admin actions are available <strong>inline</strong> on data pages.
        Click the <strong>3-dot menu</strong> (&#8942;) on any row to take action.
      </p>

      {/* Identity Verification Overview */}
      {verificationStats && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Identity Verification</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-green-50"><ShieldCheck className="w-4 h-4 text-green-600" /></div>
                <span className="text-xs font-medium text-gray-500">Verified</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{verificationStats.verified}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-blue-50"><Clock className="w-4 h-4 text-blue-600" /></div>
                <span className="text-xs font-medium text-gray-500">Pending</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{verificationStats.pending}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-gray-50"><ShieldQuestion className="w-4 h-4 text-gray-400" /></div>
                <span className="text-xs font-medium text-gray-500">Unverified</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{verificationStats.unverified}</p>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="p-1.5 rounded-lg bg-red-50"><ShieldAlert className="w-4 h-4 text-red-500" /></div>
                <span className="text-xs font-medium text-gray-500">Failed</span>
              </div>
              <p className="text-2xl font-bold text-gray-900">{verificationStats.failed}</p>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions Grid */}
      <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-3">Quick Actions</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {tools.map((tool) => (
          <Link
            key={tool.title}
            to={tool.link}
            className="group bg-white rounded-xl border border-gray-100 shadow-sm p-5 hover:border-[#0A2463]/30 hover:shadow-md transition-all"
          >
            <div className={`inline-flex items-center justify-center w-10 h-10 rounded-lg mb-3 ${tool.color}`}>
              <tool.icon className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-gray-900 mb-1">{tool.title}</h3>
            <p className="text-sm text-gray-500 mb-3">{tool.description}</p>
            <div className="flex items-center gap-1.5 text-xs font-medium text-[#0A2463] group-hover:underline">
              <ExternalLink className="w-3.5 h-3.5" />
              Go to {tool.location}
            </div>
          </Link>
        ))}
      </div>

      {/* How Verification Works */}
      <div className="mt-8 bg-white rounded-xl border border-gray-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShieldCheck className="w-5 h-5 text-[#0A2463]" />
          <h2 className="font-semibold text-gray-900">How Identity Verification Works</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 text-sm text-gray-600">
          <div className="flex items-start gap-2">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-[#0A2463] text-white text-xs flex items-center justify-center shrink-0 font-bold">1</span>
            <p>Member registers or logs in for the first time. They are prompted to enter their SA ID number.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-[#0A2463] text-white text-xs flex items-center justify-center shrink-0 font-bold">2</span>
            <p>The ID number is validated locally with a Luhn check, then hashed and stored securely. It is never stored in plain text.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-[#0A2463] text-white text-xs flex items-center justify-center shrink-0 font-bold">3</span>
            <p>The ID is submitted to <strong>Smile Identity</strong> for async KYC verification. Status moves to <em>Pending</em>.</p>
          </div>
          <div className="flex items-start gap-2">
            <span className="mt-0.5 w-5 h-5 rounded-full bg-[#0A2463] text-white text-xs flex items-center justify-center shrink-0 font-bold">4</span>
            <p>Once verified, the member's status moves to <em>Verified</em>. Payouts are gated to verified members only.</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2 px-3 py-2 bg-amber-50 rounded-lg text-sm text-amber-800">
          <Users className="w-4 h-4 shrink-0" />
          <p>Admins <strong>never</strong> see member ID numbers. Members enter their own ID on first login.</p>
        </div>
      </div>
    </div>
  );
}
