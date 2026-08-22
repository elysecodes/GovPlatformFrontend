import { FormEvent, useEffect, useState } from 'react';
import { Plus, Pencil, KeyRound, Ban, CheckCircle2 } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, Spinner, StatusBadge, Table, formatDate } from '../components/ui';
import { Paginated } from '../lib/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { ExportCsvButton } from '../components/ExportCsv';

interface Unit { id: number; name: string }
interface Citizen {
  id: number;
  user?: { id: number; fullName: string; username: string; email?: string; phone?: string; status: string; createdAt: string };
  village?: { id: number; name: string };
  household?: { code: string; headName: string };
  nationalId?: string;
  gender?: string;
  dateOfBirth?: string;
  createdAt: string;
}

export function Citizens() {
  const { user } = useAuth();
  const level = user?.level ?? 6;
  const isAdmin = level < 6;

  const [items, setItems] = useState<Citizen[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [error, setError] = useState('');

  const [scope, setScope] = useState<any>(null);
  const [districts, setDistricts] = useState<Unit[]>([]);
  const [sectors, setSectors] = useState<Unit[]>([]);
  const [cells, setCells] = useState<Unit[]>([]);
  const [villages, setVillages] = useState<Unit[]>([]);

  const [createOpen, setCreateOpen] = useState(false);
  const [editTarget, setEditTarget] = useState<Citizen | null>(null);
  const [pwdTarget, setPwdTarget] = useState<Citizen | null>(null);
  const [delTarget, setDelTarget] = useState<Citizen | null>(null);
  const [form, setForm] = useState<any>({});
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (debouncedSearch) params.q = debouncedSearch;
      if (sort) params.sort = sort;
      const res = await api.get<Paginated<Citizen>>('/citizens', { params });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
      setError('');
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [page, debouncedSearch, sort]);

  useEffect(() => {
    if (!isAdmin) return;
    void api.get('/catalog/scope-tree').then((r) => {
      const s = r.data.scope;
      setScope(s);
      if (s.level >= 5 && s.villageId) {
        setForm((f: any) => ({ ...f, villageId: s.villageId }));
      } else if (s.level === 4 && s.cellId) {
        void api.get(`/catalog/cells/${s.cellId}/villages`).then((v) => setVillages(v.data.items)).catch(() => {});
      } else {
        void api.get('/catalog/districts').then((d) => setDistricts(d.data.items)).catch(() => {});
      }
    }).catch(() => {});
  }, [isAdmin]);

  async function loadSectors(d: number) { const r = await api.get(`/catalog/districts/${d}/sectors`); setSectors(r.data.items); }
  async function loadCells(s: number) { const r = await api.get(`/catalog/sectors/${s}/cells`); setCells(r.data.items); }
  async function loadVillages(c: number) { const r = await api.get(`/catalog/cells/${c}/villages`); setVillages(r.data.items); }

  function resetLocation() {
    setForm((f: any) => ({ ...f, districtId: undefined, sectorId: undefined, cellId: undefined, villageId: undefined }));
    setSectors([]); setCells([]); setVillages([]);
  }

  async function submitCreate(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/citizens', form);
      setCreateOpen(false);
      setForm({});
      resetLocation();
      setPage(1);
      void load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function submitEdit(e: FormEvent) {
    e.preventDefault();
    if (!editTarget) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/citizens/${editTarget.id}`, form);
      setEditTarget(null);
      void load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function submitPassword(e: FormEvent) {
    e.preventDefault();
    if (!pwdTarget) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/citizens/${pwdTarget.id}/password`, { password: form.password });
      setPwdTarget(null);
      setForm({});
      void load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function submitDeactivate() {
    if (!delTarget) return;
    setSaving(true);
    setError('');
    try {
      await api.put(`/citizens/${delTarget.id}/status`, { status: 'INACTIVE' });
      setDelTarget(null);
      void load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function submitActivate(c: Citizen) {
    setError('');
    try {
      await api.put(`/citizens/${c.id}/status`, { status: 'ACTIVE' });
      void load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  function openEdit(c: Citizen) {
    setForm({
      fullName: c.user?.fullName ?? '',
      email: c.user?.email ?? '',
      phone: c.user?.phone ?? '',
      nationalId: c.nationalId ?? '',
      gender: c.gender ?? '',
      dateOfBirth: c.dateOfBirth ? c.dateOfBirth.slice(0, 10) : '',
      villageId: c.village?.id,
    });
    setEditTarget(c);
  }

  const locationVisible = (level <= 3 || (level === 4 && villages.length > 0) || (level >= 5 && !!scope?.villageId));
  const fixedVillage = level >= 5 ? scope?.village : null;

  return (
    <div>
      <PageHeader
        title="Registered Citizens"
        subtitle="Citizens within your jurisdiction"
        breadcrumb="Northern Province / Citizens"
        actions={isAdmin && (
          <div className="flex flex-wrap gap-2">
            <ExportCsvButton path="/citizens" filename="citizens" />
            <Button onClick={() => { resetLocation(); setCreateOpen(true); }}><Plus size={16} /> New citizen</Button>
          </div>
        )}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by name, username or national ID..."
            className="w-full md:w-72"
          />
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-xs text-slate-400">Sort:</span>
            <Select className="!w-40 shrink-0" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
              <option value="">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="name">Name A-Z</option>
              <option value="status">By status</option>
            </Select>
          </span>
        </div>
      </Card>

      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title="No registered citizens" /></Card>
      ) : (
        <Card className="p-0">
          <Table headers={['Name', 'Username', 'National ID', 'Gender', 'Village', 'Phone', 'Status', 'Registered', '']}>
            {items.map((c) => (
              <tr key={c.id}>
                <td className="py-3 pr-4 font-medium text-slate-800">{c.user?.fullName}</td>
                <td className="py-3 pr-4 font-mono text-xs text-slate-500">{c.user?.username}</td>
                <td className="py-3 pr-4 font-mono text-xs text-slate-500">{c.nationalId ?? '—'}</td>
                <td className="py-3 pr-4 text-slate-600">{c.gender ?? '—'}</td>
                <td className="py-3 pr-4 text-slate-600">{c.village?.name}</td>
                <td className="py-3 pr-4 text-slate-600">{c.user?.phone ?? '—'}</td>
                <td className="py-3 pr-4"><StatusBadge status={c.user?.status ?? 'ACTIVE'} /></td>
                <td className="py-3 pr-4 text-slate-500 text-xs">{formatDate(c.createdAt)}</td>
                <td className="py-3 pr-4">
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button type="button" onClick={() => openEdit(c)} title="Edit credentials" className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-brand-700 hover:bg-brand-50">
                        <Pencil size={12} className="mr-0.5" /> Edit
                      </button>
                      <button type="button" onClick={() => { setForm({}); setPwdTarget(c); }} title="Reset password" className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-100">
                        <KeyRound size={12} className="mr-0.5" /> Reset
                      </button>
                      {c.user?.status === 'ACTIVE' ? (
                        <button type="button" onClick={() => setDelTarget(c)} title="Deactivate" className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50">
                          <Ban size={12} className="mr-0.5" /> Deactivate
                        </button>
                      ) : (
                        <button type="button" onClick={() => submitActivate(c)} title="Activate" className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50">
                          <CheckCircle2 size={12} className="mr-0.5" /> Activate
                        </button>
                      )}
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
          <div className="px-5 pb-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>
        </Card>
      )}

      <Modal open={createOpen} onClose={() => setCreateOpen(false)} title="New citizen account" wide>
        <form onSubmit={submitCreate} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Full name" required>
              <Input value={form.fullName ?? ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </Field>
            <Field label="Username" required hint="Letters, numbers, _ .">
              <Input value={form.username ?? ''} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="National ID">
              <Input value={form.nationalId ?? ''} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
            </Field>
            <Field label="Gender">
              <Select value={form.gender ?? ''} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
              </Select>
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={form.dateOfBirth ?? ''} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </Field>
            <Field label="Temporary password" required hint="At least 8 characters. Citizen changes it on first login.">
              <Input type="password" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </Field>
          </div>

          {locationVisible && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-slate-100">
              {level >= 5 ? (
                <Field label="Village" required>
                  <Input value={fixedVillage?.name ?? ''} disabled />
                </Field>
              ) : level === 4 ? (
                <Field label="Village" required>
                  <Select value={form.villageId ?? ''} onChange={(e) => setForm({ ...form, villageId: Number(e.target.value) })} required>
                    <option value="">Select village</option>
                    {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </Select>
                </Field>
              ) : (
                <>
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
                </>
              )}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setCreateOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create account</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit citizen — ${editTarget?.user?.fullName ?? ''}`} wide>
        <form onSubmit={submitEdit} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Full name" required>
              <Input value={form.fullName ?? ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </Field>
            <Field label="Username">
              <Input value={editTarget?.user?.username ?? ''} disabled />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
            </Field>
            <Field label="National ID">
              <Input value={form.nationalId ?? ''} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
            </Field>
            <Field label="Gender">
              <Select value={form.gender ?? ''} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                <option value="">Select</option>
                <option>Male</option>
                <option>Female</option>
              </Select>
            </Field>
            <Field label="Date of birth">
              <Input type="date" value={form.dateOfBirth ?? ''} onChange={(e) => setForm({ ...form, dateOfBirth: e.target.value })} />
            </Field>
          </div>

          {level >= 5 ? (
            <Field label="Village">
              <Input value={editTarget?.village?.name ?? ''} disabled />
            </Field>
          ) : level === 4 ? (
            <Field label="Village">
              <Select value={form.villageId ?? ''} onChange={(e) => setForm({ ...form, villageId: Number(e.target.value) })}>
                <option value="">Select village</option>
                {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
              </Select>
            </Field>
          ) : (
            <Field label="Village">
              <Input value={editTarget?.village?.name ?? '—'} disabled />
            </Field>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button type="submit" loading={saving}>Save changes</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!pwdTarget} onClose={() => setPwdTarget(null)} title={`Reset password — ${pwdTarget?.user?.fullName ?? ''}`}>
        <form onSubmit={submitPassword} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <p className="text-sm text-slate-500">Set a new temporary password. The citizen must change it on their next login.</p>
          <Field label="New temporary password" required hint="At least 8 characters">
            <Input type="password" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} required autoFocus />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setPwdTarget(null)}>Cancel</Button>
            <Button type="submit" loading={saving}>Reset password</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!delTarget} onClose={() => setDelTarget(null)} title={`Deactivate citizen — ${delTarget?.user?.fullName ?? ''}`}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <div className="flex items-center gap-3 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
            <Ban size={16} />
            <span>This will disable the citizen's account. Their records and history are preserved.</span>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setDelTarget(null)}>Cancel</Button>
            <Button variant="danger" onClick={submitDeactivate} loading={saving}>Deactivate account</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}