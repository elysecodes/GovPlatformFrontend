import { FormEvent, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, SearchInput, Select, Spinner, StatusBadge, Table, Textarea, formatDate } from '../components/ui';
import { Paginated, Report } from '../lib/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';
import { ExportCsvButton } from '../components/ExportCsv';

export function Reports() {
  const { user } = useAuth();
  const navigate = useNavigate();
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
        title="Administrative Reports"
        subtitle={`${total} reports`}
        breadcrumb="Northern Province / Reports"
        actions={canCreate && (
          <div className="flex flex-wrap gap-2">
            <ExportCsvButton path="/reports" filename="reports" />
            <Button onClick={() => setShowNew(true)}><Plus size={16} /> New report</Button>
          </div>
        )}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={(v) => { setSearch(v); setPage(1); }}
            placeholder="Search by title or reference..."
            className="w-full md:w-72"
          />
          <Select className="!w-48 shrink-0" value={level} onChange={(e) => { setPage(1); setLevel(e.target.value); }}>
            <option value="">All levels</option>
            {['VILLAGE', 'CELL', 'SECTOR', 'DISTRICT'].map((l) => (
              <option key={l} value={l}>{l.charAt(0) + l.slice(1).toLowerCase()}</option>
            ))}
          </Select>
          <Select className="!w-48 shrink-0" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">All statuses</option>
            {['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'REVISION', 'FINALIZED'].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </Select>
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-xs text-slate-400">Sort:</span>
            <Select className="!w-40 shrink-0" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
              <option value="">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="status">By status</option>
              <option value="title">Title A-Z</option>
            </Select>
          </span>
        </div>
      </Card>

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title="No reports" /></Card>
      ) : (
        <Card className="p-0">
          <Table headers={['Title', 'Level', 'Author', 'Status', 'Submitted', 'Date']}>
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

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Create a report">
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <Field label="Title" required>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>
          <Field label="Content" required hint="Activities, issues, projects, complaints, statistics, events, indicators">
            <Textarea rows={8} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create draft</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
