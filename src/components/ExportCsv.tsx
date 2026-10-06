import { useState } from 'react';
import { Download } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { Button } from './ui';

/** Downloads the full data of a list endpoint as CSV (?export=csv). */
export function ExportCsvButton({ path, filename = 'export' }: { path: string; filename?: string }) {
  const { t } = useTranslation();
  const [busy, setBusy] = useState(false);

  async function download() {
    setBusy(true);
    try {
      const res = await api.get(path, { params: { export: 'csv' }, responseType: 'blob' });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${filename}.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button variant="secondary" onClick={() => void download()} loading={busy}>
      <Download size={15} /> {t('commonui.exportCsv')}
    </Button>
  );
}