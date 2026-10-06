import { FormEvent, useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { VillagePicker } from '../components/VillagePicker';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, StatusBadge, Textarea, formatDate } from '../components/ui';
import { Paginated } from '../lib/types';

interface Meeting {
  id: number;
  title: string;
  description?: string;
  meetingDate: string;
  location?: string;
  agenda?: string;
  minutes?: string;
  organizer?: string;
  status: string;
}

export function Meetings() {
  const { user } = useAuth();
  const isAdmin = (user?.level ?? 6) < 6;
  const { t } = useTranslation();
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [heldTarget, setHeldTarget] = useState<Meeting | null>(null);
  const [cancelTarget, setCancelTarget] = useState<Meeting | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Meeting | null>(null);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paginated<Meeting>>('/meetings', { params: { page, limit: 15, status: status || undefined, sort: sort || undefined } });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
      setError('');
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [page, status, sort]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/meetings', form);
      setShowNew(false); setForm({}); void load();
    } catch (err) { setError(apiError(err)); } finally { setSaving(false); }
  }

  async function markHeld(e: FormEvent) {
    e.preventDefault();
    if (!heldTarget) return;
    setSaving(true); setError('');
    try {
      await api.put(`/meetings/${heldTarget.id}`, { status: 'HELD', minutes: form.minutes });
      setHeldTarget(null); setForm({}); void load();
    } catch (err) { setError(apiError(err)); } finally { setSaving(false); }
  }

  async function remove(id: number) {
    setSaving(true); setError('');
    try { await api.delete(`/meetings/${id}`); setDeleteTarget(null); void load(); } catch (err) { setError(apiError(err)); } finally { setSaving(false); }
  }

  async function cancelMeeting() {
    if (!cancelTarget) return;
    setSaving(true); setError('');
    try {
      await api.put(`/meetings/${cancelTarget.id}`, { status: 'CANCELLED' });
      setCancelTarget(null); void load();
    } catch (err) { setError(apiError(err)); } finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader
        title={t('meetings.title')}
        subtitle={t('meetings.subtitle')}
        breadcrumb={`${t('common.appName')} / ${t('nav.meetings')}`}
        actions={isAdmin && <Button onClick={() => setShowNew(true)}><Plus size={16} /> {t('meetings.new')}</Button>}
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select className="!w-48 shrink-0" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">{t('meetings.allStatuses')}</option>
            {['PLANNED', 'HELD', 'CANCELLED'].map((s) => (
              <option key={s} value={s}>{s === 'HELD' ? t('meetings.status.HELD') : t(`status.${s}`)}</option>
            ))}
          </Select>
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-xs text-slate-400">{t('meetings.sort')}</span>
            <Select className="!w-40 shrink-0" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
              <option value="">{t('meetings.sortLatest')}</option>
              <option value="oldest">{t('meetings.sortSoonest')}</option>
              <option value="name">{t('meetings.sortNameAZ')}</option>
            </Select>
          </span>
        </div>
      </Card>

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title={t('meetings.empty')} /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
{items.map((m) => {
    // True when a PLANNED meeting's date has passed without being held.
    const meetingOverdue = m.status === 'PLANNED' && new Date(m.meetingDate).getTime() < Date.now();
    return (
    <Card key={m.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{m.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(m.meetingDate)} · {m.location ?? t('meetings.locationTba')}
                    {meetingOverdue && (
                      <span className="ml-1.5 inline-flex items-center rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">{t('common.overdue')}</span>
                    )}
                  </p>
                </div>
                <StatusBadge status={m.status} />
              </div>
              {m.description && <p className="text-sm text-slate-600 mt-3">{m.description}</p>}
              {m.agenda && <p className="text-xs text-slate-500 mt-2"><span className="font-medium">{t('meetings.agendaLabel')}</span> {m.agenda}</p>}
              {m.minutes && <p className="text-xs text-slate-500 mt-2"><span className="font-medium">{t('meetings.minutesLabel')}</span> {m.minutes}</p>}
              {m.organizer && <p className="text-xs text-slate-400 mt-2">{t('meetings.organizedBy', { organizer: m.organizer })}</p>}
              {isAdmin && (
                <div className="mt-3 flex gap-2">
                  {m.status === 'PLANNED' && (
                    <Button variant="secondary" onClick={() => { setForm({}); setHeldTarget(m); }}>{t('meetings.markHeld')}</Button>
                  )}
                  {m.status === 'PLANNED' && (
                    <Button variant="ghost" onClick={() => { setError(''); setCancelTarget(m); }}>{t('meetings.cancel')}</Button>
                  )}
                  <Button variant="ghost" onClick={() => { setError(''); setDeleteTarget(m); }}><Trash2 size={14} /> {t('common.delete')}</Button>
                </div>
              )}
            </Card>
    );
          })}
        </div>
      )}
      {!loading && items.length > 0 && <div className="mt-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>}

      <Modal open={showNew} onClose={() => setShowNew(false)} title={t('meetings.scheduleTitle')} wide>
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('meetings.titleLabel')} required><Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
            <Field label={t('meetings.dateTime')} required><Input type="datetime-local" value={form.meetingDate ?? ''} onChange={(e) => setForm({ ...form, meetingDate: e.target.value })} required /></Field>
          </div>
          <Field label={t('meetings.description')}><Textarea rows={2} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('meetings.location')}><Input value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label={t('meetings.organizer')}><Input value={form.organizer ?? ''} onChange={(e) => setForm({ ...form, organizer: e.target.value })} /></Field>
          </div>
          <Field label={t('meetings.agenda')}><Textarea rows={2} value={form.agenda ?? ''} onChange={(e) => setForm({ ...form, agenda: e.target.value })} /></Field>
          <VillagePicker value={form.villageId} onChange={(v) => setForm({ ...form, villageId: v })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={saving}>{t('meetings.scheduleMeeting')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!heldTarget} onClose={() => setHeldTarget(null)} title={t('meetings.minutesTitle', { title: heldTarget?.title ?? '' })}>
        <form onSubmit={markHeld} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <Field label={t('meetings.minutesOutcome')} required>
            <Textarea rows={5} value={form.minutes ?? ''} onChange={(e) => setForm({ ...form, minutes: e.target.value })} required />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setHeldTarget(null)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={saving}>{t('meetings.saveMinutes')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!cancelTarget} onClose={() => setCancelTarget(null)} title={t('meetings.cancelConfirmTitle')}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <p className="text-sm text-slate-600">{t('meetings.cancelConfirm', { title: cancelTarget?.title })}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setCancelTarget(null); setError(''); }}>{t('common.cancel')}</Button>
            <Button type="button" loading={saving} onClick={cancelMeeting}>{t('meetings.cancel')}</Button>
          </div>
        </div>
      </Modal>
      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('common.deleteConfirmTitle')}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <p className="text-sm text-slate-600">{t('common.deleteConfirm', { name: deleteTarget?.title })}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setDeleteTarget(null); setError(''); }}>{t('common.cancel')}</Button>
            <Button type="button" loading={saving} onClick={() => remove(deleteTarget!.id)}>{t('common.delete')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}