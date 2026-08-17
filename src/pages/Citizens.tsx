import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { Card, EmptyState, PageHeader, Pagination, Spinner, Table, formatDate } from '../components/ui';
import { Paginated } from '../lib/types';

interface Citizen {
  id: number;
  user?: { fullName: string; email?: string; phone?: string; createdAt: string };
  village?: { name: string };
  household?: { code: string; headName: string };
  nationalId?: string;
  gender?: string;
  createdAt: string;
}

export function Citizens() {
  const [items, setItems] = useState<Citizen[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);

  async function load() {
    setLoading(true);
    try {
      const res = await api.get<Paginated<Citizen>>('/citizens', { params: { page, limit: 15 } });
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
        title="Registered Citizens"
        subtitle="Citizens within your jurisdiction"
        breadcrumb="Northern Province / Citizens"
      />
      {loading ? <Spinner /> : items.length === 0 ? (
        <Card><EmptyState title="No registered citizens" /></Card>
      ) : (
        <Card className="p-0">
          <Table headers={['Name', 'National ID', 'Gender', 'Village', 'Household', 'Phone', 'Registered']}>
            {items.map((c) => (
              <tr key={c.id}>
                <td className="py-3 pr-4 font-medium text-slate-800">{c.user?.fullName}</td>
                <td className="py-3 pr-4 font-mono text-xs text-slate-500">{c.nationalId ?? '—'}</td>
                <td className="py-3 pr-4 text-slate-600">{c.gender ?? '—'}</td>
                <td className="py-3 pr-4 text-slate-600">{c.village?.name}</td>
                <td className="py-3 pr-4 text-slate-600">{c.household?.code ?? '—'}</td>
                <td className="py-3 pr-4 text-slate-600">{c.user?.phone ?? '—'}</td>
                <td className="py-3 pr-4 text-slate-500 text-xs">{formatDate(c.createdAt)}</td>
              </tr>
            ))}
          </Table>
          <div className="px-5 pb-4"><Pagination page={page} pages={pages} onChange={setPage} /></div>
        </Card>
      )}
    </div>
  );
}
