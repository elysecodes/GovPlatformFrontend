import { FormEvent, useEffect, useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, StatusBadge, Textarea, formatDate } from '../components/ui';
import { Announcement, Paginated } from '../lib/types';

export function Announcements() {
  const { user } = useAuth();
  const isAdmin = (user?.level ?? 6) < 6;
  const { t } = useTranslation();
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('');
  const [showNew, setShowNew] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Announcement | null>(null);
  const [form, setForm] = useState<any>({ targetLevel: user ? Math.min(6, user.level + 1) : 6, scopeAll: true });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paginated<Announcement>>('/announcements', { params: { page, limit: 15, status: status || undefined, sort: sort || undefined } });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [page, status, sort]);

  async function create(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.post('/announcements', form);
      setShowNew(false);
      setForm({ targetLevel: user ? Math.min(6, user.level + 1) : 6, scopeAll: true });
      void load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function remove() {
    if (!deleteTarget) return;
    setSaving(true);
    setError('');
    try {
      await api.delete(`/announcements/${deleteTarget.id}`);
      setDeleteTarget(null);
      void load();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <PageHeader
        title={t('nav.announcements')}
        subtitle={t('announcements.subtitle')}
        breadcrumb={`${t('common.appName')} / ${t('nav.announcements')}`}
        actions={isAdmin && <Button onClick={() => setShowNew(true)}><Plus size={16} /> {t('announcements.new')}</Button>}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select className="!w-48 shrink-0" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">{t('announcements.allStatuses')}</option>
            {['DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED', 'ARCHIVED'].map((s) => (
              <option key={s} value={s}>{['SCHEDULED', 'ARCHIVED'].includes(s) ? t(`announcements.status.${s}`) : t(`status.${s}`)}</option>
            ))}
          </Select>
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-xs text-slate-400">{t('announcements.sort')}</span>
            <Select className="!w-40 shrink-0" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
              <option value="">{t('announcements.sortNewest')}</option>
              <option value="oldest">{t('announcements.sortOldest')}</option>
              <option value="title">{t('announcements.sortTitleAZ')}</option>
            </Select>
          </span>
        </div>
      </Card>

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title={t('announcements.empty')} /></Card>
      ) : (
        <div className="space-y-4">
          {items.map((a) => (
            <Card key={a.id}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold text-slate-800">{a.title}</h3>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {a.author?.fullName} · {formatDate(a.publicationDate)} · {t('announcements.targetLabel', { level: a.targetLevel === 6 ? t('announcements.targetCitizens') : t('announcements.targetAdministration', { level: a.targetLevel }) })}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => { setDeleteTarget(a); setError(''); }}
                      title={t('announcements.delete')}
                      className="inline-flex items-center rounded px-1.5 py-0.5 text-[11px] font-medium text-red-600 hover:bg-red-50"
                    >
                      <Trash2 size={12} className="mr-0.5" /> {t('announcements.delete')}
                    </button>
                  )}
                  <StatusBadge status={`LEVEL ${a.targetLevel}`} />
                </div>
                </div>
              <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{a.content}</p>
              {a.expirationDate && (
                <p className="text-[11px] text-slate-400 mt-2">{t('announcements.expires', { date: formatDate(a.expirationDate) })}</p>
              )}
            </Card>
          ))}
          <Pagination page={page} pages={pages} onChange={setPage} />
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title={t('announcements.newTitle')}>
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <Field label={t('announcements.title')} required>
            <Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>
          <Field label={t('announcements.content')} required>
            <Textarea rows={6} value={form.content ?? ''} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
          </Field>
          <Field label={t('announcements.targetAudience')} required hint={t('announcements.targetAudienceHint')}>
            <Select value={form.targetLevel} onChange={(e) => setForm({ ...form, targetLevel: Number(e.target.value) })}>
              {(user ? Array.from({ length: Math.max(0, 6 - user.level) }, (_, i) => user.level + 1 + i) : []).map((l) => (
                <option key={l} value={l}>{l === 6 ? t('announcements.targetCitizens') : t('announcements.targetAdministrationOption', { level: l })}</option>
              ))}
            </Select>
          </Field>
          <Field label={t('announcements.expirationDate')}>
            <Input type="date" value={form.expirationDate ?? ''} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })} />
          </Field>
          <Field label={t('announcements.publishDate')} hint={t('announcements.publishDateHint')}>
            <Input type="datetime-local" value={form.publicationDate ?? ''} onChange={(e) => setForm({ ...form, publicationDate: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={saving}>{form.publicationDate ? t('announcements.schedule') : t('announcements.publish')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={!!deleteTarget} onClose={() => setDeleteTarget(null)} title={t('announcements.deleteConfirmTitle')}>
        <div className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <p className="text-sm text-slate-600">{t('announcements.deleteConfirm', { title: deleteTarget?.title })}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => { setDeleteTarget(null); setError(''); }}>{t('common.cancel')}</Button>
            <Button type="button" variant="danger" loading={saving} onClick={remove}>{t('announcements.delete')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
