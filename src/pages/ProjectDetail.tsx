import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, Field, Input, Modal, PageHeader, Select, Spinner, StatusBadge, Textarea, formatDate, money } from '../components/ui';
import { Project } from '../lib/types';

export function ProjectDetail() {
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
        subtitle={`Created ${formatDate(project.createdAt)}`}
        breadcrumb={<button onClick={() => navigate('/projects')} className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600"><ArrowLeft size={13} /> Back to projects</button>}
        actions={isAdmin && <Button onClick={() => { setUpdateForm({ content: '', progress: project.progress }); setShowUpdate(true); }}>Post update</Button>}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Description">
            <p className="text-sm text-slate-700 whitespace-pre-wrap">{project.description}</p>
          </Card>

          <Card title="Updates">
            {project.updates && project.updates.length === 0 && <p className="text-sm text-slate-400">No updates yet.</p>}
            {project.updates?.map((u: any) => (
              <div key={u.id} className="py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{u.author?.fullName}</span>
                  <span className="text-[11px] text-slate-400">{formatDate(u.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1">{u.content}</p>
                <div className="text-xs text-slate-400 mt-1">Progress: {u.progress}%</div>
              </div>
            ))}
          </Card>
        </div>

        <div className="space-y-5">
          <Card title="Overview">
            <div className="mb-4">
              <div className="flex items-center justify-between text-sm mb-1">
                <span className="text-slate-500">Progress</span>
                <span className="font-semibold">{project.progress}%</span>
              </div>
              <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-brand-600" style={{ width: `${project.progress}%` }} />
              </div>
            </div>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">Status</span><StatusBadge status={project.status} /></div>
              <div className="flex justify-between"><span className="text-slate-500">Budget</span><span className="text-slate-800">{money(Number(project.budget))}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Spent to date</span><span className="text-slate-800">{money(Number(project.budgetSpent))}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Funding source</span><span className="text-slate-800">{project.fundingSource ?? '—'}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Beneficiaries</span><span className="text-slate-800">{project.beneficiaries}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Start</span><span className="text-slate-800">{formatDate(project.startDate)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Expected end</span><span className="text-slate-800">{formatDate(project.expectedEndDate)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">Responsible</span><span className="text-slate-800">{project.responsibleOfficer?.fullName ?? '—'}</span></div>
            </div>
          </Card>

          {isAdmin && (
            <Card title="Manage">
              <Button variant="secondary" className="w-full justify-center" onClick={() => setEditForm({ status: project.status, progress: project.progress, budgetSpent: Number(project.budgetSpent), fundingSource: project.fundingSource ?? '' })}>
                Edit status / progress
              </Button>
            </Card>
          )}
        </div>
      </div>

      <Modal open={showUpdate} onClose={() => setShowUpdate(false)} title="Post project update">
        <form onSubmit={postUpdate} className="space-y-4">
          <Field label="Progress (%)" required>
            <Input type="number" min={0} max={100} value={updateForm.progress} onChange={(e) => setUpdateForm({ ...updateForm, progress: Number(e.target.value) })} required />
          </Field>
          <Field label="Update" required>
            <Textarea rows={4} value={updateForm.content} onChange={(e) => setUpdateForm({ ...updateForm, content: e.target.value })} required />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowUpdate(false)}>Cancel</Button>
            <Button type="submit">Post update</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!editForm} onClose={() => setEditForm(null)} title="Edit project">
        {editForm && (
          <form onSubmit={saveEdit} className="space-y-4">
            <Field label="Status">
              <Select value={editForm.status} onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}>
                {['PLANNED', 'APPROVED', 'IN_PROGRESS', 'COMPLETED', 'SUSPENDED'].map((s) => <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>)}
              </Select>
            </Field>
            <Field label="Progress (%)">
              <Input type="number" min={0} max={100} value={editForm.progress} onChange={(e) => setEditForm({ ...editForm, progress: Number(e.target.value) })} />
            </Field>
            <Field label="Budget spent to date (RWF)">
              <Input type="number" value={editForm.budgetSpent ?? ''} onChange={(e) => setEditForm({ ...editForm, budgetSpent: e.target.value })} />
            </Field>
            <Field label="Funding source">
              <Input value={editForm.fundingSource ?? ''} onChange={(e) => setEditForm({ ...editForm, fundingSource: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="secondary" onClick={() => setEditForm(null)}>Cancel</Button>
              <Button type="submit">Save</Button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}
