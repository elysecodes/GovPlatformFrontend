import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ArrowLeft, CheckCircle2, XCircle, RotateCcw } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, Field, Modal, PageHeader, Spinner, StatusBadge, Textarea, formatDate } from '../components/ui';
import { Report } from '../lib/types';

export function ReportDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { t } = useTranslation();
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [review, setReview] = useState<any>({ action: 'APPROVED', comment: '' });
  const [showReview, setShowReview] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get(`/reports/${id}`);
      setReport(res.data.report);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [id]);

  async function submit() {
    try {
      await api.post(`/reports/${id}/submit`);
      void load();
    } catch (err) { setError(apiError(err)); }
  }

  async function doReview() {
    try {
      await api.post(`/reports/${id}/review`, review);
      setShowReview(false);
      void load();
    } catch (err) { setError(apiError(err)); }
  }

  async function finalize() {
    try {
      await api.post(`/reports/${id}/finalize`);
      void load();
    } catch (err) { setError(apiError(err)); }
  }

  if (loading) return <Spinner />;
  if (error) return <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>;
  if (!report) return null;

  const isAuthor = report.author?.id === user?.id;
  const isEditable = ['DRAFT', 'REVISION'].includes(report.status);
  const reviewer = user && report.author?.id !== user.id && ['SUBMITTED', 'UNDER_REVIEW'].includes(report.status);

  return (
    <div>
      <PageHeader
        title={report.title}
        subtitle={t('reportdetail.subtitle', { ref: report.reportNo, level: t(`reports.levels.${report.level}`, { defaultValue: report.level }), version: report.version })}
        breadcrumb={<button onClick={() => navigate('/reports')} className="inline-flex items-center gap-1 text-slate-400 hover:text-slate-600"><ArrowLeft size={13} /> {t('reportdetail.backToReports')}</button>}
        actions={
          <div className="flex gap-2">
            {isAuthor && isEditable && <Button onClick={submit}>{t('reportdetail.submitForReview')}</Button>}
            {reviewer && <Button onClick={() => setShowReview(true)}>{t('reportdetail.reviewReport')}</Button>}
            {isAuthor && report.status === 'APPROVED' && <Button variant="secondary" onClick={finalize}>{t('reportdetail.finalize')}</Button>}
          </div>
        }
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <Card title={t('reportdetail.contentTitle')}>
            <p className="text-sm text-slate-700 whitespace-pre-wrap leading-relaxed">{report.content}</p>
          </Card>

          {report.reviews && report.reviews.length > 0 && (
            <Card title={t('reportdetail.reviewHistory')}>
              {report.reviews.map((rv: any) => (
                <div key={rv.id} className="py-2 border-b border-slate-50 last:border-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-700">{rv.reviewer?.fullName} <StatusBadge status={rv.action} /></span>
                    <span className="text-[11px] text-slate-400">{formatDate(rv.createdAt)}</span>
                  </div>
                  {rv.comment && <p className="text-sm text-slate-600 mt-1">{rv.comment}</p>}
                </div>
              ))}
            </Card>
          )}
        </div>

        <div>
          <Card title={t('reportdetail.status')}>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between"><span className="text-slate-500">{t('reportdetail.status')}</span><StatusBadge status={report.status} /></div>
              <div className="flex justify-between"><span className="text-slate-500">{t('reportdetail.author')}</span><span className="text-slate-800">{report.author?.fullName}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">{t('reportdetail.submitted')}</span><span className="text-slate-800">{formatDate(report.submittedAt)}</span></div>
              <div className="flex justify-between"><span className="text-slate-500">{t('reportdetail.reviewedBy')}</span><span className="text-slate-800">{report.reviewedBy?.fullName ?? '—'}</span></div>
            </div>
            {report.reviewComment && (
              <div className="mt-4 pt-3 border-t border-slate-100">
                <div className="text-xs uppercase text-slate-400 mb-1">{t('reportdetail.reviewComment')}</div>
                <p className="text-sm text-slate-600">{report.reviewComment}</p>
              </div>
            )}
          </Card>
        </div>
      </div>

      <Modal open={showReview} onClose={() => setShowReview(false)} title={t('reportdetail.reviewReport')}>
        <div className="space-y-4">
          <Field label={t('reportdetail.decision')}>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              {[
                { action: 'APPROVED', label: t('reportdetail.decisionApprove'), icon: <CheckCircle2 size={15} /> },
                { action: 'REJECTED', label: t('reportdetail.decisionReject'), icon: <XCircle size={15} /> },
                { action: 'REVISION', label: t('reportdetail.decisionRevision'), icon: <RotateCcw size={15} /> },
              ].map((opt) => (
                <button
                  key={opt.action}
                  type="button"
                  onClick={() => setReview({ ...review, action: opt.action })}
                  className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${review.action === opt.action ? 'bg-brand-700 text-white border-brand-700' : 'border-slate-300 text-slate-600 hover:bg-slate-50'}`}
                >
                  {opt.icon}{opt.label}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t('reportdetail.comment')}>
            <Textarea rows={4} value={review.comment} onChange={(e) => setReview({ ...review, comment: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setShowReview(false)}>{t('common.cancel')}</Button>
            <Button onClick={doReview}>{t('reportdetail.submitDecision')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
