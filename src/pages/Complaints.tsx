import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, Spinner, StatusBadge, Table, Textarea, formatDate } from '../components/ui';
import { Complaint, Paginated } from '../lib/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { ExportCsvButton } from '../components/ExportCsv';

interface Unit { id: number; name: string }

export function Complaints() {
  const { user } = useAuth();
  const isCitizen = user?.level === 6;
  const navigate = useNavigate();
  const location = useLocation();
  const showNew = location.pathname.endsWith('/new');

  const [items, setItems] = useState<Complaint[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [sort, setSort] = useState('');
  const [categories, setCategories] = useState<any[]>([]);

  const [districts, setDistricts] = useState<Unit[]>([]);
  const [sectors, setSectors] = useState<Unit[]>([]);
  const [cells, setCells] = useState<Unit[]>([]);
  const [villages, setVillages] = useState<Unit[]>([]);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  async function load() {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (status) params.status = status;
      if (categoryId) params.categoryId = categoryId;
      if (sort) params.sort = sort;
      if (debouncedSearch) params.q = debouncedSearch;
      const res = await api.get<Paginated<Complaint>>('/complaints', { params });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
      setTotal(res.data.pagination.total);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [page, status, categoryId, sort, debouncedSearch]);
  useEffect(() => { api.get('/complaints/categories').then((r) => setCategories(r.data.items)).catch(() => {}); }, []);
  useEffect(() => { api.get('/catalog/districts').then((r) => setDistricts(r.data.items)).catch(() => {}); }, []);

  async function loadSectors(d: number) { const r = await api.get(`/catalog/districts/${d}/sectors`); setSectors(r.data.items); }
  async function loadCells(s: number) { const r = await api.get(`/catalog/sectors/${s}/cells`); setCells(r.data.items); }
  async function loadVillages(c: number) { const r = await api.get(`/catalog/cells/${c}/villages`); setVillages(r.data.items); }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/complaints', form);
      navigate('/complaints');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Complaints"
        subtitle={`${total} records`}
        breadcrumb="Northern Province / Complaints"
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportCsvButton path="/complaints" filename="complaints" />
            <Button onClick={() => navigate('/complaints/new')}>
              <Plus size={16} /> New complaint
            </Button>
          </div>
        }
      />

      {showNew && (
        <Modal open onClose={() => navigate('/complaints')} title="Submit a complaint" wide>
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label="Category" required>
                <Select value={form.categoryId ?? ''} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })} required>
                  <option value="">Select category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Priority" required>
                <Select value={form.priority ?? 'MEDIUM'} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </Select>
              </Field>
            </div>
            <Field label="Title" required>
              <Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="Short summary of the issue" required />
            </Field>
            <Field label="Description" required>
              <Textarea rows={4} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder="Describe the issue in detail" required />
            </Field>
            <Field label="Location">
              <Input value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder="Landmark, street or area" />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <Field label="District" required>
                <Select value={form.districtId ?? ''} onChange={(e) => { loadSectors(Number(e.target.value)); setForm({ ...form, districtId: Number(e.target.value), sectorId: undefined, cellId: undefined, villageId: undefined }); setSectors([]); setCells([]); setVillages([]); }} required>
                  <option value="">Select</option>
                  {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </Field>
              <Field label="Sector" required>
                <Select value={form.sectorId ?? ''} disabled={!sectors.length} onChange={(e) => { loadCells(Number(e.target.value)); setForm({ ...form, sectorId: Number(e.target.value), cellId: undefined, villageId: undefined }); setCells([]); setVillages([]); }}>
                  <option value="">Select</option>
                  {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label="Cell" required>
                <Select value={form.cellId ?? ''} disabled={!cells.length} onChange={(e) => { loadVillages(Number(e.target.value)); setForm({ ...form, cellId: Number(e.target.value), villageId: undefined }); setVillages([]); }}>
                  <option value="">Select</option>
                  {cells.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Village" required>
                <Select value={form.villageId ?? ''} disabled={!villages.length} onChange={(e) => setForm({ ...form, villageId: Number(e.target.value) })}>
                  <option value="">Select</option>
                  {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </Select>
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => navigate('/complaints')}>Cancel</Button>
              <Button type="submit" loading={saving}>Submit complaint</Button>
            </div>
          </form>
        </Modal>
      )}

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by title or reference..."
            className="w-full md:w-72"
          />
          <Select className="!w-48 shrink-0" value={categoryId} onChange={(e) => { setPage(1); setCategoryId(e.target.value); }}>
            <option value="">All categories</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select className="!w-48 shrink-0" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">All statuses</option>
            {['SUBMITTED', 'RECEIVED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </Select>
          <span className="text-xs text-slate-400">{isCitizen ? 'Your complaints' : 'Complaints within your jurisdiction'}</span>
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-xs text-slate-400">Sort:</span>
            <Select className="!w-40 shrink-0" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
              <option value="">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="status">By status</option>
              <option value="priority">By priority</option>
            </Select>
          </span>
        </div>
      </Card>

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title="No complaints found" /></Card>
      ) : (
        <Card className="p-0">
          <Table headers={['No', 'Title', 'Category', 'Location', 'Status', 'Priority', 'Date']}>
            {items.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/complaints/${c.id}`)}>
                <td className="py-3 pr-4 font-mono text-xs text-slate-500">{c.complaintNo}</td>
                <td className="py-3 pr-4 font-medium text-slate-800 max-w-[280px] truncate">{c.title}</td>
                <td className="py-3 pr-4 text-slate-600">{c.category?.name}</td>
                <td className="py-3 pr-4 text-slate-600">{c.village?.name ?? c.location ?? '—'}</td>
                <td className="py-3 pr-4"><StatusBadge status={c.status} /></td>
                <td className="py-3 pr-4"><StatusBadge status={c.priority} /></td>
                <td className="py-3 pr-4 text-slate-500 text-xs">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </Table>
          <div className="px-5 pb-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>
        </Card>
      )}
    </div>
  );
}
