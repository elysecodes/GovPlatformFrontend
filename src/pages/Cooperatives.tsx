import { FormEvent, useEffect, useState } from 'react';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { VillagePicker } from '../components/VillagePicker';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, Spinner, Table } from '../components/ui';
import { Paginated } from '../lib/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

interface Cooperative {
  id: number;
  name: string;
  description?: string;
  activity?: string;
  leaderName?: string;
  membersCount: number;
  village?: { id: number; name: string };
}

export function Cooperatives() {
  const { user } = useAuth();
  const isAdmin = (user?.level ?? 6) < 6;
  const [items, setItems] = useState<Cooperative[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<Cooperative | null>(null);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paginated<Cooperative>>('/cooperatives', { params: { page, limit: 15, q: debouncedSearch || undefined, sort: sort || undefined } });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
      setError('');
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [page, debouncedSearch, sort]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/cooperatives', form);
      setShowNew(false); setForm({}); void load();
    } catch (err) { setError(apiError(err)); } finally { setSaving(false); }
  }

  async function update(e: FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true); setError('');
    try {
      await api.put(`/cooperatives/${editTarget.id}`, form);
      setEditTarget(null); void load();
    } catch (err) { setError(apiError(err)); } finally { setSaving(false); }
  }

  async function remove(id: number) {
    try { await api.delete(`/cooperatives/${id}`); void load(); } catch (err) { setError(apiError(err)); }
  }

  function openEdit(c: Cooperative) {
    setForm({ name: c.name, description: c.description ?? '', activity: c.activity ?? '', leaderName: c.leaderName ?? '', membersCount: c.membersCount });
    setEditTarget(c);
  }

  return (
    <div>
      <PageHeader
        title="Cooperatives & Socio-Economic Groups"
        subtitle="Ubudehe and community cooperatives in your jurisdiction"
        breadcrumb="Northern Province / Cooperatives"
        actions={isAdmin && <Button onClick={() => { setForm({}); setShowNew(true); }}><Plus size={16} /> New cooperative</Button>}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder="Search cooperatives..." className="w-full md:w-72" />
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-xs text-slate-400">Sort:</span>
            <Select className="!w-40 shrink-0" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
              <option value="">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name A-Z</option>
              <option value="members">Most members</option>
            </Select>
          </span>
        </div>
      </Card>
      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title="No cooperatives registered" /></Card>
      ) : (
        <Card className="p-0">
          <Table headers={['Name', 'Activity', 'Leader', 'Members', 'Village', '']}>
            {items.map((c) => (
              <tr key={c.id}>
                <td className="py-3 pr-4">
                  <div className="font-medium text-slate-800">{c.name}</div>
                  {c.description && <div className="text-xs text-slate-500 max-w-[260px] truncate">{c.description}</div>}
                </td>
                <td className="py-3 pr-4 text-slate-600">{c.activity ?? '—'}</td>
                <td className="py-3 pr-4 text-slate-600">{c.leaderName ?? '—'}</td>
                <td className="py-3 pr-4 text-slate-600">{c.membersCount}</td>
                <td className="py-3 pr-4 text-slate-600">{c.village?.name}</td>
                <td className="py-3 pr-4">
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} title="Edit" className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-brand-700 hover:bg-brand-50"><Pencil size={12} className="mr-0.5" /> Edit</button>
                      <button onClick={() => remove(c.id)} title="Delete" className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50"><Trash2 size={12} className="mr-0.5" /> Delete</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
          <div className="px-5 pb-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>
        </Card>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Register a cooperative" wide>
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name" required><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Activity"><Input value={form.activity ?? ''} onChange={(e) => setForm({ ...form, activity: e.target.value })} /></Field>
            <Field label="Leader name"><Input value={form.leaderName ?? ''} onChange={(e) => setForm({ ...form, leaderName: e.target.value })} /></Field>
            <Field label="Members count"><Input type="number" min={0} value={form.membersCount ?? 0} onChange={(e) => setForm({ ...form, membersCount: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Description"><Input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <VillagePicker value={form.villageId} onChange={(v) => setForm({ ...form, villageId: v })} required />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Register</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title="Edit cooperative" wide>
        <form onSubmit={update} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Name" required><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label="Activity"><Input value={form.activity ?? ''} onChange={(e) => setForm({ ...form, activity: e.target.value })} /></Field>
            <Field label="Leader name"><Input value={form.leaderName ?? ''} onChange={(e) => setForm({ ...form, leaderName: e.target.value })} /></Field>
            <Field label="Members count"><Input type="number" min={0} value={form.membersCount ?? 0} onChange={(e) => setForm({ ...form, membersCount: Number(e.target.value) })} /></Field>
          </div>
          <Field label="Description"><Input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label="Village"><Input value={editTarget?.village?.name ?? '—'} disabled /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save changes</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}