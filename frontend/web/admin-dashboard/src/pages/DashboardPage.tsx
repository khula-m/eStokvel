import { useState, useEffect } from 'react';
import { systemApi } from '../api';
import {
  Users,
  Building2,
  Coins,
  TrendingUp,
  Activity,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';

interface OverviewData {
  // Backend field names
  admins?: number;
  groups?: number;
  members?: number;
  totalCollected?: number;
  totalTransactions?: number;
  // Aliased field names (legacy)
  totalUsers?: number;
  totalGroups?: number;
  totalContributions?: number;
  activeGroups?: number;
  pendingTransactions?: number;
}

export default function DashboardPage() {
  const [data, setData] = useState<OverviewData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchData = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await systemApi.getOverview();
      if (res.data.success) {
        setData(res.data.data || res.data);
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

    </div>
  );
}
