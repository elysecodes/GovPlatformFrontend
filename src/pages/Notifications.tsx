import { FormEvent, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { CheckCheck, Megaphone, Trash2 } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Spinner, StatusBadge, Textarea, formatDateTime } from '../components/ui';
import { Paginated } from '../lib/types';

interface Notification {
  id: number;
  title: string;
  content: string;
  type: string;
  link?: string;
  readAt?: string;
  createdAt: string;
}

export function Notifications() {
  const { user } = useAuth();
  const isLeader = (user?.level ?? 6) < 6;
  const { t } = useTranslation();
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [unread, setUnread] = useState(0);
  const [flash, setFlash] = useState('');
  const [error, setError] = useState('');

  const [clearAllOpen, setClearAllOpen] = useState(false);
  const [showSend, setShowSend] = useState(false);
  const [form, setForm] = useState<{ title: string; content: string; link: string }>({ title: '', content: '', link: '' });
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paginated<Notification>>('/notifications', { params: { page, limit: 20 } });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
      const u = await api.get('/notifications/unread-count');
      setUnread(u.data.count);
    } catch (e) {
      setError(apiError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [page]);

  useEffect(() => {
    const handler = () => void load();
    window.addEventListener('realtime-notification', handler);
    return () => window.removeEventListener('realtime-notification', handler);
  }, []);

  async function markAll() {
    await api.post('/notifications/read-all');
    void load();
  }

  async function markRead(id: number) {
    await api.post(`/notifications/${id}/read`);
    void load();
  }

  async function deleteOne(id: number) {
    try {
      await api.delete(`/notifications/${id}`);
      setFlash('');
      void load();
    } catch (e) {
      setError(apiError(e));
    }
  }

  async function clearAll() {
    setSaving(true);
    setError('');
    try {
      await api.delete('/notifications');
      setClearAllOpen(false);
      void load();
    } catch (e) {
      setError(apiError(e));
    } finally {
      setSaving(false);
    }
  }

  async function send(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    setFlash('');
    try {
      const res = await api.post('/notifications/send', {
        title: form.title,
        content: form.content,
        link: form.link.trim() || undefined,
      });
      setShowSend(false);
      setForm({ title: '', content: '', link: '' });
      setFlash(t('notifications.sent', { count: res.data.sent }));
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
        title={t('nav.notifications')}
        subtitle={unread > 0 ? t('notifications.unreadCount', { count: unread }) : t('notifications.allCaughtUp')}
        actions={
          <div className="flex flex-wrap gap-2">
            {isLeader && (
              <Button onClick={() => { setShowSend(true); setError(''); setFlash(''); }}>
                <Megaphone size={16} /> {t('notifications.send')}
              </Button>
            )}
            {unread > 0 && <Button variant="secondary" onClick={markAll}><CheckCheck size={16} /> {t('notifications.markAllRead')}</Button>}
            {items.length > 0 && (
              <Button variant="secondary" onClick={() => setClearAllOpen(true)}>
                <Trash2 size={16} /> {t('notifications.clearAll')}
              </Button>
            )}
          </div>
        }
      />

      {flash && <div className="rounded-lg bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 mb-4">{flash}</div>}
      {error && !showSend && !clearAllOpen && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 mb-4">{error}</div>}

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title={t('notifications.empty')} /></Card>
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-slate-100">
            {items.map((n) => (
              <div key={n.id} className={`px-5 py-3 flex items-start gap-3 ${!n.readAt ? 'bg-brand-50/50' : ''}`} onClick={() => markRead(n.id)}>
                <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${!n.readAt ? 'bg-brand-600' : 'bg-slate-200'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-slate-800">{n.title}</span>
                    <span className="text-[11px] text-slate-400 shrink-0">{formatDateTime(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{n.content}</p>
                  {n.link && (
                    <Link to={n.link} className="text-xs text-brand-700 hover:underline mt-1 inline-block">{t('notifications.open')} →</Link>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <StatusBadge status={n.type} />
                  <button
                    type="button"
                    title={t('notifications.deleteOne')}
                    onClick={(e) => { e.stopPropagation(); void deleteOne(n.id); }}
                    className="inline-flex items-center rounded px-1.5 py-1 text-slate-400 hover:text-red-600 hover:bg-red-50"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-slate-100 flex justify-between">
            <span className="text-xs text-slate-400">{t('common.page', { page, pages })}</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>{t('common.prev')}</Button>
              <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>{t('common.next')}</Button>
            </div>
          </div>
        </Card>
      )}

      <Modal open={showSend} onClose={() => setShowSend(false)} title={t('notifications.sendTitle')}>
        <form onSubmit={send} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <div className="rounded-lg bg-brand-50 border border-brand-100 text-brand-700 text-xs px-3 py-2">{t('notifications.sendTarget')}</div>
          <Field label={t('notifications.titleLabel')} required>
            <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required maxLength={200} />
          </Field>
          <Field label={t('notifications.contentLabel')} required>
            <Textarea rows={5} value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} required maxLength={2000} />
          </Field>
          <Field label={t('notifications.linkLabel')} hint={t('notifications.linkHint')}>
            <Input value={form.link} onChange={(e) => setForm({ ...form, link: e.target.value })} placeholder="/announcements" maxLength={300} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowSend(false)}>{t('common.cancel')}</Button>
            <Button type="submit" loading={saving}><Megaphone size={16} /> {t('notifications.sendBtn')}</Button>
          </div>
        </form>
      </Modal>

      <Modal open={clearAllOpen} onClose={() => setClearAllOpen(false)} title={t('notifications.clearAll')}>
        <div className="space-y-4">
          <p className="text-sm text-slate-600">{t('notifications.clearAllConfirm')}</p>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setClearAllOpen(false)}>{t('common.cancel')}</Button>
            <Button type="button" variant="danger" loading={saving} onClick={clearAll}>{t('notifications.delete')}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}