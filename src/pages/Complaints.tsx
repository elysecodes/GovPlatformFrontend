import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
        title={t('nav.complaints')}
        subtitle={t('complaints.recordCount', { total })}
        breadcrumb={`${t('common.appName')} / ${t('nav.complaints')}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <ExportCsvButton path="/complaints" filename="complaints" />
            <Button onClick={() => navigate('/complaints/new')}>
              <Plus size={16} /> {t('complaints.new')}
            </Button>
          </div>
        }
      />

      {showNew && (
        <Modal open onClose={() => navigate('/complaints')} title={t('complaints.submitTitle')} wide>
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <Field label={t('complaints.category')} required>
                <Select value={form.categoryId ?? ''} onChange={(e) => setForm({ ...form, categoryId: Number(e.target.value) })} required>
                  <option value="">{t('complaints.selectCategory')}</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label={t('complaints.priority')} required>
                <Select value={form.priority ?? 'MEDIUM'} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  <option value="LOW">{t('status.LOW')}</option>
                  <option value="MEDIUM">{t('status.MEDIUM')}</option>
                  <option value="HIGH">{t('status.HIGH')}</option>
                  <option value="URGENT">{t('status.URGENT')}</option>
                </Select>
              </Field>
            </div>
            <Field label={t('complaints.title')} required>
              <Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder={t('complaints.titlePlaceholder')} required />
            </Field>
            <Field label={t('complaints.description')} required>
              <Textarea rows={4} value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} placeholder={t('complaints.descriptionPlaceholder')} required />
            </Field>
            <Field label={t('complaints.location')}>
              <Input value={form.location ?? ''} onChange={(e) => setForm({ ...form, location: e.target.value })} placeholder={t('complaints.locationPlaceholder')} />
            </Field>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              <Field label={t('register.district')} required>
                <Select value={form.districtId ?? ''} onChange={(e) => { loadSectors(Number(e.target.value)); setForm({ ...form, districtId: Number(e.target.value), sectorId: undefined, cellId: undefined, villageId: undefined }); setSectors([]); setCells([]); setVillages([]); }} required>
                  <option value="">{t('register.select')}</option>
                  {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </Select>
              </Field>
              <Field label={t('register.sector')} required>
                <Select value={form.sectorId ?? ''} disabled={!sectors.length} onChange={(e) => { loadCells(Number(e.target.value)); setForm({ ...form, sectorId: Number(e.target.value), cellId: undefined, villageId: undefined }); setCells([]); setVillages([]); }}>
                  <option value="">{t('register.select')}</option>
                  {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </Select>
              </Field>
              <Field label={t('register.cell')} required>
                <Select value={form.cellId ?? ''} disabled={!cells.length} onChange={(e) => { loadVillages(Number(e.target.value)); setForm({ ...form, cellId: Number(e.target.value), villageId: undefined }); setVillages([]); }}>
                  <option value="">{t('register.select')}</option>
                  {cells.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label={t('register.village')} required>
                <Select value={form.villageId ?? ''} disabled={!villages.length} onChange={(e) => setForm({ ...form, villageId: Number(e.target.value) })}>
                  <option value="">{t('register.select')}</option>
                  {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                </Select>
              </Field>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="secondary" onClick={() => navigate('/complaints')}>{t('common.cancel')}</Button>
              <Button type="submit" loading={saving}>{t('complaints.submit')}</Button>
            </div>
          </form>
        </Modal>
      )}

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder={t('complaints.searchPlaceholder')}
            className="w-full md:w-72"
          />
          <Select className="!w-48 shrink-0" value={categoryId} onChange={(e) => { setPage(1); setCategoryId(e.target.value); }}>
            <option value="">{t('complaints.allCategories')}</option>
            {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </Select>
          <Select className="!w-48 shrink-0" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">{t('complaints.allStatuses')}</option>
            {['SUBMITTED', 'RECEIVED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED', 'ESCALATED'].map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </Select>
          <span className="text-xs text-slate-400">{isCitizen ? t('complaints.yourComplaints') : t('complaints.withinJurisdiction')}</span>
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-xs text-slate-400">{t('complaints.sort')}</span>
            <Select className="!w-40 shrink-0" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
              <option value="">{t('complaints.sortNewest')}</option>
              <option value="oldest">{t('complaints.sortOldest')}</option>
              <option value="status">{t('complaints.sortByStatus')}</option>
              <option value="priority">{t('complaints.sortByPriority')}</option>
            </Select>
          </span>
        </div>
      </Card>

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title={t('complaints.empty')} /></Card>
      ) : (
        <Card className="p-0">
          <Table headers={[t('complaints.colNo'), t('complaints.title'), t('complaints.category'), t('complaints.location'), t('users.colStatus'), t('complaints.priority'), t('complaints.colDate')]}>
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
