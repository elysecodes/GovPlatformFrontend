import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, Field, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Textarea, formatDate, money } from '../components/ui';
import { Project } from '../lib/types';

export function ProjectDetail() {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateForm, setUpdateForm] = useState<any>({ content: '', progress: 0 });
  const [editForm, setEditForm] = useState<any>(null);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/projects/${id}`);
      setProject(res.data.project);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [id]);

  async function postUpdate(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/projects/${id}/updates`, updateForm);
      setShowUpdate(false);
      void load();
    } catch (err) { setError(apiError(err)); }
  }

  async function saveEdit(e: FormEvent) {
    e.preventDefault();
    try {
      await api.put(`/projects/${id}`, editForm);
      setEditForm(null);
      void load();
    } catch (err) { setError(apiError(err)); }
  }

  if (loading) return <Spinner />;
  if (error) return <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>;
  if (!project) return null;

  const isAdmin = (user?.level ?? 6) < 6;

  return (
    <div>
      <PageHeader
        title={project.title}
        subtitle={t('projectdetail.createdOn', { date: formatDate(project.createdAt) })}
        breadcrumb={<button onClick={() => navigate('/projects')} className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600"><ArrowLeft size={13} /> {t('projectdetail.backToProjects')}</button>}
        actions={isAdmin && <Button onClick={() => { setUpdateForm({ content: '', progress: project.progress }); setShowUpdate(true); }}>{t('projectdetail.postUpdate')}</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card title={t('projectdetail.description')}>
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{project.description}</p>
          </Card>

          <Card title={t('projectdetail.updates')}>
            {project.updates && project.updates.length === 0 && <p className="text-sm text-slate-400">{t('projectdetail.noUpdates')}</p>}
            {project.updates?.map((u: any) => (
              <div key={u.id} className="py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{u.author?.fullName}</span>
                  <span className="text-[11px] text-slate-400">{formatDate(u.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{u.content}</p>
                <div className="text-xs text-slate-400 mt-1">{t('projectdetail.progressValue', { value: u.progress })}</div>
              </div>
            ))}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title={t('projectdetail.overview')}>
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-500">{t('projectdetail.progress')}</span>
                <span className="font-semibold">{project.progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-600" style={{ width: `${project.progress}%` }} />
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">{t('users.colStatus')}</span><StatusBadge status={project.status} /></div>
              <div className="flex justify-between"><span className="text-slate-500">{t('projectdetail.budget')}</span><span className="text-slate-800">{money(Number(project.budget))}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">{t('projectdetail.spentToDate')}</span><span className="text-slate-800">{money(Number(project.budgetSpent))}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">{t('projectdetail.fundingSource')}</span><span className="text-slate-800">{project.fundingSource ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">{t('projectdetail.beneficiaries')}</span><span className="text-slate-800">{project.beneficiaries}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">{t('projectdetail.start')}</span><span className="text-slate-800">{formatDate(project.startDate)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">{t('projectdetail.expectedEnd')}</span><span className="text-slate-800">{formatDate(project.expectedEndDate)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">{t('projectdetail.responsible')}</span><span className="text-slate-800">{project.responsibleOfficer?.fullName ?? '—'}</span></div>
            </div>
          </Card>

          {isAdmin && (
            <Card title={t('projectdetail.manage')}>
              <Button variant="secondary" className="w-full justify-center" onClick={() => setEditForm({ status: project.status, progress: project.progress, budgetSpent: Number(project.budgetSpent), fundingSource: project.fundingSource ?? '' })}>
                {t('projectdetail.editStatusProgress')}
              </Button>
            </Card>
          )}
        </div>
      </div>

      <Modal open={showUpdate} onClose={() => setShowUpdate(false)} title={t('projectdetail.postUpdateTitle')}>
        <form onSubmit={postUpdate} className="space-y-4">
          <Field label={t('projectdetail.progressPercent')} required>
            <Input type="number" min={0} max={100} value={updateForm.progress} onChange={(e) => setUpdateForm({ ...updateForm, progress: Number(e.target.value) })} required />
          </Field>
          <Field label={t('projectdetail.updateField')} required>
            <Textarea rows={4} value={updateForm.content} onChange={(e) => setUpdateForm({ ...updateForm, content: e.target.value })} required />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowUpdate(false)}>{t('common.cancel')}</Button>
            <Button type="submit">{t('projectdetail.postUpdate')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editForm} onClose={() => setEditForm(null)} title={t('projectdetail.editProject')}>
        {editForm && (
          <form onSubmit={saveEdit} className="space-y-4">
            <Field label={t('users.colStatus')}>
              <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                {['PLANNED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'SUSPENDED'].map((s) => <option key={s} value={s}>{t('status.' + s)}</option>)}
              </Select>
            </Field>
            <Field label={t('projectdetail.progressPercent')}>
              <Input type="number" min={0} max={100} value={editForm.progress} onChange={(e) => setEditForm({ ...editForm, progress: Number(e.target.value) })} />
            </Field>
            <Field label={t('projectdetail.budgetSpentToDate')}>
              <Input type="number" value={editForm.budgetSpent ?? ''} onChange={(e) => setEditForm({ ...editForm, budgetSpent: e.target.value })} />
            </Field>
            <Field label={t('projectdetail.fundingSource')}>
              <Input value={editForm.fundingSource ?? ''} onChange={(e) => setEditForm({ ...editForm, fundingSource: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditForm(null)}>{t('common.cancel')}</Button>
              <Button type="submit">{t('common.save')}</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
