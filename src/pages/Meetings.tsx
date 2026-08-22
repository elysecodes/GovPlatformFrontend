import { FormEvent, useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
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
  const [items, setItems] = useState<Meeting[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [heldTarget, setHeldTarget] = useState<Meeting | null>(null);
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
    try { await api.delete(`/meetings/${id}`); void load(); } catch (err) { setError(apiError(err)); }
  }

  return (
    <div>
      <PageHeader
        title="Town-Hall Meetings"
        subtitle="Umuganda, cell and village meetings with agenda and minutes"
        breadcrumb="Northern Province / Meetings"
        actions={isAdmin && <Button onClick={() => setShowNew(true)}><Plus size={16} /> New meeting</Button>}
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select className="!w-48 shrink-0" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">All statuses</option>
            {['PLANNED', 'HELD', 'CANCELLED'].map((s) => (
              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
            ))}
          </Select>
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-xs text-slate-400">Sort:</span>
            <Select className="!w-40 shrink-0" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
              <option value="">Latest</option>
              <option value="oldest">Soonest</option>
              <option value="name">Name A-Z</option>
            </Select>
          </span>
        </div>
      </Card>

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title="No meetings scheduled" /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((m) => (
            <Card key={m.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{m.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(m.meetingDate)} · {m.location ?? 'Location TBA'}</p>
                </div>
                <StatusBadge status={m.status} />
              </div>
              {m.description && <p className="text-sm text-slate-600 mt-3">{m.description}</p>}
              {m.agenda && <p className="text-xs text-slate-500 mt-2"><span className="font-medium">Agenda:</span> {m.agenda}</p>}
              {m.minutes && <p className="text-xs text-slate-500 mt-2"><span className="font-medium">Minutes:</span> {m.minutes}</p>}
              {m.organizer && <p className="text-xs text-slate-400 mt-2">Organized by {m.organizer}</p>}
              {isAdmin && (
                <div className="mt-3 flex gap-2">
                  {m.status === 'PLANNED' && (
                    <Button variant="secondary" onClick={() => { setForm({}); setHeldTarget(m); }}>Mark held</Button>
                  )}
                  <Button variant="ghost" onClick={() => remove(m.id)}><Trash2 size={14} /> Delete</Button>
                </div>
              )}
            </Card>
          ))}
        </div>
      )}
      {!loading && items.length > 0 && <div className="mt-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Schedule a meeting" wide>
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Title" required><Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
            <Field label="Date and time" required><Input type="datetime-local" value={form.meetingDate ?? ''} onChange={(e) => setForm({ ...form, meetingDate: e.target.value })} required /></Field>
          </div>
          <Field label="Description"><Textarea rows={2} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Location"><Input value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label="Organizer"><Input value={form.organizer ?? ''} onChange={(e) => setForm({ ...form, organizer: e.target.value })} /></Field>
          </div>
          <Field label="Agenda"><Textarea rows={2} value={form.agenda ?? ''} onChange={(e) => setForm({ ...form, agenda: e.target.value })} /></Field>
          <VillagePicker value={form.villageId} onChange={(v) => setForm({ ...form, villageId: v })} />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Schedule meeting</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!heldTarget} onClose={() => setHeldTarget(null)} title={`Meeting minutes — ${heldTarget?.title ?? ''}`}>
        <form onSubmit={markHeld} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <Field label="Minutes / outcome" required>
            <Textarea rows={5} value={form.minutes ?? ''} onChange={(e) => setForm({ ...form, minutes: e.target.value })} required />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setHeldTarget(null)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save minutes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}