import { FormEvent, useEffect, useState } from 'react';
import { Plus, Trash2, CheckCircle2 } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, StatusBadge, Table, formatDate } from '../components/ui';
import { Paginated } from '../lib/types';

interface Task {
  id: number;
  title: string;
  description?: string;
  priority: string;
  status: string;
  dueDate?: string;
  assignee?: { id: number; fullName: string; role?: { name: string } };
  assignedBy?: { fullName: string };
}

export function Tasks() {
  const { user } = useAuth();
  const isAdmin = (user?.level ?? 6) < 6;
  const [items, setItems] = useState<Task[]>([]);
  const [assignees, setAssignees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paginated<Task>>('/tasks', { params: { page, limit: 15, status: status || undefined, sort: sort || undefined } });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
      setError('');
    } catch (e) { setError(apiError(e)); } finally { setLoading(false); }
  }
  useEffect(() => { void load(); }, [page, status, sort]);
  useEffect(() => {
    if (isAdmin) void api.get('/tasks/assignees').then((r) => setAssignees(r.data.items)).catch(() => {});
  }, [isAdmin]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true); setError('');
    try {
      await api.post('/tasks', form);
      setShowNew(false); setForm({}); void load();
    } catch (err) { setError(apiError(err)); } finally { setSaving(false); }
  }

  async function updateStatus(id: number, status: string) {
    try { await api.put(`/tasks/${id}`, { status }); void load(); } catch (err) { setError(apiError(err)); }
  }

  async function remove(id: number) {
    try { await api.delete(`/tasks/${id}`); void load(); } catch (err) { setError(apiError(err)); }
  }

  return (
    <div>
      <PageHeader
        title="Leader Tasks"
        subtitle="Assign and track administrative follow-up tasks"
        breadcrumb="Northern Province / Tasks"
        actions={isAdmin && <Button onClick={() => setShowNew(true)}><Plus size={16} /> New task</Button>}
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select className="!w-48 shrink-0" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">All statuses</option>
            {['OPEN', 'IN_PROGRESS', 'COMPLETED'].map((s) => (
              <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
            ))}
          </Select>
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-xs text-slate-400">Sort:</span>
            <Select className="!w-40 shrink-0" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
              <option value="">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="due">By due date</option>
              <option value="priority">By priority</option>
            </Select>
          </span>
        </div>
      </Card>

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title="No tasks" /></Card>
      ) : (
        <Card className="p-0">
          <Table headers={['Task', 'Assignee', 'Priority', 'Due', 'Status', '']}>
            {items.map((t) => (
              <tr key={t.id}>
                <td className="py-3 pr-4">
                  <div className="font-medium text-slate-800">{t.title}</div>
                  {t.description && <div className="text-xs text-slate-500 truncate max-w-[260px]">{t.description}</div>}
                </td>
                <td className="py-3 pr-4 text-slate-600">{t.assignee?.fullName}{t.assignee?.role ? ` · ${t.assignee.role.name}` : ''}</td>
                <td className="py-3 pr-4"><StatusBadge status={t.priority} /></td>
                <td className="py-3 pr-4 text-xs text-slate-500">{t.dueDate ? formatDate(t.dueDate) : '—'}</td>
                <td className="py-3 pr-4"><StatusBadge status={t.status} /></td>
                <td className="py-3 pr-4">
                  {t.status !== 'COMPLETED' && (
                    <button onClick={() => updateStatus(t.id, 'COMPLETED')} title="Mark complete" className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50">
                      <CheckCircle2 size={12} className="mr-0.5" /> Complete
                    </button>
                  )}
                  {isAdmin && (
                    <button onClick={() => remove(t.id)} title="Delete" className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50">
                      <Trash2 size={12} className="mr-0.5" /> Delete
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </Table>
          <div className="px-5 pb-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>
        </Card>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="Assign a new task">
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <Field label="Task title" required><Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <Field label="Description"><Input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Assignee" required>
              <Select value={form.assigneeId ?? ''} onChange={(e) => setForm({ ...form, assigneeId: Number(e.target.value) })} required>
                <option value="">Select officer</option>
                {assignees.map((a) => <option key={a.id} value={a.id}>{a.fullName} — {a.role?.name}</option>)}
              </Select>
            </Field>
            <Field label="Priority">
              <Select value={form.priority ?? 'MEDIUM'} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option>LOW</option><option>MEDIUM</option><option>HIGH</option><option>URGENT</option>
              </Select>
            </Field>
          </div>
          <Field label="Due date"><Input type="date" value={form.dueDate ?? ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Assign task</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}