import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, EmptyState, PageHeader, Pagination, Spinner, Table, StatusBadge, formatDateTime } from '../components/ui';
import { Paginated } from '../lib/types';

interface AuditEntry {
  id: number;
  action: string;
  entity?: string;
  entityId?: number;
  ip?: string;
  createdAt: string;
  user?: { id: number; fullName: string; role?: { name: string } };
  previousValue?: any;
  newValue?: any;
}

export function AuditLogs() {
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paginated<AuditEntry>>('/audit-logs', { params: { page, limit: 20 } });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [page]);

  return (
    <div>
      <PageHeader
        title="Audit Logs"
        subtitle="Investigative trail of administrative activity"
        breadcrumb="Northern Province / Audit Logs"
      />
      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title="No audit records" /></Card>
      ) : (
        <Card className="p-0">
          <Table headers={['Time', 'User', 'Action', 'Entity', 'Details']}>
            {items.map((a) => (
              <tr key={a.id}>
                <td className="py-3 pr-4 text-slate-500 text-xs whitespace-nowrap">{formatDateTime(a.createdAt)}</td>
                <td className="py-3 pr-4">
                  <div className="font-medium text-slate-800 text-sm">{a.user?.fullName ?? 'System'}</div>
                  <div className="text-[10px] text-slate-400">{a.user?.role?.name}</div>
                </td>
                <td className="py-3 pr-4"><StatusBadge status={a.action} /></td>
                <td className="py-3 pr-4 text-slate-600 text-xs">
                  {a.entity} {a.entityId ? `#${a.entityId}` : ''}
                </td>
                <td className="py-3 pr-4 text-slate-500 text-xs max-w-[220px]">
                  {a.newValue ? <span className="block truncate">{JSON.stringify(a.newValue)}</span> : null}
                  <span className="text-slate-300">IP: {a.ip ?? '—'}</span>
                </td>
              </tr>
            ))}
          </Table>
          <div className="px-5 pb-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>
        </Card>
      )}
    </div>
  );
}
