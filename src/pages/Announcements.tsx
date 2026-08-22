import { FormEvent, useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, EmptyState, Field, Input, Modal, PageHeader, Pagination, Select, Spinner, StatusBadge, Textarea, formatDate } from '../components/ui';
import { Announcement, Paginated } from '../lib/types';

export function Announcements() {
  const { user } = useAuth();
  const isAdmin = (user?.level ?? 6) < 6;
  const [items, setItems] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('');
  const [showNew, setShowNew] = useState(false);
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

  return (
    <div>
      <PageHeader
        title="Announcements"
        subtitle="Official announcements within your jurisdiction"
        breadcrumb="Northern Province / Announcements"
        actions={isAdmin && <Button onClick={() => setShowNew(true)}><Plus size={16} /> New announcement</Button>}
      />

      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select className="!w-48 shrink-0" value={status} onChange={(e) => { setPage(1); setStatus(e.target.value); }}>
            <option value="">All statuses</option>
            {['DRAFT', 'SCHEDULED', 'PUBLISHED', 'EXPIRED', 'ARCHIVED'].map((s) => (
              <option key={s} value={s}>{s.charAt(0) + s.slice(1).toLowerCase()}</option>
            ))}
          </Select>
          <span className="ml-auto inline-flex items-center gap-2">
            <span className="text-xs text-slate-400">Sort:</span>
            <Select className="!w-40 shrink-0" value={sort} onChange={(e) => { setPage(1); setSort(e.target.value); }}>
              <option value="">Newest</option>
              <option value="oldest">Oldest</option>
              <option value="title">Title A-Z</option>
            </Select>
          </span>
        </div>
      </Card>

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title="No announcements" /></Card>
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
                    {a.author?.fullName} · {formatDate(a.publicationDate)} · Target: {a.targetLevel === 6 ? 'Citizens' : `Level ${a.targetLevel} administration`}
                  </p>
                </div>
                <StatusBadge status={`LEVEL ${a.targetLevel}`} />
              </div>
              <p className="text-sm text-slate-600 mt-3 whitespace-pre-wrap">{a.content}</p>
              {a.expirationDate && (
                <p className="text-[11px] text-slate-400 mt-2">Expires {formatDate(a.expirationDate)}</p>
              )}
            </Card>
          ))}
          <Pagination page={page} pages={pages} onChange={setPage} />
        </div>
      )}

      <Modal open={showNew} onClose={() => setShowNew(false)} title="New announcement">
        <form onSubmit={create} className="space-y-4">
          {error && <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <Field label="Title" required>
            <Input value={form.title ?? ''} onChange={(e) => setForm({ ...form, title: e.target.value })} required />
          </Field>
          <Field label="Content" required>
            <Textarea rows={6} value={form.content ?? ''} onChange={(e) => setForm({ ...form, content: e.target.value })} required />
          </Field>
          <Field label="Target audience" required hint="Announcements can only target levels below your own">
            <Select value={form.targetLevel} onChange={(e) => setForm({ ...form, targetLevel: Number(e.target.value) })}>
              {(user ? Array.from({ length: Math.max(0, 6 - user.level) }, (_, i) => user.level + 1 + i) : []).map((l) => (
                <option key={l} value={l}>{l === 6 ? 'Citizens' : `Level ${l} Administration`}</option>
              ))}
            </Select>
          </Field>
          <Field label="Expiration date">
            <Input type="date" value={form.expirationDate ?? ''} onChange={(e) => setForm({ ...form, expirationDate: e.target.value })} />
          </Field>
          <Field label="Publish date" hint="Leave empty to publish now, or set a future date to schedule">
            <Input type="datetime-local" value={form.publicationDate ?? ''} onChange={(e) => setForm({ ...form, publicationDate: e.target.value })} />
          </Field>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="secondary" onClick={() => setShowNew(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>{form.publicationDate ? 'Schedule' : 'Publish'}</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
