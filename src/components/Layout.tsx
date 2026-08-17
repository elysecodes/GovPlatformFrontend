import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard, MessageSquare, FileText, Megaphone, FolderKanban, CalendarDays,
  Users, Home, Bell, LogOut, ShieldCheck, Building2, ClipboardList, ScrollText,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { api } from '../lib/api';
import { LanguageSwitcher } from './ui';

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
    { to: '/households', label: t('nav.households'), icon: <Home size={17} />, roles: ['SUPER_ADMIN', 'PROVINCE_ADMIN', 'DISTRICT_ADMIN', 'SECTOR_ADMIN', 'CELL_ADMIN', 'VILLAGE_ADMIN'] },
    { to: '/citizens', label: t('nav.citizens'), icon: <Users size={17} />, roles: ADMIN_ROLES },
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
  const [scopeLabel, setScopeLabel] = useState<string>('');
  const [unread, setUnread] = useState(0);

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
    }
  }, [user, t]);

  const role = user?.role ?? 'CITIZEN';
  const items = navItems(role, t);

  async function handleLogout() {
    const refreshToken = localStorage.getItem('gov_refresh_token') ?? undefined;
    await logout(refreshToken);
    navigate('/login');
  }

  return (
    <div className="flex min-h-screen">
      {/* Sidebar */}
      <aside className="w-60 shrink-0 bg-brand-900 text-white flex flex-col fixed inset-y-0">
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
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
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
      <div className="flex-1 ml-60 flex flex-col min-w-0">
        <header className="sticky top-0 z-30 bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between gap-4">
          <div>
            <div className="text-sm font-medium text-slate-700">{t(`role.${role}`)}</div>
            <div className="text-[11px] text-slate-400">{scopeLabel}</div>
          </div>
          <div className="flex items-center gap-2">
            <LanguageSwitcher />
          </div>
        </header>
        <main className="flex-1 p-6 max-w-[1400px] w-full">{children}</main>
      </div>
    </div>
  );
}
