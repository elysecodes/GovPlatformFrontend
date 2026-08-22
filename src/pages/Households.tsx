import { FormEvent, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, Spinner, Table, formatDate } from '../components/ui';
import { Paginated } from '../lib/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { ExportCsvButton } from '../components/ExportCsv';

interface Unit { id: number; name: string }
interface Household { id: number; code: string; headName: string; members: number; village?: Unit; createdAt: string }

export function Households() {
  const { user } = useAuth();
  const level = user?.level ?? 6;
  const canCreate = level === 4 || level === 5;
  const [items, setItems] = useState<Household[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [sort, setSort] = useState('');

  const [cells, setCells] = useState<Unit[]>([]);
  const [villages, setVillages] = useState<Unit[]>([]);

  async function load() {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (debouncedSearch) params.q = debouncedSearch;
      if (sort) params.sort = sort;
      const res = await api.get<Paginated<Household>>('/admin/households', { params });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [page, debouncedSearch, sort]);
  useEffect(() => { if (level === 5) api.get('/catalog/scope-tree').then(() => {}).catch(() => {}); }, [level]);

  async function loadCells() {
    const scope = await api.get('/catalog/scope-tree');
    const s = scope.data.scope;
    if (s.level === 4) {
      const r = await api.get(`/catalog/cells/${s.cellId}/villages`);
      setVillages(r.data.items);
    } else if (s.level === 5) {
      setForm((f: any) => ({ ...f, villageId: s.villageId }));
    }
  }

  useEffect(() => { void loadCells(); }, []);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/admin/households', form);
      setShowNew(false);
      setForm({});
      void load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Households"
        subtitle="Registered households in your jurisdiction"
        breadcrumb="Northern Province / Households"
        actions={canCreate && (
          <div className="flex flex-wrap gap-2">
            <ExportCsvButton path="/admin/households" filename="households" />
            <Button onClick={() => setShowNew(true)}><Plus size={16} /> Register household</Button>
          </div>
        )}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by household code or head of household..."
            className="w-full md:w-72"
          />
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-xs text-slate-400">Sort:</span>
            <Select className="!w-40 shrink-0" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
              <option value="">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Head name A-Z</option>
              <option value="members">Most members</option>
              <option value="code">By code</option>
            </Select>
          </span>
        </div>
      </Card>

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title="No households registered" /></Card>
      ) : (
        <Card className="p-0">
          <Table headers={['Code', 'Head of household', 'Members', 'Village', 'Registered']}>
            {items.map((h) => (
              <tr key={h.id}>
                <td className="py-3 pr-4 font-mono text-xs text-slate-500">{h.code}</td>
                <td className="py-3 pr-4 font-medium text-slate-800">{h.headName}</td>
                <td className="py-3 pr-4 text-slate-600">{h.members}</td>
                <td className="py-3 pr-4 text-slate-600">{h.village?.name}</td>
                <td className="py-3 pr-4 text-slate-500 text-xs">{formatDate(h.createdAt)}</td>
              </tr>
            ))}
          </Table>
          <div className="px-5 pb-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>
        </Card>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Register household">
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <Field label="Head of household" required>
            <Input value={form.headName ?? ''} onChange={(e) => setForm({ ...form, headName: e.target.value })} required />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Members" required>
              <Input type="number" min={1} value={form.members ?? ''} onChange={(e) => setForm({ ...form, members: Number(e.target.value) })} required />
            </Field>
            <Field label="Household code" required>
              <Input value={form.code ?? ''} onChange={(e) => setForm({ ...form, code: e.target.value })} placeholder="e.g. VIL-001" required />
            </Field>
          </div>
          {level === 4 && (
            <Field label="Village" required>
              <Select value={form.villageId ?? ''} onChange={(e) => setForm({ ...form, villageId: Number(e.target.value) })} required>
                <option value="">Select village</option>
                {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </Field>
          )}
          {level === 5 && <p className="text-xs text-slate-400">Household will be registered in your village.</p>}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Register</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
