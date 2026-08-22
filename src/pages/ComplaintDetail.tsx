import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, Field, Modal, PageHeader, Select, Spinner, StatusBadge, Textarea, formatDate } from '../components/ui';
import { Complaint } from '../lib/types';

export function ComplaintDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [complaint, setComplaint] = useState<Complaint | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEscalate, setShowEscalate] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [statusForm, setStatusForm] = useState<any>({ status: 'IN_PROGRESS', resolution: '' });
  const [comment, setComment] = useState('');
  const [officers, setOfficers] = useState<any[]>([]);
  const [officerId, setOfficerId] = useState('');
  const [feedback, setFeedback] = useState<any>({ rating: 5, comment: '' });
  const [savingFeedback, setSavingFeedback] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/complaints/${id}`);
      setComplaint(res.data.complaint);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, [id]);

  async function doEscalate(e: FormEvent) {
    e.preventDefault();
    try {
      await api.post(`/complaints/${id}/escalate`, { reason: escalateReason });
      setShowEscalate(false);
      void load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function doStatus(e: FormEvent) {
    e.preventDefault();
    try {
      await api.put(`/complaints/${id}/status`, statusForm);
      setShowStatus(false);
      void load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function doComment(e: FormEvent) {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      await api.post(`/complaints/${id}/comments`, { comment });
      setComment('');
      void load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function doAssign() {
    if (!officerId) return;
    try {
      await api.post(`/complaints/${id}/assign`, { officerId: Number(officerId) });
      void load();
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function submitFeedback(e: FormEvent) {
    e.preventDefault();
    setSavingFeedback(true);
    try {
      await api.post(`/complaints/${id}/feedback`, feedback);
      setFeedback({ rating: 5, comment: '' });
      void load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSavingFeedback(false);
    }
  }

  async function loadOfficers() {
    try {
      const res = await api.get('/admin/users', { params: { limit: 100 } });
      setOfficers(res.data.items.filter((u: any) => u.level === 5 || u.level === 4 || u.level === 3 || u.level === 2));
    } catch { /* ignore */ }
  }

  useEffect(() => {
    if ((user?.level ?? 6) < 6) void loadOfficers();
  }, [user]);

  if (loading) return <Spinner />;
  if (error) return <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>;
  if (!complaint) return null;

  const isAdmin = (user?.level ?? 6) < 6;
  const canEscalate = isAdmin && !['RESOLVED', 'CLOSED'].includes(complaint.status) && complaint.currentLevel > 1;

  return (
    <div>
      <PageHeader
        title={complaint.title}
        subtitle={`Ref ${complaint.complaintNo} · Submitted ${formatDate(complaint.createdAt)} · Handling level ${complaint.currentLevel}`}
        breadcrumb={<button onClick={() => navigate('/complaints')} className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600"><ArrowLeft size={13} /> Back to complaints</button>}
        actions={
          <div className="flex gap-2">
            {canEscalate && <Button variant="secondary" onClick={() => setShowEscalate(true)}>Escalate</Button>}
            {isAdmin && <Button onClick={() => setShowStatus(true)}>Update status</Button>}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card title="Details">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-slate-500">Status</span><StatusBadge status={complaint.status} /></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Priority</span><StatusBadge status={complaint.priority} /></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Category</span><span className="text-slate-800">{complaint.category?.name}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Location</span><span className="text-slate-800">{complaint.location ?? complaint.village?.name}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Citizen</span><span className="text-slate-800">{complaint.citizen?.user?.fullName}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Assigned officer</span><span className="text-slate-800">{complaint.assignedOfficer?.fullName ?? 'Not assigned'}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs uppercase text-slate-400 mb-1">Description</div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{complaint.description}</p>
            </div>
            {complaint.resolution && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-xs uppercase text-slate-400 mb-1">Resolution</div>
                <p className="text-sm text-emerald-700 whitespace-pre-wrap">{complaint.resolution}</p>
              </div>
            )}
          </Card>

          {complaint.escalations && complaint.escalations.length > 0 && (
            <Card title="Escalation history">
              {complaint.escalations.map((es: any) => (
                <div key={es.id} className="py-2 border-b border-slate-50 last:border-0 text-sm">
                  <div className="font-medium text-slate-700">Escalated from level {es.fromLevel} to {es.toLevel}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{es.reason} · {formatDate(es.createdAt)}</div>
                </div>
              ))}
            </Card>
          )}

          <Card title="Comments">
            {complaint.comments && complaint.comments.length === 0 && <p className="text-sm text-slate-400">No comments yet.</p>}
            {complaint.comments?.map((c: any) => (
              <div key={c.id} className="py-2 border-b border-slate-50 last:border-0">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-slate-700">{c.user?.fullName} <span className="text-[10px] text-slate-400">({c.user?.role?.name})</span></span>
                  <span className="text-[11px] text-slate-400">{formatDate(c.createdAt)}</span>
                </div>
                <p className="text-sm text-slate-600 mt-1 whitespace-pre-wrap">{c.comment}</p>
              </div>
            ))}
            <form onSubmit={doComment} className="mt-3 flex gap-2">
              <Textarea rows={2} value={comment} onChange={(e) => setComment(e.target.value)} placeholder="Write a comment..." className="flex-1" />
              <Button type="submit" className="self-end">Post</Button>
            </form>
          </Card>
        </div>

        <div className="space-y-5">
          {isAdmin && (
            <Card title="Assignment">
              <div className="space-y-3">
                <Select value={officerId} onChange={(e) => setOfficerId(e.target.value)}>
                  <option value="">Select officer</option>
                  {officers.map((o) => <option key={o.id} value={o.id}>{o.fullName} — {o.roleName}</option>)}
                </Select>
                <Button onClick={doAssign} className="w-full justify-center">Assign officer</Button>
              </div>
            </Card>
          )}
          <Card title="Timeline">
            <div className="text-xs text-slate-500 space-y-1">
              <div>Created: {formatDate(complaint.createdAt)}</div>
              <div>Updated: {formatDate(complaint.updatedAt)}</div>
              {complaint.resolutionDate && <div>Resolved: {formatDate(complaint.resolutionDate)}</div>}
            </div>
          </Card>

          {isAdmin && complaint.feedback && (
            <Card title="Citizen feedback">
              <div className="flex items-center gap-1 text-amber-500 text-sm">
                {'★'.repeat(complaint.feedback.rating)}{'☆'.repeat(5 - complaint.feedback.rating)}
              </div>
              {complaint.feedback.comment && <p className="text-sm text-slate-600 mt-2">{complaint.feedback.comment}</p>}
              <p className="text-[11px] text-slate-400 mt-2">{formatDate(complaint.feedback.createdAt)}</p>
            </Card>
          )}

          {!isAdmin && ['RESOLVED', 'CLOSED'].includes(complaint.status) && !complaint.feedback && (
            <Card title="How was your complaint handled?">
              <form onSubmit={submitFeedback} className="space-y-3">
                {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
                <Field label="Satisfaction rating">
                  <div className="flex gap-1 text-2xl">
                    {[1, 2, 3, 4, 5].map((n) => (
                      <button key={n} type="button" onClick={() => setFeedback({ ...feedback, rating: n })}
                        className={`transition-colors ${n <= feedback.rating ? 'text-amber-500' : 'text-slate-200 hover:text-amber-300'}`}>
                        ★
                      </button>
                    ))}
                  </div>
                </Field>
                <Field label="Comment (optional)">
                  <Textarea rows={3} value={feedback.comment} onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })} placeholder="Tell us what could be improved..." />
                </Field>
                <Button type="submit" loading={savingFeedback} className="w-full justify-center">Submit feedback</Button>
              </form>
            </Card>
          )}
        </div>
      </div>

      <Modal open={showEscalate} onClose={() => setShowEscalate(false)} title="Escalate complaint">
        <form onSubmit={doEscalate} className="space-y-4">
          <p className="text-sm text-slate-500">The complaint will be sent to the next higher administrative level.</p>
          <Field label="Reason for escalation" required>
            <Textarea rows={4} value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} placeholder="Why can this level not resolve the issue?" required />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowEscalate(false)}>Cancel</Button>
            <Button type="submit">Escalate</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showStatus} onClose={() => setShowStatus(false)} title="Update status">
        <form onSubmit={doStatus} className="space-y-4">
          <Field label="Status" required>
            <Select value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>
              {['SUBMITTED', 'RECEIVED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
                <option key={s} value={s}>{s.replace(/_/g, ' ')}</option>
              ))}
            </Select>
          </Field>
          {['RESOLVED', 'CLOSED'].includes(statusForm.status) && (
            <Field label="Resolution" required>
              <Textarea rows={3} value={statusForm.resolution} onChange={(e) => setStatusForm({ ...statusForm, resolution: e.target.value })} required />
            </Field>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowStatus(false)}>Cancel</Button>
            <Button type="submit">Save</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
