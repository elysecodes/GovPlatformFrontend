import { FormEvent, useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, Field, Modal, PageHeader, Select, Spinner, StatusBadge, Textarea, formatDate } from '../components/ui';
import { ServiceRequest } from '../lib/types';

export function RequestDetail() {
  const { t } = useTranslation();
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
        subtitle={t('requestdetail.subtitle', { ref: request.requestNo, date: formatDate(request.createdAt) })}
        breadcrumb={<button onClick={() => navigate('/requests')} className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600"><ArrowLeft size={13} /> {t('requestdetail.backToRequests')}</button>}
        actions={
          <div className="flex gap-2">
            {canEscalate && <Button variant="secondary" onClick={() => setShowEscalate(true)}>{t('requestdetail.escalate')}</Button>}
            {isAdmin && <Button onClick={() => setShowStatus(true)}>{t('requestdetail.updateStatus')}</Button>}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2">
          <Card title={t('requestdetail.details')}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between gap-4"><span className="text-slate-500">{t('users.colStatus')}</span><StatusBadge status={request.status} /></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">{t('requestdetail.serviceType')}</span><span className="text-slate-800">{request.serviceType?.name}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">{t('requestdetail.location')}</span><span className="text-slate-800">{request.location ?? request.village?.name}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">{t('requestdetail.citizen')}</span><span className="text-slate-800">{request.citizen?.user?.fullName}</span></div>
              <div className="flex justify-between gap-4"><span className="text-slate-500">{t('requestdetail.assignedOfficer')}</span><span className="text-slate-800">{request.assignedOfficer?.fullName ?? t('requestdetail.notAssigned')}</span></div>
            </div>
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs uppercase text-slate-400 mb-1">{t('requestdetail.description')}</div>
              <p className="text-sm text-slate-700 whitespace-pre-wrap">{request.description}</p>
            </div>
            {request.resolution && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <div className="text-xs uppercase text-slate-400 mb-1">{t('requestdetail.resolution')}</div>
                <p className="text-sm text-emerald-700 whitespace-pre-wrap">{request.resolution}</p>
              </div>
            )}
          </Card>

          {request.escalations && request.escalations.length > 0 && (
            <Card title={t('requestdetail.escalationHistory')} className="mt-5">
              {(request as any).escalations.map((es: any) => (
                <div key={es.id} className="py-2 border-b border-slate-50 last:border-0 text-sm">
                  <div className="font-medium text-slate-700">{t('requestdetail.escalatedFrom', { from: es.fromLevel, to: es.toLevel })}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{es.reason} · {formatDate(es.createdAt)}</div>
                </div>
              ))}
            </Card>
          )}
        </div>

        <div className="space-y-5">
          {isAdmin && (
            <Card title={t('requestdetail.assignment')}>
              <div className="space-y-3">
                <Select value={officerId} onChange={(e) => setOfficerId(e.target.value)}>
                  <option value="">{t('requestdetail.selectOfficer')}</option>
                  {officers.map((o) => <option key={o.id} value={o.id}>{o.fullName} — {o.roleName}</option>)}
                </Select>
                <Button onClick={doAssign} className="w-full justify-center">{t('requestdetail.assignOfficer')}</Button>
              </div>
            </Card>
          )}
        </div>
      </div>

      <Modal open={showEscalate} onClose={() => setShowEscalate(false)} title={t('requestdetail.escalateModalTitle')}>
        <form onSubmit={doEscalate} className="space-y-4">
          <Field label={t('requestdetail.escalationReason')} required>
            <Textarea rows={4} value={escalateReason} onChange={(e) => setEscalateReason(e.target.value)} required />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowEscalate(false)}>{t('common.cancel')}</Button>
            <Button type="submit">{t('requestdetail.escalate')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={showStatus} onClose={() => setShowStatus(false)} title={t('requestdetail.updateStatus')}>
        <form onSubmit={doStatus} className="space-y-4">
          <Field label={t('users.colStatus')} required>
            <Select value={statusForm.status} onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}>
              {['SUBMITTED', 'RECEIVED', 'UNDER_REVIEW', 'ASSIGNED', 'IN_PROGRESS', 'RESOLVED', 'CLOSED'].map((s) => (
                <option key={s} value={s}>{t(`status.${s}`)}</option>
              ))}
            </Select>
          </Field>
          {['RESOLVED', 'CLOSED'].includes(statusForm.status) && (
            <Field label={t('requestdetail.resolution')} required>
              <Textarea rows={3} value={statusForm.resolution} onChange={(e) => setStatusForm({ ...statusForm, resolution: e.target.value })} required />
            </Field>
          )}
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowStatus(false)}>{t('common.cancel')}</Button>
            <Button type="submit">{t('common.save')}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
