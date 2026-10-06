import { ReactNode, useEffect, useState } from 'react';
import { NavLink, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, FileText, Megaphone, FolderKanban, CalendarDays, CalendarRange,
  Users, Home, Bell, LogOut, ShieldCheck, Building2, ClipboardList, ScrollText, Menu,
  CheckSquare, Landmark, Handshake,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { connectRealtime, disconnectRealtime, RealtimeNotification } from '../lib/realtime';
import { LanguageSwitcher, cx } from './ui';
import { X } from 'lucide-react';

const ALL_ROLES = ['SUPER_ADMIN', 'PROVINCE_ADMIN', 'DISTRICT_ADMIN', 'SECTOR_ADMIN', 'CELL_ADMIN', 'VILLAGE_ADMIN', 'CITIZEN'];
const ADMIN_ROLES = ['SUPER_ADMIN', 'PROVINCE_ADMIN', 'DISTRICT_ADMIN', 'SECTOR_ADMIN', 'CELL_ADMIN', 'VILLAGE_ADMIN'];

function navItems(role: string, t: (key: string) => string) {
  const items: { to: string; label: string; icon: ReactNode; roles: string[] }[] = [
    { to: '/', label: t('nav.dashboard'), icon: <LayoutDashboard size={17} />, roles: ALL_ROLES },
    { to: '/complaints', label: t('nav.complaints'), icon: <MessageSquare size={17} />, roles: ALL_ROLES },
    { to: '/requests', label: t('nav.requests'), icon: <ClipboardList size={17} />, roles: ALL_ROLES },
    { to: '/reports', label: t('nav.reports'), icon: <FileText size={17} />, roles: ADMIN_ROLES },
    { to: '/announcements', label: t('nav.announcements'), icon: <Megaphone size={17} />, roles: ALL_ROLES },
    { to: '/projects', label: t('nav.projects'), icon: <FolderKanban size={17} />, roles: ALL_ROLES },
    { to: '/events', label: t('nav.events'), icon: <CalendarDays size={17} />, roles: ALL_ROLES },
    { to: '/agenda', label: t('nav.agenda'), icon: <CalendarRange size={17} />, roles: ALL_ROLES },
    { to: '/households', label: t('nav.households'), icon: <Home size={17} />, roles: ['SUPER_ADMIN', 'PROVINCE_ADMIN', 'DISTRICT_ADMIN', 'SECTOR_ADMIN', 'CELL_ADMIN', 'VILLAGE_ADMIN'] },
    { to: '/citizens', label: t('nav.citizens'), icon: <Users size={17} />, roles: ADMIN_ROLES },
    { to: '/tasks', label: t('nav.tasks'), icon: <CheckSquare size={17} />, roles: ADMIN_ROLES },
    { to: '/meetings', label: t('nav.meetings'), icon: <Landmark size={17} />, roles: ALL_ROLES },
    { to: '/cooperatives', label: t('nav.cooperatives'), icon: <Handshake size={17} />, roles: ADMIN_ROLES },
    { to: '/users', label: t('nav.users'), icon: <Building2 size={17} />, roles: ['SUPER_ADMIN', 'PROVINCE_ADMIN', 'DISTRICT_ADMIN', 'SECTOR_ADMIN', 'CELL_ADMIN'] },
    { to: '/audit-logs', label: t('nav.auditLogs'), icon: <ScrollText size={17} />, roles: ['SUPER_ADMIN', 'PROVINCE_ADMIN', 'DISTRICT_ADMIN', 'SECTOR_ADMIN'] },
    { to: '/notifications', label: t('nav.notifications'), icon: <Bell size={17} />, roles: ALL_ROLES },
    { to: '/profile', label: t('nav.profile'), icon: <ShieldCheck size={17} />, roles: ALL_ROLES },
  ];
  return items.filter((i) => i.roles.includes(role));
}

export function Layout({ children }: { children: ReactNode }) {
  const { user, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [scopeLabel, setScopeLabel] = useState<string>('');
  const [unread, setUnread] = useState(0);
  const [toast, setToast] = useState<RealtimeNotification | null>(null);

  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (user) {
      void api.get('/auth/me').then((m) => {
        const me = m.data;
        const chain = me.scope as any;
        const p = chain?.province?.name;
        const d = chain?.district?.name;
        const s = chain?.sector?.name;
        const c = chain?.cell?.name;
        const v = chain?.village?.name;
        if (user.level === 1 && p) setScopeLabel(`${t('common.appName')} / ${p}`);
        else if (user.level === 2 && p && d) setScopeLabel(`${p} / ${d}`);
        else if (user.level === 3 && p && d && s) setScopeLabel(`${p} / ${d} / ${s}`);
        else if (user.level === 4 && p && d && s && c) setScopeLabel(`${p} / ${d} / ${s} / ${c}`);
        else if (user.level === 5 && p && d && s && c && v) setScopeLabel(`${p} / ${d} / ${s} / ${c} / ${v}`);
        else if (user.level === 6 && v) setScopeLabel(`${v} · ${c} · ${s} · ${d} · ${p}`);
        else setScopeLabel(t('common.appName'));
      }).catch(() => {});
      api.get('/notifications/unread-count').then((r) => setUnread(r.data.count)).catch(() => {});

      connectRealtime({
        onUnread: (count) => setUnread(count),
        onNotification: (n) => {
          setUnread((u) => u + 1);
          setToast(n);
          window.dispatchEvent(new Event('realtime-notification'));
        },
      });
    }
    return () => disconnectRealtime();
  }, [user, t]);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => setToast(null), 6000);
    return () => clearTimeout(timer);
  }, [toast]);

  const role = user?.role ?? 'CITIZEN';
  const items = navItems(role, t);

  async function handleLogout() {
    disconnectRealtime();
    const refreshToken = localStorage.getItem('gov_refresh_token') ?? undefined;
    await logout(refreshToken);
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cx(
          'fixed inset-y-0 left-0 z-40 w-60 shrink-0 bg-brand-900 text-white flex flex-col transition-transform duration-200 md:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/10 flex items-center justify-center">
              <ShieldCheck size={18} />
            </div>
            <div>
              <div className="font-bold text-sm leading-tight">{t('common.appName')}</div>
              <div className="text-[10px] text-white/50">{t('common.appSubtitle')}</div>
            </div>
          </div>
        </div>
        <nav className="sidebar-scroll flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition-colors ${
                  isActive ? 'bg-white/15 text-white font-medium' : 'text-white/70 hover:bg-white/10 hover:text-white'
                }`
              }
            >
              {item.icon}
              <span className="flex-1">{item.label}</span>
              {item.to === '/notifications' && unread > 0 && (
                <span className="bg-red-500 text-white text-[10px] rounded-full px-1.5">{unread}</span>
              )}
            </NavLink>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-full bg-white/15 flex items-center justify-center text-sm font-semibold">
              {user?.fullName?.[0] ?? 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-sm font-medium truncate">{user?.fullName}</div>
              <div className="text-[10px] text-white/50 truncate">{t(`role.${role}`)}</div>
            </div>
            <button onClick={handleLogout} title={t('nav.logout')} className="ml-auto text-white/50 hover:text-white">
              <LogOut size={16} />
            </button>
          </div>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 md:ml-60 flex flex-col min-w-0">
        <header className="sticky top-0 z-20 bg-white border-b border-slate-200 px-4 md:px-6 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden text-slate-500 hover:text-slate-700 p-1 -ml-1"
              aria-label={t('layout.openMenu')}
            >
              <Menu size={20} />
            </button>
            <div className="min-w-0">
              <div className="text-sm font-medium text-slate-700 truncate">{t(`role.${role}`)}</div>
              <div className="text-[11px] text-slate-400 truncate">{scopeLabel}</div>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LanguageSwitcher />
          </div>
        </header>
        <main className="flex-1 p-4 md:p-6 max-w-[1400px] w-full">{children}</main>
      </div>

      {/* Real-time notification toast */}
      {toast && (
        <div className="fixed top-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-slate-200 bg-white shadow-lg">
          <div className="flex items-start gap-3 p-3">
            <div className="mt-1 h-2 w-2 rounded-full bg-brand-600 shrink-0" />
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-slate-800 truncate">{toast.title}</span>
                <button onClick={() => setToast(null)} className="text-slate-400 hover:text-slate-600 shrink-0">
                  <X size={14} />
                </button>
              </div>
              <p className="text-xs text-slate-600 mt-0.5 line-clamp-2">{toast.content}</p>
              {toast.link && (
                <Link to={toast.link} onClick={() => setToast(null)} className="text-xs text-brand-700 hover:underline mt-1 inline-block">{t('layout.open')}</Link>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
