import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import {
  LayoutDashboard,
  Users,
  UserCheck,
  Building2,
  ArrowLeftRight,
  LogOut,
  Shield,
  Menu,
  X,
  Wrench,
  ScrollText,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';

// Grouped so the sidebar reads as workflow phases (oversee → manage → operate)
// rather than a flat list of routes.
const navGroups: { label: string; items: { to: string; icon: typeof Shield; label: string; end?: boolean }[] }[] = [
  {
    label: 'Overview',
    items: [
      { to: '/', icon: LayoutDashboard, label: 'Dashboard', end: true },
    ],
  },
  {
    label: 'People',
    items: [
      { to: '/admins', icon: Users, label: 'Admins' },
      { to: '/members', icon: UserCheck, label: 'Members' },
    ],
  },
  {
    label: 'Operations',
    items: [
      { to: '/groups', icon: Building2, label: 'Groups' },
      { to: '/transactions', icon: ArrowLeftRight, label: 'Transactions' },
    ],
  },
  {
    label: 'System',
    items: [
      { to: '/tools', icon: Wrench, label: 'Tools' },
      { to: '/audit-logs', icon: ScrollText, label: 'Audit Logs' },
    ],
  },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex bg-gradient-to-br from-slate-50 via-slate-50 to-blue-50/30">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — gradient navy, glass accents */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-72 transform transition-transform duration-300 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="relative flex flex-col h-full bg-gradient-to-b from-[#0A2463] via-[#0F3285] to-[#0A2463] text-white overflow-hidden">
          {/* Decorative glow circles */}
          <div className="absolute -top-20 -right-16 w-64 h-64 rounded-full bg-[#D4A017]/10 blur-3xl pointer-events-none" />
          <div className="absolute bottom-40 -left-20 w-56 h-56 rounded-full bg-blue-400/10 blur-3xl pointer-events-none" />

          {/* Brand block */}
          <div className="relative flex items-center gap-3 px-6 py-6">
            <div className="relative">
              <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#D4A017] to-[#B8860B] flex items-center justify-center shadow-lg shadow-amber-500/30">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0A2463]" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-lg font-bold tracking-tight">eStokvel</h1>
              <p className="text-xs text-white/55 tracking-wider uppercase">SuperAdmin</p>
            </div>
            <button
              className="lg:hidden text-white/60 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation — grouped sections */}
          <nav className="relative flex-1 px-3 pb-4 overflow-y-auto space-y-6">
            {navGroups.map(group => (
              <div key={group.label}>
                <p className="px-4 mb-2 text-[10px] font-bold text-white/40 tracking-[0.15em] uppercase">
                  {group.label}
                </p>
                <div className="space-y-0.5">
                  {group.items.map(({ to, icon: Icon, label, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      onClick={() => setSidebarOpen(false)}
                      className={({ isActive }) =>
                        `group relative flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          isActive
                            ? 'bg-white/15 text-white shadow-sm'
                            : 'text-white/65 hover:bg-white/8 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 rounded-r-full bg-[#D4A017]" />
                          )}
                          <Icon className={`w-[18px] h-[18px] shrink-0 transition-transform group-hover:scale-110 ${isActive ? 'text-[#D4A017]' : ''}`} />
                          <span className="flex-1">{label}</span>
                          {isActive && <ChevronRight className="w-4 h-4 text-white/40" />}
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* User card */}
          <div className="relative px-4 py-4 border-t border-white/10">
            <div className="flex items-center gap-3 mb-3 p-2 rounded-xl bg-white/5">
              <div className="relative">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#D4A017] to-[#B8860B] flex items-center justify-center text-sm font-bold shadow-md">
                  {user?.fullName?.charAt(0).toUpperCase() || 'S'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0F3285]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{user?.fullName}</p>
                <p className="text-xs text-white/50 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="flex items-center justify-center gap-2 w-full px-3 py-2.5 text-sm font-medium text-white/75 hover:text-white bg-white/5 hover:bg-red-500/20 hover:text-red-200 border border-white/10 hover:border-red-400/30 rounded-xl transition-all"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top bar (mobile only) */}
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 bg-white/80 backdrop-blur border-b border-slate-200/70 shadow-sm sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-600 hover:text-slate-900 p-1 rounded-lg hover:bg-slate-100 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#0A2463] to-[#1A43A8] flex items-center justify-center">
              <Shield className="w-4 h-4 text-white" />
            </div>
            <span className="font-bold text-[#0A2463]">eStokvel SuperAdmin</span>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-4 lg:p-8 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
