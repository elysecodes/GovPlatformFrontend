import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { CheckCheck } from 'lucide-react';
import { api } from '../lib/api';
import { Button, Card, EmptyState, PageHeader, Spinner, StatusBadge, formatDateTime } from '../components/ui';
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
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [unread, setUnread] = useState(0);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paginated<Notification>>('/notifications', { params: { page, limit: 20 } });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
      const u = await api.get('/notifications/unread-count');
      setUnread(u.data.count);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [page]);

  async function markAll() {
    await api.post('/notifications/read-all');
    void load();
  }

  async function markRead(id: number) {
    await api.post(`/notifications/${id}/read`);
    void load();
  }

  return (
    <div>
      <PageHeader
        title="Notifications"
        subtitle={unread > 0 ? `${unread} unread` : 'All caught up'}
        actions={unread > 0 && <Button variant="secondary" onClick={markAll}><CheckCheck size={16} /> Mark all read</Button>}
      />

      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title="No notifications" /></Card>
      ) : (
        <Card className="p-0">
          <div className="divide-y divide-slate-100">
            {items.map((n) => (
              <div key={n.id} className={`px-5 py-3 flex items-start gap-3 ${!n.readAt ? 'bg-brand-50/50' : ''}`} onClick={() => markRead(n.id)}>
                <div className={`mt-1.5 h-2 w-2 rounded-full shrink-0 ${!n.readAt ? 'bg-brand-600' : 'bg-slate-200'}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-slate-800">{n.title}</span>
                    <span className="text-[11px] text-slate-400 shrink-0 ml-2">{formatDateTime(n.createdAt)}</span>
                  </div>
                  <p className="text-sm text-slate-600 mt-0.5">{n.content}</p>
                  {n.link && (
                    <Link to={n.link} className="text-xs text-brand-700 hover:underline mt-1 inline-block">Open →</Link>
                  )}
                </div>
                <StatusBadge status={n.type} />
              </div>
            ))}
          </div>
          <div className="px-5 py-4 border-t border-slate-100 flex justify-between">
            <span className="text-xs text-slate-400">Page {page} of {pages}</span>
            <div className="flex gap-2">
              <Button variant="secondary" disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</Button>
              <Button variant="secondary" disabled={page >= pages} onClick={() => setPage(page + 1)}>Next</Button>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
}
