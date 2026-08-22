import { FormEvent, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, StatusBadge, Textarea, formatDate } from '../components/ui';
import { GovEvent, Paginated } from '../lib/types';

export function Events() {
  const { user } = useAuth();
  const isAdmin = (user?.level ?? 6) < 6;
  const [items, setItems] = useState<GovEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('');
  const [showNew, setShowNew] = useState(false);
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

  return (
    <div>
      <PageHeader
        title="Community Events"
        subtitle="Umuganda, meetings, trainings and community activities"
        breadcrumb="Northern Province / Events"
        actions={isAdmin && <Button onClick={() => setShowNew(true)}><Plus size={16} /> New event</Button>}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select className="!w-48 shrink-0" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">All statuses</option>
            {['PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED'].map((s) => (
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
        <Card><EmptyState title="No events" /></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {items.map((ev) => (
            <Card key={ev.id}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-semibold text-slate-800">{ev.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">{formatDate(ev.eventDate)} · {ev.location ?? 'Location TBA'}</p>
                </div>
                <StatusBadge status={ev.status} />
              </div>
              <p className="text-sm text-slate-600 mt-3">{ev.description}</p>
              {ev.organizer && <p className="text-xs text-slate-400 mt-2">Organized by {ev.organizer}</p>}
              {!isAdmin && ['PLANNED', 'ACTIVE'].includes(ev.status) && (
                <Button variant="secondary" className="mt-3" onClick={() => register(ev.id)}>Register to attend</Button>
              )}
            </Card>
          ))}
        </div>
      )}
      {!loading && items.length > 0 && <div className="mt-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create a community event" wide>
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Title" required>
              <Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <Field label="Date and time" required>
              <Input type="datetime-local" value={form.eventDate ?? ''} onChange={(e) => setForm({ ...form, eventDate: e.target.value })} required />
            </Field>
          </div>
          <Field label="Description" required>
            <Textarea rows={3} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Location"><Input value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} /></Field>
            <Field label="Organizer"><Input value={form.organizer ?? ''} onChange={(e) => setForm({ ...form, organizer: e.target.value })} /></Field>
          </div>
          <Field label="Village (scope)"> 
            <Input type="number" value={form.villageId ?? ''} onChange={(e) => setForm({ ...form, villageId: Number(e.target.value) || undefined })} placeholder="Village ID for targeted events (optional)" />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create event</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
