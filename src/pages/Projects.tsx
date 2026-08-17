import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, StatusBadge, Table, Textarea, formatDate, money } from '../components/ui';
import { Paginated, Project } from '../lib/types';

interface Unit { id: number; name: string }

export function Projects() {
  const { user } = useAuth();
  const isAdmin = (user?.level ?? 6) < 6;
  const navigate = useNavigate();
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [districts, setDistricts] = useState<Unit[]>([]);
  const [sectors, setSectors] = useState<Unit[]>([]);
  const [cells, setCells] = useState<Unit[]>([]);
  const [villages, setVillages] = useState<Unit[]>([]);

  async function load() {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (status) params.status = status;
      const res = await api.get<Paginated<Project>>('/projects', { params });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [page, status]);
  useEffect(() => { api.get('/catalog/districts').then((r) => setDistricts(r.data.items)).catch(() => {}); }, []);

  async function loadSectors(d: number) { const r = await api.get(`/catalog/districts/${d}/sectors`); setSectors(r.data.items); }
  async function loadCells(s: number) { const r = await api.get(`/catalog/sectors/${s}/cells`); setCells(r.data.items); }
  async function loadVillages(c: number) { const r = await api.get(`/catalog/cells/${c}/villages`); setVillages(r.data.items); }

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/projects', form);
      navigate(`/projects/${res.data.project.id}`);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Development Projects"
        subtitle="Infrastructure and community development initiatives"
        breadcrumb="Northern Province / Projects"
        actions={isAdmin && <Button onClick={() => setShowNew(true)}><Plus size={16} /> New project</Button>}
      />

      <Card className="mb-4">
        <Select className="w-48" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
          <option value="">All statuses</option>
          {['PLANNED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'SUSPENDED'].map((s) => (
            <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
          ))}
        </Select>
      </Card>

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title="No projects" /></Card>
      ) : (
        <Card className="p-0">
          <Table headers={['Project', 'Location', 'Status', 'Progress', 'Budget', 'Beneficiaries']}>
            {items.map((p) => (
              <tr key={p.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/projects/${p.id}`)}>
                <td className="py-3 pr-4 font-medium text-slate-800 max-w-[260px] truncate">{p.title}</td>
                <td className="py-3 pr-4 text-slate-600">{p.village?.name ?? p.location}</td>
                <td className="py-3 pr-4"><StatusBadge status={p.status} /></td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 w-20 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-600" style={{ width: `${p.progress}%` }} />
                    </div>
                    {p.progress}%
                  </div>
                </td>
                <td className="py-3 pr-4 text-slate-600">{money(Number(p.budget))}</td>
                <td className="py-3 pr-4 text-slate-600">{p.beneficiaries}</td>
              </tr>
            ))}
          </Table>
          <div className="px-5 pb-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>
        </Card>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create a project" wide>
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <Field label="Project name" required>
            <Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>
          <Field label="Description" required>
            <Textarea rows={3} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
          </Field>
          <Field label="Location">
            <Input value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date"><Input type="date" value={form.startDate ?? ''} onChange={(e) => setForm({ ...form, startDate: e.target.value })} /></Field>
            <Field label="Expected completion"><Input type="date" value={form.expectedEndDate ?? ''} onChange={(e) => setForm({ ...form, expectedEndDate: e.target.value })} /></Field>
            <Field label="Budget (RWF)"><Input type="number" value={form.budget ?? ''} onChange={(e) => setForm({ ...form, budget: e.target.value })} /></Field>
            <Field label="Funding source"><Input value={form.fundingSource ?? ''} onChange={(e) => setForm({ ...form, fundingSource: e.target.value })} /></Field>
            <Field label="Beneficiaries"><Input type="number" value={form.beneficiaries ?? ''} onChange={(e) => setForm({ ...form, beneficiaries: e.target.value })} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
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
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create project</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
