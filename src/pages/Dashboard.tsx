import { useMemo, type ReactNode } from 'react';
import {
  Users, Home, MessageSquare, ClipboardList, FolderKanban, CheckCircle2,
  AlertTriangle, FileText, CalendarDays, TrendingUp, Smile, Target, Wallet,
  CreditCard, ThumbsUp, Hourglass, FolderOpen, Globe, Building2, MapPin,
  MapPinned, AlertOctagon, Flag, ClipboardCheck, MessagesSquare, Files, Activity,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router-dom';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, BarChart, Bar,
} from 'recharts';
import { useAuth } from '../lib/auth';
import { useFetch } from '../hooks/useFetch';
import { KpiCard, TrendChip, ScoreGauge, StatusBadge, formatDate, cx } from '../components/ui';

const STATUS_COLORS: Record<string, string> = {
  SUBMITTED: '#3b82f6',
  RECEIVED: '#8b5cf6',
  IN_PROGRESS: '#f59e0b',
  RESOLVED: '#10b981',
  CLOSED: '#64748b',
};

const PROJECT_COLORS: Record<string, string> = {
  PLANNED: '#94a3b8',
  IN_PROGRESS: '#1a7bdb',
  COMPLETED: '#10b981',
};

const SERIES_COLORS = { complaints: '#1a7bdb', requests: '#f59e0b' };

function sum(arr: number[]): number {
  return arr.reduce((s, n) => s + n, 0);
}

/* ---------------------------------------------------------------- */
/*  Dynamic metric registry: every stats field the API returns gets  */
/*  a card automatically. Unknown/new fields are still styled via a  */
/*  sensible fallback so the dashboard never becomes static.        */
/* ---------------------------------------------------------------- */

type Formatter = (v: number) => string;

const fmtCount: Formatter = (v) => Math.round(v).toLocaleString();
const fmtCompact: Formatter = (v) => new Intl.NumberFormat('en', { notation: 'compact' }).format(v);
const fmtPercent: Formatter = (v) => `${Math.round(v)}%`;
const fmtCurrency: Formatter = (v) =>
  new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0, notation: 'compact' }).format(v);

interface MetricDef {
  labelKey: string;
  icon: ReactNode;
  format: Formatter;
  priority: number;
  highlight?: boolean;
  series?: 'complaintsLast30Days' | 'requestsLast30Days';
}

const METRIC_DEFS: Record<string, MetricDef> = {
  population: { labelKey: 'dashboard.statPopulation', icon: <Users size={20} />, format: fmtCount, priority: 10 },
  households: { labelKey: 'dashboard.statHouseholds', icon: <Home size={20} />, format: fmtCount, priority: 20 },
  openComplaints: { labelKey: 'dashboard.statOpenComplaints', icon: <MessageSquare size={20} />, format: fmtCount, priority: 30, series: 'complaintsLast30Days' },
  openRequests: { labelKey: 'dashboard.statPendingRequests', icon: <ClipboardList size={20} />, format: fmtCount, priority: 40, series: 'requestsLast30Days' },
  activeProjects: { labelKey: 'dashboard.statActiveProjects', icon: <FolderKanban size={20} />, format: fmtCount, priority: 50 },
  'derived.resolutionRate': { labelKey: 'dashboard.resolutionRate', icon: <Target size={20} />, format: fmtPercent, priority: 60, highlight: true },
  avgSatisfaction: { labelKey: 'dashboard.statSatisfaction', icon: <Smile size={20} />, format: fmtPercent, priority: 70, highlight: true },
  avgProgress: { labelKey: 'dashboard.statAvgProgress', icon: <TrendingUp size={20} />, format: fmtPercent, priority: 80, highlight: true },
  urgentComplaints: { labelKey: 'dashboard.statUrgentComplaints', icon: <AlertTriangle size={20} />, format: fmtCount, priority: 90, highlight: true },
  totalComplaints: { labelKey: 'dashboard.statTotalComplaints', icon: <MessagesSquare size={20} />, format: fmtCount, priority: 110, series: 'complaintsLast30Days' },
  resolvedComplaints: { labelKey: 'dashboard.statResolvedComplaints', icon: <CheckCircle2 size={20} />, format: fmtCount, priority: 120, series: 'complaintsLast30Days' },
  totalRequests: { labelKey: 'dashboard.statTotalRequests', icon: <Files size={20} />, format: fmtCount, priority: 130, series: 'requestsLast30Days' },
  resolvedRequests: { labelKey: 'dashboard.statResolvedRequests', icon: <CheckCircle2 size={20} />, format: fmtCount, priority: 140, series: 'requestsLast30Days' },
  'derived.requestRate': { labelKey: 'dashboard.derivedRequestRate', icon: <ClipboardCheck size={20} />, format: fmtPercent, priority: 150 },
  totalProjects: { labelKey: 'dashboard.statTotalProjects', icon: <FolderOpen size={20} />, format: fmtCount, priority: 160 },
  plannedProjects: { labelKey: 'dashboard.statPlannedProjects', icon: <Hourglass size={20} />, format: fmtCount, priority: 170 },
  completedProjects: { labelKey: 'dashboard.statCompletedProjects', icon: <CheckCircle2 size={20} />, format: fmtCount, priority: 180 },
  'derived.completionRate': { labelKey: 'dashboard.derivedCompletionRate', icon: <Flag size={20} />, format: fmtPercent, priority: 190 },
  totalBudget: { labelKey: 'dashboard.statTotalBudget', icon: <Wallet size={20} />, format: fmtCurrency, priority: 200 },
  totalSpent: { labelKey: 'dashboard.statTotalSpent', icon: <CreditCard size={20} />, format: fmtCurrency, priority: 210 },
  pendingEscalations: { labelKey: 'dashboard.statPendingEscalations', icon: <AlertOctagon size={20} />, format: fmtCount, priority: 220 },
  feedbackCount: { labelKey: 'dashboard.statFeedback', icon: <ThumbsUp size={20} />, format: fmtCount, priority: 230 },
  events: { labelKey: 'dashboard.statCommunityEvents', icon: <CalendarDays size={20} />, format: fmtCount, priority: 240 },
  reports: { labelKey: 'dashboard.statReports', icon: <FileText size={20} />, format: fmtCount, priority: 250 },
  districts: { labelKey: 'dashboard.statDistricts', icon: <Globe size={20} />, format: fmtCount, priority: 300 },
  sectors: { labelKey: 'dashboard.statSectors', icon: <Building2 size={20} />, format: fmtCount, priority: 310 },
  cells: { labelKey: 'dashboard.statCells', icon: <MapPin size={20} />, format: fmtCount, priority: 320 },
  villages: { labelKey: 'dashboard.statVillages', icon: <MapPinned size={20} />, format: fmtCount, priority: 330 },
};

interface Metric {
  key: string;
  label: string;
  value: string;
  icon: ReactNode;
  priority: number;
  highlight: boolean;
  series?: 'complaintsLast30Days' | 'requestsLast30Days';
}

function DbCard({ title, subtitle, children, className }: {
  title: string; subtitle?: string; children: ReactNode; className?: string;
}) {
  return (
    <section className={cx('rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_3px_rgba(15,23,42,0.06)]', className)}>
      <div className="mb-3">
        <h3 className="font-semibold text-slate-800 text-sm">{title}</h3>
        {subtitle && <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>}
      </div>
      {children}
    </section>
  );
}

function ChartTooltip(props: any) {
  const { active, payload, label } = props;
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs shadow-md">
      {label != null && <div className="font-semibold text-slate-700 mb-1">{label}</div>}
      {payload.map((p: any) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: p.color || p.payload?.fill }} />
          <span className="text-slate-500">{p.name}:</span>
          <span className="font-semibold text-slate-800">{p.value}</span>
        </div>
      ))}
    </div>
  );
}

function Trend({ last30, label }: { last30?: { date: string; count: number }[]; label: string }) {
  const { t } = useTranslation();
  if (!last30 || last30.length < 14) return null;
  const last7 = sum(last30.slice(-7).map((d) => d.count));
  const prev7 = sum(last30.slice(-14, -7).map((d) => d.count));
  const diff = last7 - prev7;
  const pct = prev7 === 0 ? 100 : Math.round((Math.abs(diff) / prev7) * 100);
  const good = diff <= 0;
  return (
    <>
      <TrendChip value={diff > 0 ? `+${pct}%` : diff < 0 ? `-${pct}%` : '0%'} good={good} />
      {label && <span className="text-slate-400">{label}</span>}
    </>
  );
}

export function Dashboard() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const { data, loading } = useFetch<any>('/dashboard');

  const isAdmin = (user?.level ?? 6) < 6;
  const level = user?.level ?? 6;

  const stats = data?.stats;
  const charts = data?.charts;
  const performance = data?.performance;
  const alerts = data?.alerts;
  const recent = data?.recent;

  const statsMap = useMemo(() => {
    const m: Record<string, number> = {};
    if (!data?.stats) return m;
    for (const [k, v] of Object.entries(data.stats)) {
      const n = Number(v);
      if (Number.isFinite(n) && n >= 0) m[k] = n;
    }
    if (m.totalComplaints > 0) {
      m['derived.resolutionRate'] = Math.round((m.resolvedComplaints ?? 0) / m.totalComplaints * 100);
    }
    if (m.totalRequests > 0) {
      m['derived.requestRate'] = Math.round((m.resolvedRequests ?? 0) / m.totalRequests * 100);
    }
    if (m.totalProjects > 0) {
      m['derived.completionRate'] = Math.round((m.completedProjects ?? 0) / m.totalProjects * 100);
    }
    return m;
  }, [data]);

  const metrics = useMemo<Metric[]>(() => {
    const list: Metric[] = [];
    for (const [key, raw] of Object.entries(statsMap)) {
      const def = METRIC_DEFS[key];
      if (!def) {
        list.push({
          key,
          label: key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase()),
          value: fmtCount(raw),
          icon: <Activity size={20} />,
          priority: 1000,
          highlight: false,
        });
        continue;
      }
      list.push({
        key,
        label: t(def.labelKey),
        value: def.format(raw),
        icon: def.icon,
        priority: def.priority,
        highlight: !!def.highlight,
        series: def.series,
      });
    }
    return list.sort((a, b) => a.priority - b.priority);
  }, [statsMap, t]);

  const scores = useMemo(() => {
    const total = stats?.totalComplaints ?? 0;
    const resolutionRate = total ? Math.round(((stats.resolvedComplaints ?? 0) / total) * 100) : 0;
    const satisfaction = stats?.avgSatisfaction ?? 0;
    const progress = stats?.avgProgress ?? 0;
    const score = Math.round(resolutionRate * 0.4 + satisfaction * 0.3 + progress * 0.3);
    return { resolutionRate, satisfaction, progress, score };
  }, [stats]);

  const trendData = useMemo(() => {
    const c = charts?.complaintsLast30Days ?? [];
    const r = charts?.requestsLast30Days ?? [];
    return c.map((d: any, i: number) => ({
      date: d.date,
      complaints: d.count,
      requests: r[i]?.count ?? 0,
    }));
  }, [charts]);

  const statusPie = useMemo(() => {
    const counts = charts?.complaintsByStatus ?? {};
    return Object.entries(counts).map(([name, value]) => ({
      name, value: Number(value),
      color: STATUS_COLORS[name as string] ?? '#94a3b8',
    }));
  }, [charts]);

  const categoryBars = useMemo(() => {
    const counts = charts?.complaintsByCategory ?? {};
    return Object.entries(counts)
      .map(([name, value]) => ({ name, value: Number(value) }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 8);
  }, [charts]);

  const projectsByStatus = useMemo(() => {
    const counts = charts?.projectsByStatus ?? {};
    return Object.entries(counts).map(([name, value]) => ({
      name,
      value: Number(value),
      color: PROJECT_COLORS[name as string] ?? '#94a3b8',
    }));
  }, [charts]);

  const rankedUnits = useMemo(() => {
    if (!performance?.length) return [];
    return [...performance]
      .sort((a: any, b: any) => (b.resolutionRate ?? 0) - (a.resolutionRate ?? 0))
      .slice(0, 6);
  }, [performance]);

  const hasTrend = trendData.length > 0;
  const hasPie = statusPie.length > 0;
  const hasCategories = categoryBars.length > 0;
  const hasProjects = projectsByStatus.length > 0;
  const hasRanking = rankedUnits.length > 0;
  const hasAlerts = (alerts?.length ?? 0) > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400">
        <div className="h-8 w-8 rounded-full border-2 border-brand-600 border-t-transparent animate-spin" />
      </div>
    );
  }

  const heroChips = metrics
    .filter((m) => m.highlight)
    .slice(0, 4)
    .map((m) => ({ label: m.label, value: m.value, icon: m.icon }));

  const primaryMetrics = metrics.slice(0, 4);

  return (
    <div className="space-y-5">
      {/* ---------------- hero band ---------------- */}
      <section className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-700 via-brand-800 to-brand-900 p-5 md:p-6 text-white">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-white/10" />
        <div className="pointer-events-none absolute -bottom-32 right-32 h-72 w-72 rounded-full bg-white/5" />
        <div className="flex flex-col-reverse md:flex-row items-center justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wider text-brand-100/80">
              {new Date().toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <h1 className="mt-1.5 text-xl font-bold tracking-tight">{t('dashboard.governanceOverview')}</h1>
            <p className="mt-1 text-sm text-brand-100/80 max-w-md">
              {isAdmin ? t('dashboard.adminSubtitle') : t('dashboard.citizenSubtitle')}
            </p>
            {heroChips.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2.5">
                {heroChips.map((c) => (
                  <div key={c.label} className="rounded-lg bg-white/10 px-3 py-2 backdrop-blur-sm min-w-[104px]">
                    <div className="flex items-center gap-1.5 text-[10px] uppercase tracking-wide text-brand-100/70">
                      {c.icon} {c.label}
                    </div>
                    <div className="mt-0.5 text-base font-bold leading-none">{c.value}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="shrink-0">
            {isAdmin && scores.score > 0 && (
              <ScoreGauge value={scores.score} label={t('dashboard.governanceScore')} sublabel={t('dashboard.scoreHint')} />
            )}
          </div>
        </div>
      </section>

      {/* ---------------- dynamic KPI row ---------------- */}
      {primaryMetrics.length > 0 && (
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
          {primaryMetrics.map((m) => (
            <KpiCard
              key={m.key}
              label={m.label}
              value={m.value}
              icon={m.icon}
              trend={m.series && charts?.[m.series]?.length >= 14
                ? <Trend last30={charts[m.series]} label={t('dashboard.vsPrev7')} />
                : undefined}
            />
          ))}
        </div>
      )}

      {/* ---------------- area chart + status donut ---------------- */}
      {isAdmin && (hasTrend || hasPie) && (
        <div className={cx('grid gap-5', hasTrend && hasPie ? 'grid-cols-1 lg:grid-cols-3' : 'grid-cols-1')}>
          {hasTrend && (
            <DbCard
              title={t('dashboard.complaintsRequestsTrend')}
              subtitle={t('dashboard.last30Days')}
              className={hasPie ? 'lg:col-span-2' : ''}
            >
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={trendData} margin={{ top: 4, right: 8, left: -18, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gComplaints" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES_COLORS.complaints} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={SERIES_COLORS.complaints} stopOpacity={0.02} />
                    </linearGradient>
                    <linearGradient id="gRequests" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor={SERIES_COLORS.requests} stopOpacity={0.28} />
                      <stop offset="100%" stopColor={SERIES_COLORS.requests} stopOpacity={0.02} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(d: string) => d.slice(5).replace('-', '/')}
                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                    tickLine={false}
                    axisLine={false}
                    minTickGap={28}
                  />
                  <YAxis tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <Tooltip content={<ChartTooltip />} />
                  <Area type="monotone" dataKey="complaints" name={t('dashboard.chartComplaints')} stroke={SERIES_COLORS.complaints} strokeWidth={2.5} fill="url(#gComplaints)" />
                  <Area type="monotone" dataKey="requests" name={t('dashboard.chartRequests')} stroke={SERIES_COLORS.requests} strokeWidth={2.5} fill="url(#gRequests)" />
                </AreaChart>
              </ResponsiveContainer>
              <div className="mt-2 flex items-center gap-4 text-xs text-slate-500">
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES_COLORS.complaints }} />{t('dashboard.chartComplaints')}</span>
                <span className="flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-full" style={{ background: SERIES_COLORS.requests }} />{t('dashboard.chartRequests')}</span>
              </div>
            </DbCard>
          )}

          {hasPie && (
            <DbCard title={t('dashboard.complaintsByStatus')}>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie
                    data={statusPie}
                    dataKey="value"
                    nameKey="name"
                    innerRadius={54}
                    outerRadius={78}
                    paddingAngle={2}
                    strokeWidth={0}
                  >
                    {statusPie.map((s) => <Cell key={s.name} fill={s.color} />)}
                  </Pie>
                  <Tooltip content={<ChartTooltip />} />
                </PieChart>
              </ResponsiveContainer>
              <div className="mt-3 grid grid-cols-1 gap-1.5">
                {statusPie.sort((a, b) => b.value - a.value).map((s) => (
                  <div key={s.name} className="flex items-center justify-between text-xs">
                    <span className="flex items-center gap-2 text-slate-500">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
                      {t(`status.${s.name}`)}
                    </span>
                    <span className="font-semibold text-slate-800">{s.value}</span>
                  </div>
                ))}
              </div>
            </DbCard>
          )}
        </div>
      )}

      {/* ---------------- category bars + projects ---------------- */}
      {isAdmin && (hasCategories || hasProjects) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {hasCategories && (
            <DbCard title={t('dashboard.complaintsByCategory')}>
              <ResponsiveContainer width="100%" height={Math.max(200, categoryBars.length * 34)}>
                <BarChart data={categoryBars} layout="vertical" margin={{ top: 0, right: 24, left: 8, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eef2f7" horizontal={false} />
                  <XAxis type="number" tick={{ fontSize: 11, fill: '#94a3b8' }} tickLine={false} axisLine={false} allowDecimals={false} />
                  <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 11, fill: '#475569' }} tickLine={false} axisLine={false} />
                  <Tooltip content={<ChartTooltip />} cursor={{ fill: '#eef2f7' }} />
                  <Bar dataKey="value" name={t('dashboard.chartComplaints')} fill="#1a7bdb" radius={[0, 6, 6, 0]} barSize={16} />
                </BarChart>
              </ResponsiveContainer>
            </DbCard>
          )}

          {hasProjects && (
            <DbCard title={t('dashboard.projectsByStatus')} subtitle={t('dashboard.projectsPortfolio')}>
              <div className="space-y-5">
                {projectsByStatus.map((p) => {
                  const total = projectsByStatus.reduce((s, x) => s + x.value, 0);
                  const pct = total ? Math.round((p.value / total) * 100) : 0;
                  return (
                    <div key={p.name}>
                      <div className="flex items-center justify-between text-xs mb-1.5">
                        <span className="font-medium text-slate-600">{t(`status.${p.name}`)}</span>
                        <span className="text-slate-400">{p.value} · {pct}%</span>
                      </div>
                      <div className="h-2.5 rounded-full bg-slate-100 overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${pct}%`, background: p.color }} />
                      </div>
                    </div>
                  );
                })}
                <div className="pt-2 text-xs text-slate-500">
                  <span className="font-semibold text-slate-700">{t('dashboard.totalBudget')}: </span>
                  {new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0, notation: 'compact' }).format(stats?.totalBudget ?? 0)}
                </div>
              </div>
            </DbCard>
          )}
        </div>
      )}

      {/* ---------------- unit ranking + urgent alerts ---------------- */}
      {isAdmin && (hasRanking || hasAlerts) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {hasRanking && (
            <DbCard title={level === 1 ? t('dashboard.districtPerformance') : t('dashboard.sectorPerformance')}>
              <div className="space-y-4">
                {rankedUnits.map((u: any, i: number) => (
                  <div key={u.id}>
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <span className="flex items-center gap-2 font-medium text-slate-700 min-w-0">
                        <span className={cx(
                          'w-5 h-5 rounded-md flex items-center justify-center text-[10px] font-bold shrink-0',
                          i === 0 ? 'bg-amber-100 text-amber-700' : i === 1 ? 'bg-slate-200 text-slate-600' : i === 2 ? 'bg-orange-100 text-orange-700' : 'bg-slate-100 text-slate-500',
                        )}>
                          {i + 1}
                        </span>
                        <span className="truncate">{u.name}</span>
                      </span>
                      <span className="font-semibold text-slate-800 shrink-0">{u.resolutionRate}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                      <div
                        className={cx('h-full rounded-full', i === 0 ? 'bg-gradient-to-r from-emerald-500 to-emerald-400' : 'bg-brand-600')}
                        style={{ width: `${u.resolutionRate}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </DbCard>
          )}

          {hasAlerts && (
            <DbCard title={t('dashboard.urgentAlerts', { count: alerts?.length ?? 0 })}>
              <ul className="divide-y divide-slate-100">
                {alerts.map((a: any) => (
                  <li key={a.id}>
                    <Link to={`/complaints/${a.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg group">
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-700">{a.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">{a.village?.name} · {formatDate(a.createdAt)}</div>
                      </div>
                      <StatusBadge status={a.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            </DbCard>
          )}
        </div>
      )}

      {/* ---------------- recent activity ---------------- */}
      <div className={cx('grid grid-cols-1 lg:grid-cols-2 gap-5', !isAdmin && 'lg:grid-cols-1')}>
        <DbCard
          title={isAdmin ? t('dashboard.recentComplaints') : t('dashboard.myRecentComplaints')}
        >
          {!recent?.complaints?.length ? (
            <p className="text-sm text-slate-400 py-10 text-center">{t('dashboard.noComplaints')}</p>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recent.complaints.map((c: any) => (
                <li key={c.id}>
                  <Link to={`/complaints/${c.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg group">
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-700">{c.title}</div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {c.village?.name}{c.category?.name ? ` · ${c.category.name}` : ''} · {formatDate(c.createdAt)}
                      </div>
                    </div>
                    <StatusBadge status={c.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </DbCard>

        {isAdmin ? (
          <DbCard title={t('dashboard.recentReports')}>
            {!recent?.reports?.length ? (
              <p className="text-sm text-slate-400 py-10 text-center">—</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.reports.map((r: any) => (
                  <li key={r.id}>
                    <Link to={`/reports/${r.id}`} className="flex items-center justify-between gap-3 py-2.5 hover:bg-slate-50 -mx-2 px-2 rounded-lg group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="h-9 w-9 rounded-lg bg-violet-50 text-violet-600 flex items-center justify-center shrink-0">
                          <FileText size={16} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-slate-700 truncate group-hover:text-brand-700">{r.title}</div>
                          <div className="text-[11px] text-slate-400 truncate">{r.author?.fullName} · {formatDate(r.createdAt)}</div>
                        </div>
                      </div>
                      <StatusBadge status={r.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </DbCard>
        ) : (
          <DbCard title={t('dashboard.upcomingEvents')}>
            {!recent?.events?.length ? (
              <p className="text-sm text-slate-400 py-10 text-center">{t('dashboard.noEvents')}</p>
            ) : (
              <ul className="divide-y divide-slate-100">
                {recent.events.map((e: any) => (
                  <li key={e.id} className="flex items-center justify-between gap-3 py-2.5">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="h-9 w-9 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center shrink-0">
                        <CalendarDays size={16} />
                      </div>
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-700 truncate">{e.title}</div>
                        <div className="text-[11px] text-slate-400 truncate">{formatDate(e.eventDate)}</div>
                      </div>
                    </div>
                    <StatusBadge status={e.status} />
                  </li>
                ))}
              </ul>
            )}
          </DbCard>
        )}
      </div>

      {/* recent projects for citizens */}
      {!isAdmin && recent?.projects?.length > 0 && (
        <DbCard title={t('dashboard.recentProjects')}>
          <ul className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {recent.projects.map((p: any) => (
              <li key={p.id} className="rounded-xl border border-slate-100 p-3">
                <Link to={`/projects/${p.id}`} className="text-sm font-medium text-slate-700 hover:text-brand-700 truncate block">
                  {p.title}
                </Link>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-slate-400">
                  <span className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden inline-block">
                    <span className="block h-full bg-brand-600" style={{ width: `${p.progress}%` }} />
                  </span>
                  <span className="shrink-0 font-semibold text-slate-600">{p.progress}%</span>
                </div>
              </li>
            ))}
          </ul>
        </DbCard>
      )}
    </div>
  );
}