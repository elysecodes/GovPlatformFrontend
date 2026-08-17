import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, StatusBadge, Table, Textarea, formatDate } from '../components/ui';
import { Paginated, ServiceRequest } from '../lib/types';

interface Unit { id: number; name: string }

export function Requests() {
  const { user } = useAuth();
  const isCitizen = user?.level === 6;
  const navigate = useNavigate();
  const location = useLocation();
  const showNew = location.pathname.endsWith('/new');

  const [items, setItems] = useState<ServiceRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [types, setTypes] = useState<any[]>([]);

  const [districts, setDistricts] = useState<Unit[]>([]);
  const [sectors, setSectors] = useState<Unit[]>([]);
  const [cells, setCells] = useState<Unit[]>([]);
  const [villages, setVillages] = useState<Unit[]>([]);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (status) params.status = status;
      const res = await api.get<Paginated<ServiceRequest>>('/requests', { params });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
      setTotal(res.data.pagination.total);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [page, status]);
  useEffect(() => { api.get('/requests/types').then((r) => setTypes(r.data.items)).catch(() => {}); }, []);
  useEffect(() => { api.get('/catalog/districts').then((r) => setDistricts(r.data.items)).catch(() => {}); }, []);

  async function loadSectors(d: number) { const r = await api.get(`/catalog/districts/${d}/sectors`); setSectors(r.data.items); }
  async function loadCells(s: number) { const r = await api.get(`/catalog/sectors/${s}/cells`); setCells(r.data.items); }
  async function loadVillages(c: number) { const r = await api.get(`/catalog/cells/${c}/villages`); setVillages(r.data.items); }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/requests', form);
      navigate('/requests');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title="Service Requests"
        subtitle={`${total} records`}
        breadcrumb="Northern Province / Service Requests"
        actions={<Button onClick={() => navigate('/requests/new')}><Plus size={16} /> New request</Button>}
      />

      {showNew && (
        <Modal open onClose={() => navigate('/requests')} title="Submit a service request" wide>
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label="Service type" required>
              <Select value={form.serviceTypeId ?? ''} onChange={(e) => setForm({ ...form, serviceTypeId: Number(e.target.value) })} required>
                <option value="">Select service</option>
                {types.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </Select>
            </Field>
            <Field label="Title" required>
              <Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
            </Field>
            <Field label="Description" required>
              <Textarea rows={4} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} required />
            </Field>
            <Field label="Location">
              <Input value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} />
            </Field>

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

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => navigate('/requests')}>Cancel</Button>
              <Button type="submit" loading={saving}>Submit request</Button>
            </div>
          </form>
        </Modal>
      )}

      <Card className="mb-4">
        <div className="flex items-center gap-3">
          <Select className="w-48" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">All statuses</option>
            {['SUBMITTED', 'RECEIVED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </Select>
          <span className="text-xs text-slate-400">{isCitizen ? 'Your requests' : 'Requests within your jurisdiction'}</span>
        </div>
      </Card>

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title="No service requests found" /></Card>
      ) : (
        <Card className="p-0">
          <Table headers={['No', 'Title', 'Service', 'Location', 'Status', 'Date']}>
            {items.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/requests/${r.id}`)}>
                <td className="py-3 pr-4 font-mono text-xs text-slate-500">{r.requestNo}</td>
                <td className="py-3 pr-4 font-medium text-slate-800 max-w-[280px] truncate">{r.title}</td>
                <td className="py-3 pr-4 text-slate-600">{r.serviceType?.name}</td>
                <td className="py-3 pr-4 text-slate-600">{r.village?.name ?? r.location}</td>
                <td className="py-3 pr-4"><StatusBadge status={r.status} /></td>
                <td className="py-3 pr-4 text-slate-500 text-xs">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
          </Table>
          <div className="px-5 pb-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>
        </Card>
      )}
    </div>
  );
}
