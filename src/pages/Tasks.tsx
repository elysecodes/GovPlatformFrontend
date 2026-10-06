import { FormEvent, useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
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
  const { t } = useTranslation();
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
  const [deleteTarget, setDeleteTarget] = useState<Task | null>(null);
  const [archiveTarget, setArchiveTarget] = useState<Task | null>(null);
  const [reassignTarget, setReassignTarget] = useState<Task | null>(null);
  const [reassignId, setReassignId] = useState(0);
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
    setSaving(true); setError('');
    try { await api.delete(`/tasks/${id}`); setDeleteTarget(null); void load(); } catch (err) { setError(apiError(err)); } finally { setSaving(false); }
  }

  async function archiveTask() {
    if (!archiveTarget) return;
    setSaving(true); setError('');
    try { await api.put(`/tasks/${archiveTarget.id}`, { status: 'ARCHIVED' }); setArchiveTarget(null); void load(); } catch (err) { setError(apiError(err)); } finally { setSaving(false); }
  }

  async function reassign() {
    if (!reassignTarget || !reassignId) return;
    setSaving(true); setError('');
    try { await api.put(`/tasks/${reassignTarget.id}`, { assigneeId: reassignId }); setReassignTarget(null); setReassignId(0); void load(); } catch (err) { setError(apiError(err)); } finally { setSaving(false); }
  }

  function isOverdue(date?: string, taskStatus?: string): boolean {
    if (!date) return false;
    if (taskStatus === 'COMPLETED' || taskStatus === 'ARCHIVED') return false;
    return new Date(date).getTime() < Date.now();
  }

  return (
    <div>
      <PageHeader
        title={t('tasks.title')}
        subtitle={t('tasks.subtitle')}
        breadcrumb={`${t('common.appName')} / ${t('nav.tasks')}`}
        actions={isAdmin && <Button onClick={() => setShowNew(true)}><Plus size={16} /> {t('tasks.newTask')}</Button>}
      />
      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select className="!w-48 shrink-0" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">{t('tasks.allStatuses')}</option>
            {['OPEN', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'].map((s) => (
              <option key={s} value={s}>{s === 'OPEN' ? t('tasks.status.OPEN') : t(`status.${s}`)}</option>
            ))}
          </Select>
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-xs text-slate-400">{t('tasks.sort')}</span>
            <Select className="!w-40 shrink-0" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
              <option value="">{t('tasks.sortNewest')}</option>
              <option value="oldest">{t('tasks.sortOldest')}</option>
              <option value="due">{t('tasks.sortDueDate')}</option>
              <option value="priority">{t('tasks.sortPriority')}</option>
            </Select>
          </span>
        </div>
      </Card>

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title={t('tasks.empty')} /></Card>
      ) : (
        <Card className="p-0">
          <Table headers={[t('tasks.colTask'), t('tasks.colAssignee'), t('tasks.colPriority'), t('tasks.colDue'), t('users.colStatus'), '']}>
            {items.map((task) => (
              <tr key={task.id}>
                <td className="py-3 pr-4">
                  <div className="font-medium text-slate-800">{task.title}</div>
                  {task.description && <div className="text-xs text-slate-500 truncate max-w-[260px]">{task.description}</div>}
                </td>
                <td className="py-3 pr-4 text-slate-600">{task.assignee?.fullName}{task.assignee?.role ? ` · ${task.assignee.role.name}` : ''}</td>
                <td className="py-3 pr-4"><StatusBadge status={task.priority} /></td>
                <td className="py-3 pr-4 text-xs text-slate-500">
                  {task.dueDate ? formatDate(task.dueDate) : '—'}
                  {isOverdue(task.dueDate, task.status) && (
                    <span className="ml-1.5 inline-flex items-center rounded bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600">{t('common.overdue')}</span>
                  )}
                </td>
                <td className="py-3 pr-4"><StatusBadge status={task.status} /></td>
                <td className="py-3 pr-4">
                  <div className="flex items-center gap-1">
                    {task.status === 'OPEN' && (
                      <button onClick={() => updateStatus(task.id, 'IN_PROGRESS')} title={t('tasks.start')} className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-brand-700 hover:bg-brand-50">
                        {t('tasks.start')}
                      </button>
                    )}
                    {task.status !== 'COMPLETED' && task.status !== 'ARCHIVED' && (
                      <button onClick={() => updateStatus(task.id, 'COMPLETED')} title={t('tasks.markComplete')} className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-emerald-700 hover:bg-emerald-50">
                        <CheckCircle2 size={12} className="mr-0.5" /> {t('tasks.complete')}
                      </button>
                    )}
                    {(task.status === 'COMPLETED' || task.status === 'ARCHIVED') && (
                      <button onClick={() => updateStatus(task.id, task.status === 'ARCHIVED' ? 'OPEN' : 'IN_PROGRESS')} title={t('tasks.reopen')} className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
                        {t('tasks.reopen')}
                      </button>
                    )}
                    {isAdmin && task.status !== 'ARCHIVED' && (
                      <button onClick={() => { setReassignTarget(task); setReassignId(0); setError(''); }} title={t('tasks.reassign')} className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-slate-600 hover:bg-slate-50">
                        {t('tasks.reassign')}
                      </button>
                    )}
                    {isAdmin && task.status !== 'ARCHIVED' && (
                      <button onClick={() => { setArchiveTarget(task); setError(''); }} title={t('tasks.archive')} className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-amber-700 hover:bg-amber-50">
                        {t('tasks.archive')}
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => { setDeleteTarget(task); setError(''); }} title={t('common.delete')} className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50">
                        <Trash2 size={12} className="mr-0.5" /> {t('common.delete')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </Table>
          <div className="px-5 pb-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>
        </Card>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title={t('tasks.assignTitle')}>
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <Field label={t('tasks.taskTitle')} required><Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required /></Field>
          <Field label={t('tasks.description')}><Input value={form.description ?? ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label={t('tasks.assignee')} required>
              <Select value={form.assigneeId ?? ''} onChange={(e) => setForm({ ...form, assigneeId: Number(e.target.value) })} required>
                <option value="">{t('tasks.selectOfficer')}</option>
                {assignees.map((a) => <option key={a.id} value={a.id}>{a.fullName} — {a.role?.name}</option>)}
              </Select>
            </Field>
            <Field label={t('tasks.priority')}>
              <Select value={form.priority ?? 'MEDIUM'} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                <option>{t('status.LOW')}</option><option>{t('status.MEDIUM')}</option><option>{t('status.HIGH')}</option><option>{t('status.URGENT')}</option>
              </Select>
            </Field>
          </div>
          <Field label={t('tasks.dueDate')}><Input type="date" value={form.dueDate ?? ''} onChange={(e) => setForm({ ...form, dueDate: e.target.value })} /></Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={saving}>{t('tasks.assign')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('common.deleteConfirmTitle')}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <p className="text-sm text-slate-600">{t('common.deleteConfirm', { name: deleteTarget?.title })}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setDeleteTarget(null); setError(''); }}>{t('common.cancel')}</Button>
            <Button type="button" loading={saving} onClick={() => remove(deleteTarget!.id)}>{t('common.delete')}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!archiveTarget} onClose={() => setArchiveTarget(null)} title={t('tasks.archiveConfirmTitle')}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <p className="text-sm text-slate-600">{t('tasks.archiveConfirm', { title: archiveTarget?.title })}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setArchiveTarget(null); setError(''); }}>{t('common.cancel')}</Button>
            <Button type="button" loading={saving} onClick={archiveTask}>{t('tasks.archive')}</Button>
          </div>
        </div>
      </Modal>

      <Modal open={!!reassignTarget} onClose={() => setReassignTarget(null)} title={t('tasks.reassignTitle', { title: reassignTarget?.title ?? '' })}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <Field label={t('tasks.reassignTo')} required>
            <Select value={reassignId} onChange={(e) => setReassignId(Number(e.target.value))}>
              <option value={0}>{t('tasks.selectOfficer')}</option>
              {assignees.map((a) => <option key={a.id} value={a.id}>{a.fullName} — {a.role?.name}</option>)}
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setReassignTarget(null); setError(''); }}>{t('common.cancel')}</Button>
            <Button type="button" loading={saving} onClick={reassign}>{t('tasks.saveReassign')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}