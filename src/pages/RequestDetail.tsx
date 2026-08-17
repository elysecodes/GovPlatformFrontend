import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, Field, Modal, PageHeader, Select, Spinner, StatusBadge, Textarea, formatDate } from '../components/ui';
import { ServiceRequest } from '../lib/types';

export function RequestDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [request, setRequest] = useState<ServiceRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showEscalate, setShowEscalate] = useState(false);
  const [showStatus, setShowStatus] = useState(false);
  const [escalateReason, setEscalateReason] = useState('');
  const [statusForm, setStatusForm] = useState<any>({ status: 'IN_PROGRESS', resolution: '' });
  const [officers, setOfficers] = useState<any[]>([]);
  const [officerId, setOfficerId] = useState('');

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/requests/${id}`);
      setRequest(res.data.request);
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
      await api.post(`/requests/${id}/escalate`, { reason: escalateReason });
      setShowEscalate(false);
      void load();
    } catch (err) { setError(apiError(err)); }
  }

  async function doStatus(e: FormEvent) {
    e.preventDefault();
    try {
      await api.put(`/requests/${id}/status`, statusForm);
      setShowStatus(false);
      void load();
    } catch (err) { setError(apiError(err)); }
  }

  async function doAssign() {
    if (!officerId) return;
    try {
      await api.post(`/requests/${id}/assign`, { officerId: Number(officerId) });
      void load();
    } catch (err) { setError(apiError(err)); }
  }

  useEffect(() => {
    if ((user?.level ?? 6) < 6) {
      api.get('/admin/users', { params: { limit: 100 } }).then((r) => setOfficers(r.data.items.filter((u: any) => u.level >= 2 && u.level <= 5))).catch(() => {});
    }
  }, [user]);

  if (loading) return <Spinner />;
  if (error) return <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>;
  if (!request) return null;

  const isAdmin = (user?.level ?? 6) < 6;
  const canEscalate = isAdmin && !['RESOLVED', 'CLOSED'].includes(request.status);

  return (
    <div>
      <PageHeader
        title={request.title}
        subtitle={`Ref ${request.requestNo} · Submitted ${formatDate(request.createdAt)}`}
        breadcrumb={<button onClick={() => navigate('/requests')} className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600"><ArrowLeft size={13} /> Back to requests</button>}
        actions={
          <div className="flex gap-2">
            {canEscalate && <Button variant="secondary" onClick={() => setShowEscalate(true)}>Escalate</Button>}
            {isAdmin && <Button onClick={() => setShowStatus(true)}>Update status</Button>}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card title="Details">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-slate-500">Status</span><StatusBadge status={request.status} /></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Service type</span><span className="text-slate-800">{request.serviceType?.name}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Location</span><span className="text-slate-800">{request.location ?? request.village?.name}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Citizen</span><span className="text-slate-800">{request.citizen?.user?.fullName}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">Assigned officer</span><span className="text-slate-800">{request.assignedOfficer?.fullName ?? 'Not assigned'}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs uppercase text-slate-400 mb-1">Description</div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{request.description}</p>
            </div>
            {request.resolution && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-xs uppercase text-slate-400 mb-1">Resolution</div>
                <p className="text-sm text-emerald-700 whitespace-pre-wrap">{request.resolution}</p>
              </div>
            )}
          </Card>

          {request.escalations && request.escalations.length > 0 && (
            <Card title="Escalation history" className="mt-5">
              {(request as any).escalations.map((es: any) => (
                <div key={es.id} className="py-2 border-b border-slate-50 last:border-0 text-sm">
                  <div className="font-medium text-slate-700">Escalated from level {es.fromLevel} to {es.toLevel}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{es.reason} · {formatDate(es.createdAt)}</div>
                </div>
              ))}
            </Card>
          )}
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
        </div>
      </div>

      <Modal open={showEscalate} onClose={() => setShowEscalate(false)} title="Escalate request">
        <form onSubmit={doEscalate} className="space-y-4">
          <Field label="Reason for escalation" required>
            <Textarea rows={4} value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} required />
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
