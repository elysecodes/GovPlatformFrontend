import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, Spinner, StatusBadge, Table, Textarea, formatDate } from '../components/ui';
import { Paginated, Report } from '../lib/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { ExportCsvButton } from '../components/ExportCsv';

export function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [items, setItems] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [status, setStatus] = useState('');
  const [level, setLevel] = useState('');
  const [sort, setSort] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState({ title: '', content: '' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  const isAdmin = (user?.level ?? 6) < 6;
  const canCreate = isAdmin && user?.level! >= 2 && user?.level! <= 5;

  async function load() {
    setLoading(true);
    try {
      const params: any = { page, limit: 15 };
      if (status) params.status = status;
      if (level) params.level = level;
      if (sort) params.sort = sort;
      if (debouncedSearch) params.q = debouncedSearch;
      const res = await api.get<Paginated<Report>>('/reports', { params });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
      setTotal(res.data.pagination.total);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [page, status, level, sort, debouncedSearch]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const res = await api.post('/reports', form);
      navigate(`/reports/${res.data.report.id}`);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t('reports.title')}
        subtitle={t('reports.count', { count: total })}
        breadcrumb={t('reports.breadcrumb')}
        actions={canCreate && (
          <div className="flex flex-wrap gap-2">
            <ExportCsvButton path="/reports" filename="reports" />
            <Button onClick={() => setShowNew(true)}><Plus size={16} /> {t('reports.newReport')}</Button>
          </div>
        )}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder={t('reports.searchPlaceholder')}
            className="w-full md:w-72"
          />
          <Select className="!w-48 shrink-0" value={level} onChange={(e) => { setPage(1); setLevel(e.target.value); }}>
            <option value="">{t('reports.allLevels')}</option>
            {['VILLAGE', 'CELL', 'SECTOR', 'DISTRICT'].map((l) => (
              <option key={l} value={l}>{t(`reports.levels.${l}`)}</option>
            ))}
          </Select>
          <Select className="!w-48 shrink-0" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">{t('reports.allStatuses')}</option>
            {['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REVISION', 'FINALIZED'].map((s) => (
              <option key={s} value={s}>{t(`status.${s}`)}</option>
            ))}
          </Select>
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-xs text-slate-400">{t('reports.sort')}</span>
            <Select className="!w-40 shrink-0" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
              <option value="">{t('reports.sortNewest')}</option>
              <option value="oldest">{t('reports.sortOldest')}</option>
              <option value="status">{t('reports.sortByStatus')}</option>
              <option value="title">{t('reports.sortTitleAZ')}</option>
            </Select>
          </span>
        </div>
      </Card>

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title={t('reports.noReports')} /></Card>
      ) : (
        <Card className="p-0">
          <Table headers={[t('reports.colTitle'), t('reports.colLevel'), t('reports.colAuthor'), t('users.colStatus'), t('reports.colSubmitted'), t('reports.colDate')]}>
            {items.map((r) => (
              <tr key={r.id} className="hover:bg-slate-50 cursor-pointer" onClick={() => navigate(`/reports/${r.id}`)}>
                <td className="py-3 pr-4 font-medium text-slate-800 max-w-[300px] truncate">{r.title}</td>
                <td className="py-3 pr-4 text-slate-600">{r.level}</td>
                <td className="py-3 pr-4 text-slate-600">{r.author?.fullName}</td>
                <td className="py-3 pr-4"><StatusBadge status={r.status} /></td>
                <td className="py-3 pr-4 text-slate-500 text-xs">{r.submittedAt ? formatDate(r.submittedAt) : '—'}</td>
                <td className="py-3 pr-4 text-slate-500 text-xs">{formatDate(r.createdAt)}</td>
              </tr>
            ))}
          </Table>
          <div className="px-5 pb-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>
        </Card>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title={t('reports.createTitle')}>
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <Field label={t('reports.fieldTitle')} required>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>
          <Field label={t('reports.fieldContent')} required hint={t('reports.contentHint')}>
            <Textarea rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={saving}>{t('reports.createDraft')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
