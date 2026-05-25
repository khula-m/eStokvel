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
} from 'lucide-react';
import { useState } from 'react';

// Grouped so the sidebar reads as workflow phases rather than a flat list.
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
    <div className="min-h-screen flex bg-slate-50">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar — single solid navy, no gradients, white type. Reads as a
          calm production panel rather than a marketing surface. */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-50 w-64 transform transition-transform duration-200 ease-out ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        <div className="flex flex-col h-full bg-[#0A2463] text-white">
          {/* Brand block */}
          <div className="flex items-center gap-3 px-5 py-5 border-b border-white/10">
            <div className="w-9 h-9 rounded-lg bg-white/10 border border-white/15 flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-[15px] font-semibold tracking-tight leading-tight">eStokvel</h1>
              <p className="text-[11px] text-white/45 tracking-wider uppercase mt-0.5">SuperAdmin</p>
            </div>
            <button
              className="lg:hidden text-white/50 hover:text-white p-1 rounded-md hover:bg-white/5 transition-colors"
              onClick={() => setSidebarOpen(false)}
              aria-label="Close sidebar"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Navigation */}
          <nav className="flex-1 px-3 py-5 overflow-y-auto space-y-6">
            {navGroups.map(group => (
              <div key={group.label}>
                <p className="px-3 mb-1.5 text-[10px] font-semibold text-white/40 tracking-[0.12em] uppercase">
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
                        `group relative flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                          isActive
                            ? 'bg-white/10 text-white'
                            : 'text-white/65 hover:bg-white/5 hover:text-white'
                        }`
                      }
                    >
                      {({ isActive }) => (
                        <>
                          {isActive && (
                            <span className="absolute left-0 top-1.5 bottom-1.5 w-0.5 rounded-r bg-white" />
                          )}
                          <Icon className="w-[18px] h-[18px] shrink-0" />
                          <span>{label}</span>
                        </>
                      )}
                    </NavLink>
                  ))}
                </div>
              </div>
            ))}
          </nav>

          {/* User footer */}
          <div className="px-3 py-4 border-t border-white/10">
            <div className="flex items-center gap-3 px-2 py-2">
              <div className="w-9 h-9 rounded-full bg-white/10 border border-white/15 flex items-center justify-center text-sm font-semibold">
                {user?.fullName?.charAt(0).toUpperCase() || 'S'}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.fullName}</p>
                <p className="text-[11px] text-white/45 truncate">{user?.email}</p>
              </div>
            </div>
            <button
              onClick={logout}
              className="mt-2 flex items-center justify-center gap-2 w-full px-3 py-2 text-sm font-medium text-white/70 hover:text-white bg-white/5 hover:bg-white/10 rounded-md transition-colors"
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
        <header className="lg:hidden flex items-center gap-4 px-4 py-3 bg-white border-b border-slate-200 sticky top-0 z-30">
          <button
            onClick={() => setSidebarOpen(true)}
            className="text-slate-600 hover:text-slate-900 p-1 rounded-md hover:bg-slate-100 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="w-6 h-6" />
          </button>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#0A2463]" />
            <span className="font-semibold text-[#0A2463] text-sm">eStokvel SuperAdmin</span>
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
