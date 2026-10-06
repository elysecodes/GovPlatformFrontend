import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { VillagePicker } from '../components/VillagePicker';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, Spinner, StatusBadge, Table } from '../components/ui';
import { Paginated } from '../lib/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

interface Cooperative {
  id: number;
  name: string;
  description?: string;
  activity?: string;
  leaderName?: string;
  membersCount: number;
  status: string;
  village?: { id: number; name: string };
}

export function Cooperatives() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const isAdmin = (user?.level ?? 6) < 6;
  const [items, setItems] = useState<Cooperative[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const debouncedSearch = useDebouncedValue(search);
  const [showNew, setShowNew] = useState(false);
  const [editTarget, setEditTarget] = useState<Cooperative | null>(null);
  const [closeTarget, setCloseTarget] = useState<Cooperative | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Cooperative | null>(null);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paginated<Cooperative>>('/cooperatives', { params: { page, limit: 15, q: debouncedSearch || undefined, sort: sort || undefined, status: statusFilter || undefined } });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
      setError('');
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [page, debouncedSearch, sort, statusFilter]);

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
    setSaving(true); setError('');
    try { await api.delete(`/cooperatives/${id}`); setDeleteTarget(null); void load(); } catch (err) { setError(apiError(err)); } finally { setSaving(false); }
  }

  function openEdit(c: Cooperative) {
    setForm({ name: c.name, description: c.description ?? '', activity: c.activity ?? '', leaderName: c.leaderName ?? '', membersCount: c.membersCount });
    setEditTarget(c);
  }

  async function toggleStatus() {
    if (!closeTarget) return;
    setSaving(true); setError('');
    try {
      await api.put(`/cooperatives/${closeTarget.id}`, { status: closeTarget.status === 'ACTIVE' ? 'CLOSED' : 'ACTIVE' });
      setCloseTarget(null); void load();
    } catch (err) { setError(apiError(err)); } finally { setSaving(false); }
  }

  return (
    <div>
      <PageHeader
        title={t('cooperatives.title')}
        subtitle={t('cooperatives.subtitle')}
        breadcrumb={`${t('common.appName')} / ${t('nav.cooperatives')}`}
        actions={isAdmin && <Button onClick={() => { setForm({}); setShowNew(true); }}><Plus size={16} /> {t('cooperatives.newCooperative')}</Button>}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput value={search} onChange={(v) => { setSearch(v); setPage(1); }} placeholder={t('cooperatives.searchPlaceholder')} className="w-full md:w-72" />
          <Select className="!w-40 shrink-0" value={statusFilter} onChange={(e) => { setPage(1); setStatusFilter(e.target.value); }}>
            <option value="">{t('cooperatives.allStatuses')}</option>
            <option value="ACTIVE">{t('status.ACTIVE')}</option>
            <option value="CLOSED">{t('status.CLOSED')}</option>
          </Select>
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-xs text-slate-400">{t('cooperatives.sort')}</span>
            <Select className="!w-40 shrink-0" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
              <option value="">{t('cooperatives.sortNewest')}</option>
              <option value="oldest">{t('cooperatives.sortOldest')}</option>
              <option value="name">{t('cooperatives.sortName')}</option>
              <option value="members">{t('cooperatives.sortMembers')}</option>
            </Select>
          </span>
        </div>
      </Card>
      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title={t('cooperatives.empty')} /></Card>
      ) : (
        <Card className="p-0">
          <Table headers={[t('users.colName'), t('cooperatives.colActivity'), t('cooperatives.colLeader'), t('cooperatives.colMembers'), t('cooperatives.colVillage'), '']}>
            {items.map((c) => (
              <tr key={c.id}>
                <td className="py-3 pr-4">
                  <div className="font-medium text-slate-800">{c.name}</div>
                  <div className="text-xs text-slate-500 max-w-[260px] truncate">{c.description ?? ''}</div>
                  <div className="mt-0.5"><StatusBadge status={c.status} /></div>
                </td>
                <td className="py-3 pr-4 text-slate-600">{c.activity ?? '—'}</td>
                <td className="py-3 pr-4 text-slate-600">{c.leaderName ?? '—'}</td>
                <td className="py-3 pr-4 text-slate-600">{c.membersCount}</td>
                <td className="py-3 pr-4 text-slate-600">{c.village?.name}</td>
                <td className="py-3 pr-4">
                  {isAdmin && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => openEdit(c)} title={t('common.edit')} className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-brand-700 hover:bg-brand-50"><Pencil size={12} className="mr-0.5" /> {t('common.edit')}</button>
                      <button onClick={() => { setCloseTarget(c); setError(''); }} title={c.status === 'ACTIVE' ? t('cooperatives.closeCooperative') : t('cooperatives.reopenCooperative')} className={`inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium hover:bg-slate-50 ${c.status === 'ACTIVE' ? 'text-amber-700' : 'text-emerald-700'}`}>{c.status === 'ACTIVE' ? t('cooperatives.closeCooperative') : t('cooperatives.reopenCooperative')}</button>
                      <button onClick={() => { setDeleteTarget(c); setError(''); }} title={t('common.delete')} className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50"><Trash2 size={12} className="mr-0.5" /> {t('common.delete')}</button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </Table>
          <div className="px-5 pb-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>
        </Card>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title={t('cooperatives.registerTitle')} wide>
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('cooperatives.name')} required><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label={t('cooperatives.activity')}><Input value={form.activity ?? ''} onChange={(e) => setForm({ ...form, activity: e.target.value })} /></Field>
            <Field label={t('cooperatives.leaderName')}><Input value={form.leaderName ?? ''} onChange={(e) => setForm({ ...form, leaderName: e.target.value })} /></Field>
            <Field label={t('cooperatives.membersCount')}><Input type="number" min={0} value={form.membersCount ?? 0} onChange={(e) => setForm({ ...form, membersCount: Number(e.target.value) })} /></Field>
          </div>
          <Field label={t('cooperatives.description')}><Input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <VillagePicker value={form.villageId} onChange={(v) => setForm({ ...form, villageId: v })} required />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={saving}>{t('cooperatives.register')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editTarget} onClose={() => setEditTarget(null)} title={t('cooperatives.editTitle')} wide>
        <form onSubmit={update} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('cooperatives.name')} required><Input value={form.name ?? ''} onChange={(e) => setForm({ ...form, name: e.target.value })} required /></Field>
            <Field label={t('cooperatives.activity')}><Input value={form.activity ?? ''} onChange={(e) => setForm({ ...form, activity: e.target.value })} /></Field>
            <Field label={t('cooperatives.leaderName')}><Input value={form.leaderName ?? ''} onChange={(e) => setForm({ ...form, leaderName: e.target.value })} /></Field>
            <Field label={t('cooperatives.membersCount')}><Input type="number" min={0} value={form.membersCount ?? 0} onChange={(e) => setForm({ ...form, membersCount: Number(e.target.value) })} /></Field>
          </div>
          <Field label={t('cooperatives.description')}><Input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <Field label={t('cooperatives.village')}><Input value={editTarget?.village?.name ?? '—'} disabled /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setEditTarget(null)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={saving}>{t('cooperatives.saveChanges')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!closeTarget} onClose={() => setCloseTarget(null)} title={closeTarget?.status === 'ACTIVE' ? t('cooperatives.closeConfirmTitle') : t('cooperatives.reopenCooperative')}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <p className="text-sm text-slate-600">{closeTarget?.status === 'ACTIVE' ? t('cooperatives.closeConfirm', { name: closeTarget?.name }) : t('cooperatives.reopenCooperative')}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setCloseTarget(null); setError(''); }}>{t('common.cancel')}</Button>
            <Button type="button" loading={saving} onClick={toggleStatus}>{closeTarget?.status === 'ACTIVE' ? t('cooperatives.closeCooperative') : t('cooperatives.reopenCooperative')}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('common.deleteConfirmTitle')}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <p className="text-sm text-slate-600">{t('common.deleteConfirm', { name: deleteTarget?.name })}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setDeleteTarget(null); setError(''); }}>{t('common.cancel')}</Button>
            <Button type="button" loading={saving} onClick={() => remove(deleteTarget!.id)}>{t('common.delete')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}