import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { api } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Field, Input, Select } from './ui';

interface Unit { id: number; name: string }

/** Scope-aware village selector. Locks village leaders to their own village. */
export function VillagePicker({ value, onChange, label, required = false }: {
  value?: number; onChange: (v: number) => void; label?: string; required?: boolean;
}) {
  const { t } = useTranslation();
  const { user } = useAuth();
  const level = user?.level ?? 6;

  const [scope, setScope] = useState<any>(null);
  const [districts, setDistricts] = useState<Unit[]>([]);
  const [sectors, setSectors] = useState<Unit[]>([]);
  const [cells, setCells] = useState<Unit[]>([]);
  const [villages, setVillages] = useState<Unit[]>([]);

  useEffect(() => {
    void api.get('/catalog/scope-tree').then((r) => {
      const s = r.data.scope;
      setScope(s);
      if (s.level >= 5 && s.villageId) {
        onChange(s.villageId);
      } else if (s.level === 4 && s.cellId) {
        void api.get(`/catalog/cells/${s.cellId}/villages`).then((v) => setVillages(v.data.items)).catch(() => {});
      } else {
        void api.get('/catalog/districts').then((d) => setDistricts(d.data.items)).catch(() => {});
      }
    }).catch(() => {});
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadSectors(d: number) { setSectors((await api.get(`/catalog/districts/${d}/sectors`)).data.items); }
  async function loadCells(s: number) { setCells((await api.get(`/catalog/sectors/${s}/cells`)).data.items); }
  async function loadVillages(c: number) { setVillages((await api.get(`/catalog/cells/${c}/villages`)).data.items); }

  if (level >= 5) {
    return <Field label={label ?? t('villagepicker.village')} required={required}><Input value={scope?.village?.name ?? t('villagepicker.yourVillage')} disabled /></Field>;
  }
  if (level === 4) {
    return (
      <Field label={label ?? t('villagepicker.village')} required={required}>
        <Select value={value ?? ''} onChange={(e) => onChange(Number(e.target.value))} required={required}>
          <option value="">{t('villagepicker.selectVillage')}</option>
          {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
      </Field>
    );
  }
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      <Field label={t('villagepicker.district')} required>
        <Select value={value === undefined ? '' : ''} onChange={(e) => { loadSectors(Number(e.target.value)); setSectors([]); setCells([]); setVillages([]); }}>
          <option value="">{t('villagepicker.select')}</option>
          {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
        </Select>
      </Field>
      <Field label={t('villagepicker.sector')} required>
        <Select disabled={!sectors.length} onChange={(e) => { loadCells(Number(e.target.value)); setCells([]); setVillages([]); }}>
          <option value="">{t('villagepicker.select')}</option>
          {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
        </Select>
      </Field>
      <Field label={t('villagepicker.cell')} required>
        <Select disabled={!cells.length} onChange={(e) => { loadVillages(Number(e.target.value)); setVillages([]); }}>
          <option value="">{t('villagepicker.select')}</option>
          {cells.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </Select>
      </Field>
      <Field label={t('villagepicker.village')} required={required}>
        <Select value={value ?? ''} disabled={!villages.length} onChange={(e) => onChange(Number(e.target.value))} required={required}>
          <option value="">{t('villagepicker.select')}</option>
          {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </Select>
      </Field>
    </div>
  );
}