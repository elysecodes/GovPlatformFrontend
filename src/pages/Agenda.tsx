import { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { Button, Card, EmptyState, PageHeader, Spinner, formatDate } from '../components/ui';
import { Paginated } from '../lib/types';

interface AgendaItem {
  id: number;
  kind: 'meeting' | 'event';
  title: string;
  date: string;
  status: string;
}

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function startOfDayKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function Agenda() {
  const { t } = useTranslation();
  const [items, setItems] = useState<AgendaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cursor, setCursor] = useState<Date>(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      api.get<Paginated<any>>('/meetings', { params: { limit: 300, sort: 'oldest' } }),
      api.get<Paginated<any>>('/events', { params: { limit: 300, sort: 'oldest' } }),
    ])
      .then(([meetings, events]) => {
        if (cancelled) return;
        const list: AgendaItem[] = [
          ...meetings.data.items.map((m: any) => ({ id: m.id, kind: 'meeting' as const, title: m.title, date: m.meetingDate, status: m.status })),
          ...events.data.items.map((e: any) => ({ id: e.id, kind: 'event' as const, title: e.title, date: e.eventDate, status: e.status })),
        ];
        setItems(list);
      })
      .catch((e) => setError(apiError(e)))
      .finally(() => setLoading(false));
    return () => { cancelled = true; };
  }, []);

  const byDay = useMemo(() => {
    const map = new Map<string, AgendaItem[]>();
    for (const it of items) {
      const key = startOfDayKey(new Date(it.date));
      const arr = map.get(key) ?? [];
      arr.push(it);
      map.set(key, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return map;
  }, [items]);

  const now = useMemo(() => new Date(), []);
  const todayKey = startOfDayKey(now);

  function monthLabel(d: Date): string {
    return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
  }
  function moveMonth(delta: number) {
    setCursor((cur) => new Date(cur.getFullYear(), cur.getMonth() + delta, 1));
  }

  const year = cursor.getFullYear();
  const month = cursor.getMonth();
  const firstWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday-first
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = [
    ...Array.from({ length: firstWeekday }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => new Date(year, month, i + 1)),
  ];
  const upcoming = useMemo(() => {
    const future = items.filter((it) => new Date(it.date).getTime() >= now.getTime()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return future.slice(0, 6);
  }, [items, now]);

  return (
    <div>
      <PageHeader
        title={t('agenda.title')}
        subtitle={t('agenda.subtitle')}
        breadcrumb={`${t('common.appName')} / ${t('nav.agenda')}`}
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      {loading ? <Spinner /> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <Card className="lg:col-span-2 p-0">
            <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100">
              <Button variant="ghost" onClick={() => moveMonth(-1)} aria-label="Previous month"><ChevronLeft size={18} /></Button>
              <div className="font-semibold text-slate-800">{monthLabel(cursor)}</div>
              <Button variant="ghost" onClick={() => moveMonth(1)} aria-label="Next month"><ChevronRight size={18} /></Button>
            </div>
            <div className="grid grid-cols-7 border-b border-slate-100">
              {WEEKDAYS.map((d, i) => (
                <div key={i} className="py-2 text-center text-xs font-medium text-slate-400">{t(`agenda.weekday.${d}`)}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 auto-rows-[84px]">
              {cells.map((day, i) => {
                const key = day ? startOfDayKey(day) : `pad-${i}`;
                const dayItems = day ? (byDay.get(key) ?? []) : [];
                const isToday = key === todayKey;
                return (
                  <div key={key} className={`border-b border-r border-slate-100 p-1.5 ${day && day.getMonth() !== month ? 'bg-slate-50' : ''} ${i + 1 > 28 ? 'border-b-0' : ''}`}>
                    {day && (
                      <>
                        <div className={`text-xs mb-1 ${isToday ? 'inline-flex h-5 w-5 items-center justify-center rounded-full bg-brand-700 text-white font-semibold' : 'text-slate-500'}`}>
                          {day.getDate()}
                        </div>
                        <div className="space-y-0.5">
                          {dayItems.slice(0, 2).map((it) => (
                            <div
                              key={`${it.kind}-${it.id}`}
                              title={`${it.title} · ${formatDate(it.date)}`}
                              className={`truncate rounded px-1.5 py-0.5 text-[10px] font-medium ${it.kind === 'meeting' ? 'bg-slate-100 text-slate-700' : 'bg-brand-50 text-brand-700'}`}
                            >
                              {it.title}
                            </div>
                          ))}
                          {dayItems.length > 2 && (
                            <div className="px-1 text-[10px] text-slate-400">{t('agenda.moreItems', { count: dayItems.length - 2 })}</div>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
          </Card>

          <div className="space-y-5">
            <Card>
              <h3 className="font-semibold text-slate-800 mb-3">{t('agenda.upcomingTitle')}</h3>
              {upcoming.length === 0 ? (
                <p className="text-sm text-slate-500">{t('agenda.noUpcoming')}</p>
              ) : (
                <ul className="space-y-3">
                  {upcoming.map((it) => (
                    <li key={`${it.kind}-${it.id}`} className="flex items-start gap-3">
                      <div className={`mt-0.5 h-2 w-2 rounded-full shrink-0 ${it.kind === 'meeting' ? 'bg-slate-400' : 'bg-brand-500'}`} />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-slate-800 truncate">{it.title}</div>
                        <div className="text-xs text-slate-400">{formatDate(it.date)} · {it.kind === 'meeting' ? t('agenda.meetingType') : t('agenda.eventType')}</div>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
            <Card>
              <h3 className="font-semibold text-slate-800 mb-3">{t('agenda.legend')}</h3>
              <div className="space-y-2 text-sm text-slate-600">
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-slate-200" /> {t('agenda.meetingType')}</div>
                <div className="flex items-center gap-2"><span className="h-3 w-3 rounded bg-brand-100" /> {t('agenda.eventType')}</div>
              </div>
            </Card>
          </div>
        </div>
      )}
      {!loading && items.length === 0 && <Card className="mt-5"><EmptyState title={t('agenda.noItems')} /></Card>}
    </div>
  );
}