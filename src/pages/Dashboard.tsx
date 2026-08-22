import { useMemo } from 'react';
import {
  Building2, Users, Home, MessageSquare, ClipboardList, FolderKanban,
  AlertTriangle, FileText, CalendarDays, TrendingUp, Smile,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { useFetch } from '../hooks/useFetch';
import { Card, StatCard, Spinner, StatusBadge, PageHeader, formatDate } from '../components/ui';
import { Link } from 'react-router-dom';

function DashboardCharts({ data }: { data: any }) {
  const { t } = useTranslation();
  const charts = data.charts;
  if (!charts) return null;
  const statusRows = (
    [
      [t('dashboard.chartComplaints'), charts.complaintsByStatus],
      [t('dashboard.chartRequests'), charts.requestsByStatus],
      [t('dashboard.chartProjects'), charts.projectsByStatus],
    ] as [string, Record<string, number>][]
  ).filter(([, c]) => c && Object.keys(c).length > 0);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
      {statusRows.map(([label, counts]) => (
        <Card key={label} title={label}>
          <div className="space-y-2">
            {Object.entries(counts).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <StatusBadge status={k} />
                <span className="font-semibold text-slate-700">{String(v)}</span>
              </div>
            ))}
          </div>
        </Card>
      ))}

      <Card title={t('dashboard.last30Days')} subtitle={t('dashboard.complaintsPerDay')} className="lg:col-span-2">
        <div className="flex items-end gap-1 h-32">
          {charts.complaintsLast30Days?.map((d: any) => (
            <div key={d.date} className="flex-1 flex flex-col justify-end items-center group" title={`${d.date}: ${d.count}`}>
              <span className="text-[9px] text-slate-400 mb-0.5">{d.count > 0 ? d.count : ''}</span>
              <div
                className="w-full rounded-t bg-brand-700/80 group-hover:bg-brand-700 transition-colors"
                style={{ height: `${Math.max(4, (d.count / (Math.max(...charts.complaintsLast30Days.map((x: any) => x.count)) || 1)) * 100)}%` }}
              />
            </div>
          ))}
        </div>
      </Card>

      {charts.complaintsByCategory && Object.keys(charts.complaintsByCategory).length > 0 && (
        <Card title={t('dashboard.complaintsByCategory')}>
          <div className="space-y-2">
            {Object.entries(charts.complaintsByCategory).map(([k, v]) => (
              <div key={k} className="flex items-center justify-between text-sm">
                <span className="text-slate-600">{k}</span>
                <span className="font-semibold text-slate-700">{String(v)}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data, loading } = useFetch<any>('/dashboard');

  const isAdmin = (user?.level ?? 6) < 6;
  const level = user?.level ?? 6;

  const stats = data?.stats;
  const performance = data?.performance;
  const alerts = data?.alerts;

  const statCards = useMemo(() => {
    if (!stats) return [];
    const base: any[] = [];
    if (level === 1 && stats.districts !== undefined) base.push({ label: t('dashboard.statDistricts'), value: stats.districts, icon: <Building2 size={18} />, accent: 'brand' });
    if (level <= 3) base.push({ label: t('dashboard.statSectors'), value: stats.sectors, icon: <Building2 size={18} />, accent: 'brand' });
    if (level <= 4) base.push({ label: t('dashboard.statCells'), value: stats.cells, icon: <Building2 size={18} />, accent: 'brand' });
    base.push({ label: t('dashboard.statVillages'), value: stats.villages, icon: <Home size={18} />, accent: 'brand' });
    base.push({ label: t('dashboard.statHouseholds'), value: stats.households, icon: <Home size={18} />, accent: 'purple' });
    base.push({ label: t('dashboard.statPopulation'), value: stats.population, icon: <Users size={18} />, accent: 'green' });
    base.push({ label: t('dashboard.statOpenComplaints'), value: stats.openComplaints, icon: <MessageSquare size={18} />, accent: 'red' });
    base.push({ label: t('dashboard.statResolvedComplaints'), value: stats.resolvedComplaints, icon: <MessageSquare size={18} />, accent: 'green' });
    base.push({ label: t('dashboard.statPendingRequests'), value: stats.openRequests, icon: <ClipboardList size={18} />, accent: 'amber' });
    base.push({ label: t('dashboard.statActiveProjects'), value: stats.activeProjects, icon: <FolderKanban size={18} />, accent: 'brand' });
    base.push({ label: t('dashboard.statAvgProgress'), value: `${stats.avgProgress}%`, icon: <TrendingUp size={18} />, accent: 'green' });
    base.push({ label: t('dashboard.statCommunityEvents'), value: stats.events, icon: <CalendarDays size={18} />, accent: 'purple' });
    if (stats.avgSatisfaction !== undefined) {
      base.push({ label: t('dashboard.statSatisfaction'), value: `${stats.avgSatisfaction}%`, icon: <Smile size={18} />, accent: 'green' });
    }
    return base;
  }, [stats, level, t]);

  if (loading) return <Spinner />;

  return (
    <div>
      <PageHeader
        title={isAdmin ? t('dashboard.adminTitle') : t('dashboard.citizenTitle')}
        subtitle={isAdmin ? t('dashboard.adminSubtitle') : t('dashboard.citizenSubtitle')}
      />

      {!isAdmin && data?.recent && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 mb-6">
          <Card title={t('dashboard.myRecentComplaints')}>
            {data.recent.complaints?.length === 0 && <p className="text-sm text-slate-400">{t('dashboard.noComplaints')}</p>}
            {data.recent.complaints?.map((c: any) => (
              <Link key={c.id} to={`/complaints/${c.id}`} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-1 rounded">
                <div>
                  <div className="text-sm font-medium text-slate-700">{c.title}</div>
                  <div className="text-[11px] text-slate-400">{formatDate(c.createdAt)}</div>
                </div>
                <StatusBadge status={c.status} />
              </Link>
            ))}
          </Card>
          <Card title={t('dashboard.upcomingEvents')}>
            {data.recent.events?.length === 0 && <p className="text-sm text-slate-400">{t('dashboard.noEvents')}</p>}
            {data.recent.events?.map((e: any) => (
              <div key={e.id} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                <div>
                  <div className="text-sm font-medium text-slate-700">{e.title}</div>
                  <div className="text-[11px] text-slate-400">{formatDate(e.eventDate)}</div>
                </div>
                <StatusBadge status={e.status} />
              </div>
            ))}
          </Card>
        </div>
      )}

      {isAdmin && alerts && alerts.length > 0 && (
        <div className="mb-6 rounded-xl border border-red-200 bg-red-50 p-4">
          <div className="flex items-center gap-2 text-red-700 font-semibold text-sm mb-2">
            <AlertTriangle size={16} /> {t('dashboard.urgentAlerts', { count: alerts.length })}
          </div>
          <div className="space-y-1">
            {alerts.map((a: any) => (
              <Link key={a.id} to={`/complaints/${a.id}`} className="block text-sm text-red-800/80 hover:underline">
                {a.title} — <span className="text-red-500">{a.village?.name}</span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 mb-6">
            {statCards.map((s) => <StatCard key={s.label} {...s} />)}
          </div>

          <DashboardCharts data={data} />
        </>
      )}

      {performance && performance.length > 0 && (
        <Card title={level === 1 ? t('dashboard.districtPerformance') : t('dashboard.sectorPerformance')} className="mt-6">
          <div className="overflow-x-auto -mx-5 px-5">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 text-left text-xs uppercase text-slate-500">
                  <th className="py-2 pr-4">{t('dashboard.perfUnit')}</th>
                  <th className="py-2 pr-4">{t('dashboard.perfComplaints')}</th>
                  <th className="py-2 pr-4">{t('dashboard.perfResolutionRate')}</th>
                  <th className="py-2 pr-4">{t('dashboard.perfRequests')}</th>
                  <th className="py-2 pr-4">{t('dashboard.perfProjects')}</th>
                  <th className="py-2 pr-4">{t('dashboard.perfAvgProgress')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {performance.map((p: any) => (
                  <tr key={p.id}>
                    <td className="py-2.5 pr-4 font-medium text-slate-700">{p.name}</td>
                    <td className="py-2.5 pr-4">{p.complaints}</td>
                    <td className="py-2.5 pr-4">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-24 bg-slate-100 rounded-full overflow-hidden">
                          <div className="h-full bg-emerald-500" style={{ width: `${p.resolutionRate}%` }} />
                        </div>
                        {p.resolutionRate}%
                      </div>
                    </td>
                    <td className="py-2.5 pr-4">{p.requests}</td>
                    <td className="py-2.5 pr-4">{p.projects}</td>
                    <td className="py-2.5 pr-4">{p.avgProgress}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}

      {isAdmin && data?.recent && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mt-6">
          <Card title={t('dashboard.recentComplaints')}>
            {data.recent.complaints?.map((c: any) => (
              <Link key={c.id} to={`/complaints/${c.id}`} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-1 rounded">
                <div>
                  <div className="text-sm font-medium text-slate-700">{c.title}</div>
                  <div className="text-[11px] text-slate-400">{c.village?.name} · {formatDate(c.createdAt)}</div>
                </div>
                <StatusBadge status={c.status} />
              </Link>
            ))}
          </Card>
          <Card title={t('dashboard.recentReports')}>
            {data.recent.reports?.map((r: any) => (
              <Link key={r.id} to={`/reports/${r.id}`} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0 hover:bg-slate-50 px-1 rounded">
                <div>
                  <div className="text-sm font-medium text-slate-700">{r.title}</div>
                  <div className="text-[11px] text-slate-400">{r.author?.fullName} · {formatDate(r.createdAt)}</div>
                </div>
                <StatusBadge status={r.status} />
              </Link>
            ))}
          </Card>
        </div>
      )}
    </div>
  );
}
