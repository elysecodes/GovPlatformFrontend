import { FormEvent, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, StatusBadge, Table, formatDate } from '../components/ui';
import { Paginated } from '../lib/types';

interface Unit { id: number; name: string }
interface AdminUser {
  id: number; fullName: string; username: string; email?: string; role: string; roleName: string;
  level: number; status: string; lastLoginAt?: string; createdAt: string; unit?: any;
}

export function Users() {
  const { user } = useAuth();
  const { t } = useTranslation();
  const [items, setItems] = useState<AdminUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const [districts, setDistricts] = useState<Unit[]>([]);
  const [sectors, setSectors] = useState<Unit[]>([]);
  const [cells, setCells] = useState<Unit[]>([]);
  const [villages, setVillages] = useState<Unit[]>([]);

  const myLevel = user?.level ?? 6;
  const creatableRoles = [
    { value: 'PROVINCE_ADMIN', label: t('role.PROVINCE_ADMIN'), minLevel: 1, superOnly: true },
    { value: 'DISTRICT_ADMIN', label: t('role.DISTRICT_ADMIN'), minLevel: 1 },
    { value: 'SECTOR_ADMIN', label: t('role.SECTOR_ADMIN'), minLevel: 2 },
    { value: 'CELL_ADMIN', label: t('role.CELL_ADMIN'), minLevel: 3 },
    { value: 'VILLAGE_ADMIN', label: t('role.VILLAGE_ADMIN'), minLevel: 4 },
  ].filter((r) => (r.superOnly ? user?.role === 'SUPER_ADMIN' : myLevel < r.minLevel));

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paginated<AdminUser>>('/admin/users', { params: { page, limit: 15 } });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [page]);
  useEffect(() => { api.get('/catalog/districts').then((r) => setDistricts(r.data.items)).catch(() => {}); }, []);

  async function loadSectors(d: number) { const r = await api.get(`/catalog/districts/${d}/sectors`); setSectors(r.data.items); }
  async function loadCells(s: number) { const r = await api.get(`/catalog/sectors/${s}/cells`); setCells(r.data.items); }
  async function loadVillages(c: number) { const r = await api.get(`/catalog/cells/${c}/villages`); setVillages(r.data.items); }

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/admin/users', form);
      setShowNew(false);
      setForm({});
      void load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(u: AdminUser, status: string) {
    try {
      await api.put(`/admin/users/${u.id}/status`, { status });
      void load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  const unitLabel = (u: AdminUser) => {
    const un = u.unit;
    if (!un) return '—';
    const parts = [un.province?.name, un.district?.name, un.sector?.name, un.cell?.name, un.village?.name].filter(Boolean);
    return parts.slice(1).join(' / ') || (parts[0] ?? '');
  };

  const STATUS_ACTIONS: { label: string; status: string; danger?: boolean }[] = [
    { label: t('users.activate'), status: 'ACTIVE' },
    { label: t('users.suspend'), status: 'SUSPENDED', danger: true },
    { label: t('users.disable'), status: 'DISABLED', danger: true },
    { label: t('users.deactivate'), status: 'INACTIVE', danger: true },
  ];

  return (
    <div>
      <PageHeader
        title={t('users.title')}
        subtitle={t('users.subtitle')}
        breadcrumb="Northern Province / Accounts"
        actions={creatableRoles.length > 0 && <Button onClick={() => setShowNew(true)}><Plus size={16} /> {t('users.newAccount')}</Button>}
      />

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title={t('users.noAccounts')} /></Card>
      ) : (
        <Card className="p-0">
          <Table headers={[t('users.colName'), t('users.colUsername'), t('users.colRole'), t('users.colUnit'), t('users.colStatus'), t('users.colLastLogin'), t('users.colCreated'), '']}>
            {items.map((u) => (
              <tr key={u.id}>
                <td className="py-3 pr-4 font-medium text-slate-800">{u.fullName}</td>
                <td className="py-3 pr-4 text-slate-600">{u.username}</td>
                <td className="py-3 pr-4 text-slate-600">{u.roleName}</td>
                <td className="py-3 pr-4 text-slate-600 max-w-[240px] truncate">{unitLabel(u)}</td>
                <td className="py-3 pr-4"><StatusBadge status={u.status} /></td>
                <td className="py-3 pr-4 text-slate-500 text-xs">{u.lastLoginAt ? formatDate(u.lastLoginAt) : '—'}</td>
                <td className="py-3 pr-4 text-slate-500 text-xs">{formatDate(u.createdAt)}</td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-1">
                    {STATUS_ACTIONS.filter((a) => a.status !== u.status).map((a) => (
                      <button
                        key={a.status}
                        type="button"
                        onClick={() => setStatus(u, a.status)}
                        className={`inline-flex items-center whitespace-nowrap rounded px-1.5 py-0.5 text-[11px] font-medium transition-colors ${
                          a.danger ? 'text-red-600 hover:bg-red-50' : 'text-brand-700 hover:bg-brand-50'
                        }`}
                      >
                        {a.label}
                      </button>
                    ))}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <div className="px-5 pb-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>
        </Card>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title={t('users.createModalTitle')} wide>
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <div className="grid grid-cols-2 gap-3">
            <Field label={t('users.fullName')} required>
              <Input value={form.fullName ?? ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </Field>
            <Field label={t('users.role')} required>
              <Select value={form.role ?? ''} onChange={(e) => setForm({ ...form, role: e.target.value })} required>
                <option value="">{t('users.selectRole')}</option>
                {creatableRoles.map((r) => <option key={r.value} value={r.value}>{r.label}</option>)}
              </Select>
            </Field>
            <Field label={t('users.username')} required>
              <Input value={form.username ?? ''} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </Field>
            <Field label={t('users.email')}>
              <Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label={t('users.phone')}>
              <Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label={t('users.tempPassword')} required hint={t('users.passwordHint')}>
              <Input type="password" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100">
            <Field label={t('users.district')} required>
              <Select value={form.districtId ?? ''} onChange={(e) => { loadSectors(Number(e.target.value)); setForm({ ...form, provinceId: 1, districtId: Number(e.target.value), sectorId: undefined, cellId: undefined, villageId: undefined }); setSectors([]); setCells([]); setVillages([]); }} required>
                <option value="">{t('users.select')}</option>
                {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </Select>
            </Field>
            <Field label={t('users.sector')} required={form.role && form.role !== 'DISTRICT_ADMIN'}>
              <Select value={form.sectorId ?? ''} disabled={!sectors.length} onChange={(e) => { loadCells(Number(e.target.value)); setForm({ ...form, sectorId: Number(e.target.value), cellId: undefined, villageId: undefined }); setCells([]); setVillages([]); }}>
                <option value="">{t('users.select')}</option>
                {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </Select>
            </Field>
            <Field label={t('users.cell')} required={form.role === 'CELL_ADMIN' || form.role === 'VILLAGE_ADMIN'}>
              <Select value={form.cellId ?? ''} disabled={!cells.length} onChange={(e) => { loadVillages(Number(e.target.value)); setForm({ ...form, cellId: Number(e.target.value), villageId: undefined }); setVillages([]); }}>
                <option value="">{t('users.select')}</option>
                {cells.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </Select>
            </Field>
            <Field label={t('users.village')} required={form.role === 'VILLAGE_ADMIN'}>
              <Select value={form.villageId ?? ''} disabled={!villages.length} onChange={(e) => setForm({ ...form, villageId: Number(e.target.value) })}>
                <option value="">{t('users.select')}</option>
                {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </Field>
          </div>

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>{t('users.cancel')}</Button>
            <Button type="submit" loading={saving}>{t('users.createAccount')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
