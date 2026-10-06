import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { Card, EmptyState, PageHeader, Pagination, SearchInput, Spinner, Table, StatusBadge, formatDateTime } from '../components/ui';
import { Paginated } from '../lib/types';
import { useDebouncedValue } from '../hooks/useDebouncedValue';

interface AuditEntry {
  id: number;
  action: string;
  entity?: string;
  entityId?: number;
  method?: string;
  path?: string;
  ip?: string;
  createdAt: string;
  user?: { id: number; fullName: string; role?: { name: string } };
  previousValue?: any;
  newValue?: any;
}

export function AuditLogs() {
  const { t } = useTranslation();
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search);

  async function load() {
    setLoading(true);
    try {
      const params: any = { page, limit: 20 };
      if (debouncedSearch) params.q = debouncedSearch;
      const res = await api.get<Paginated<AuditEntry>>('/audit-logs', { params });
      setItems(res.data.items);
      setPages(res.data.pagination.pages);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, [page, debouncedSearch]);

  return (
    <div>
      <PageHeader
        title={t('nav.auditLogs')}
        subtitle={t('auditlogs.subtitle')}
        breadcrumb={`${t('common.appName')} / ${t('nav.auditLogs')}`}
      />
      <Card className="mb-4">
        <SearchInput
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder={t('auditlogs.searchPlaceholder')}
          className="w-full md:w-72"
        />
      </Card>
      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title={t('auditlogs.empty')} /></Card>
      ) : (
        <Card className="p-0">
          <Table headers={[t('profile.colTime'), t('auditlogs.colUser'), t('auditlogs.colAction'), t('auditlogs.colEntity'), t('auditlogs.colEndpoint')]}>
            {items.map((a) => (
              <tr key={a.id}>
                <td className="py-3 pr-4 text-slate-500 text-xs whitespace-nowrap">{formatDateTime(a.createdAt)}</td>
                <td className="py-3 pr-4">
                  <div className="font-medium text-slate-800 text-sm">{a.user?.fullName ?? t('auditlogs.system')}</div>
                  <div className="text-[10px] text-slate-400">{a.user?.role?.name}</div>
                </td>
                <td className="py-3 pr-4"><StatusBadge status={a.action} /></td>
                <td className="py-3 pr-4 text-slate-600 text-xs">
                  {a.entity} {a.entityId ? `#${a.entityId}` : ''}
                </td>
                <td className="py-3 pr-4 text-slate-500 text-xs">
                  {a.method && a.path ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className={`font-mono text-[10px] font-semibold rounded px-1.5 py-0.5 ${methodColor(a.method)}`}>{a.method}</span>
                      <span className="font-mono">{a.path}</span>
                    </span>
                  ) : (
                    <span className="text-slate-300">—</span>
                  )}
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

function methodColor(method: string): string {
  const m = method.toUpperCase();
  if (m === 'GET') return 'bg-emerald-50 text-emerald-700';
  if (m === 'POST') return 'bg-blue-50 text-blue-700';
  if (m === 'PUT' || m === 'PATCH') return 'bg-amber-50 text-amber-700';
  if (m === 'DELETE') return 'bg-red-50 text-red-700';
  return 'bg-slate-100 text-slate-600';
}
