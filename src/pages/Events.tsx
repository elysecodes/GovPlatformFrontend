import { FormEvent, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, StatusBadge, Textarea, formatDate } from '../components/ui';
import { GovEvent, Paginated } from '../lib/types';

export function Events() {
  const { user } = useAuth();
  const isAdmin = (user?.level ?? 6) < 6;
  const { t } = useTranslation();
  const [items, setItems] = useState<GovEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<GovEvent | null>(null);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paginated<GovEvent>>('/events', { params: { page, limit: 15, status: status || undefined, sort: sort || undefined } });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [page, status, sort]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/events', form);
      setShowNew(false);
      setForm({});
      void load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function register(id: number) {
    try {
      await api.post(`/events/${id}/register`);
      void load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function changeStatus(ev: GovEvent, status: string) {
    try {
      await api.put(`/events/${ev.id}`, { status });
      void load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function cancelEvent() {
    if (!cancelTarget) return;
    setSaving(true); setError('');
    try {
      await api.put(`/events/${cancelTarget.id}`, { status: 'CANCELLED' });
      setCancelTarget(null); void load();
    } catch (err) { setError(apiError(err)); } finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader
        title={t('events.title')}
        subtitle={t('events.subtitle')}
        breadcrumb={`${t('common.appName')} / ${t('nav.events')}`}
        actions={isAdmin && <Button onClick={() => setShowNew(true)}><Plus size={16} /> {t('events.new')}</Button>}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select className="!w-48 shrink-0" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">{t('events.allStatuses')}</option>
            {['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </Select>
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-xs text-slate-400">{t('events.sort')}</span>
            <Select className="!w-40 shrink-0" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
              <option value="">{t('events.sortLatest')}</option>
              <option value="oldest">{t('events.sortSoonest')}</option>
              <option value="name">{t('events.sortNameAZ')}</option>
            </Select>
          </span>
        </div>
      </Card>

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title={t('events.empty')} /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((ev) => (
            <Card key={ev.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{ev.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(ev.eventDate)} · {ev.location ?? t('events.locationTba')}
                      {ev.status === 'PLANNED' && new Date(ev.eventDate).getTime() < Date.now() && (
                        <span className="ml-1.5 inline-flex items-center rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">{t('common.overdue')}</span>
                      )}
                    </p>
                </div>
                <StatusBadge status={ev.status} />
              </div>
              <p className="text-sm text-slate-600 mt-3">{ev.description}</p>
              {ev.organizer && <p className="text-xs text-slate-400 mt-2">{t('events.organizedBy', { organizer: ev.organizer })}</p>}
              {isAdmin && (ev.status === 'PLANNED' || ev.status === 'ACTIVE' || ev.status === 'CANCELLED') && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {ev.status === 'PLANNED' && (
                    <Button variant="secondary" onClick={() => changeStatus(ev, 'ACTIVE')}>{t('events.markActive')}</Button>
                  )}
                  {(ev.status === 'PLANNED' || ev.status === 'ACTIVE') && (
                    <Button variant="secondary" onClick={() => changeStatus(ev, 'COMPLETED')}>{t('events.markCompleted')}</Button>
                  )}
                  {ev.status === 'CANCELLED' && (
                    <Button variant="secondary" onClick={() => changeStatus(ev, 'PLANNED')}>{t('events.reopen')}</Button>
                  )}
                  {ev.status !== 'CANCELLED' && (
                    <Button variant="ghost" onClick={() => { setError(''); setCancelTarget(ev); }}>{t('events.cancel')}</Button>
                  )}
                </div>
              )}
              {!isAdmin && ['PLANNED', 'ACTIVE'].includes(ev.status) && (
                <Button variant="secondary" className="mt-3" onClick={() => register(ev.id)}>{t('events.registerToAttend')}</Button>
              )}
            </Card>
          ))}
        </div>
      )}
      {!loading && items.length > 0 && <div className="mt-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>}

      <Modal open={showNew} onClose={() => setShowNew(false)} title={t('events.createTitle')} wide>
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('events.titleLabel')} required>
              <Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <Field label={t('events.dateTime')} required>
              <Input type="datetime-local" value={form.eventDate ?? ''} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} required />
            </Field>
          </div>
          <Field label={t('events.description')} required>
            <Textarea rows={3} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('events.location')}><Input value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label={t('events.organizer')}><Input value={form.organizer ?? ''} onChange={(e) => setForm({ ...form, organizer: e.target.value })} /></Field>
          </div>
          <Field label={t('events.villageScope')}> 
            <Input type="number" value={form.villageId ?? ''} onChange={(e) => setForm({ ...form, villageId: Number(e.target.value) || undefined })} placeholder={t('events.villageScopePlaceholder')} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={saving}>{t('events.createEvent')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title={t('events.cancelConfirmTitle')}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <p className="text-sm text-slate-600">{t('events.cancelConfirm', { title: cancelTarget?.title })}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setCancelTarget(null); setError(''); }}>{t('common.cancel')}</Button>
            <Button type="button" loading={saving} onClick={cancelEvent}>{t('events.cancel')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
