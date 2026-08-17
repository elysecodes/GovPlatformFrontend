import { FormEvent, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { api, apiError } from '../lib/api';
import { Button, Field, Input, Select, LanguageSwitcher } from '../components/ui';

interface Unit { id: number; name: string }

export function Register() {
  const { register } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [districts, setDistricts] = useState<Unit[]>([]);
  const [sectors, setSectors] = useState<Unit[]>([]);
  const [cells, setCells] = useState<Unit[]>([]);
  const [villages, setVillages] = useState<Unit[]>([]);
  const [form, setForm] = useState<any>({});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    api.get('/catalog/districts').then((r) => setDistricts(r.data.items)).catch(() => {});
  }, []);

  async function loadSectors(districtId: number) {
    const r = await api.get(`/catalog/districts/${districtId}/sectors`);
    setSectors(r.data.items);
  }
  async function loadCells(sectorId: number) {
    const r = await api.get(`/catalog/sectors/${sectorId}/cells`);
    setCells(r.data.items);
  }
  async function loadVillages(cellId: number) {
    const r = await api.get(`/catalog/cells/${cellId}/villages`);
    setVillages(r.data.items);
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      setSubmitted(true);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-800 p-4">
        <div className="w-full max-w-md">
          <div className="flex justify-end mb-3"><LanguageSwitcher light /></div>
          <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
            <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 text-2xl">✓</div>
            <h1 className="text-lg font-bold text-slate-800">{t('register.submittedTitle')}</h1>
            <p className="mt-2 text-sm text-slate-500">
              {t('register.pendingNotice')}
            </p>
            <div className="mt-6">
              <Button onClick={() => navigate('/login')} className="w-full justify-center">{t('register.goToSignIn')}</Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-800 p-4 py-8">
      <div className="w-full max-w-lg">
        <div className="flex items-center justify-center gap-2 mb-6 text-white">
          <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center"><ShieldCheck size={24} /></div>
          <div>
            <div className="text-xl font-bold leading-tight">{t('register.title')}</div>
            <div className="text-xs text-white/60">{t('register.subtitle')}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}
          <form onSubmit={onSubmit} className="space-y-4">
            <Field label={t('register.fullName')} required>
              <Input value={form.fullName ?? ''} onChange={(e) => setForm({ ...form, fullName: e.target.value })} required />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('register.username')} required>
                <Input value={form.username ?? ''} onChange={(e) => setForm({ ...form, username: e.target.value })} required />
              </Field>
              <Field label={t('register.phone')}>
                <Input value={form.phone ?? ''} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
            </div>
            <Field label={t('register.email')}>
              <Input type="email" value={form.email ?? ''} onChange={(e) => setForm({ ...form, email: e.target.value })} />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t('register.nationalId')}>
                <Input value={form.nationalId ?? ''} onChange={(e) => setForm({ ...form, nationalId: e.target.value })} />
              </Field>
              <Field label={t('register.gender')}>
                <Select value={form.gender ?? ''} onChange={(e) => setForm({ ...form, gender: e.target.value })}>
                  <option value="">{t('register.select')}</option>
                  <option>{t('gender.Male')}</option>
                  <option>{t('gender.Female')}</option>
                </Select>
              </Field>
            </div>
            <Field label={t('register.password')} required hint={t('register.passwordHint')}>
              <Input type="password" value={form.password ?? ''} onChange={(e) => setForm({ ...form, password: e.target.value })} required />
            </Field>

            <div className="pt-2 border-t border-slate-100">
              <p className="text-xs text-slate-500 mb-3">{t('register.location')}</p>
              <div className="grid grid-cols-2 gap-3">
                <Field label={t('register.district')} required>
                  <Select value={form.districtId ?? ''} onChange={(e) => { loadSectors(Number(e.target.value)); setForm({ ...form, districtId: Number(e.target.value), sectorId: undefined, cellId: undefined, villageId: undefined }); setSectors([]); setCells([]); setVillages([]); }}>
                    <option value="">{t('register.select')}</option>
                    {districts.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                  </Select>
                </Field>
                <Field label={t('register.sector')} required>
                  <Select value={form.sectorId ?? ''} disabled={!sectors.length} onChange={(e) => { loadCells(Number(e.target.value)); setForm({ ...form, sectorId: Number(e.target.value), cellId: undefined, villageId: undefined }); setCells([]); setVillages([]); }}>
                    <option value="">{t('register.select')}</option>
                    {sectors.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </Select>
                </Field>
                <Field label={t('register.cell')} required>
                  <Select value={form.cellId ?? ''} disabled={!cells.length} onChange={(e) => { loadVillages(Number(e.target.value)); setForm({ ...form, cellId: Number(e.target.value), villageId: undefined }); setVillages([]); }}>
                    <option value="">{t('register.select')}</option>
                    {cells.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </Select>
                </Field>
                <Field label={t('register.village')} required>
                  <Select value={form.villageId ?? ''} disabled={!villages.length} onChange={(e) => setForm({ ...form, villageId: Number(e.target.value) })}>
                    <option value="">{t('register.select')}</option>
                    {villages.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
                  </Select>
                </Field>
              </div>
            </div>

            <Button type="submit" loading={loading} className="w-full justify-center">{t('register.createAccount')}</Button>
          </form>
          <div className="mt-4 text-center">
            <span className="text-sm text-slate-500">{t('register.alreadyHaveAccount')} </span>
            <Link to="/login" className="text-sm text-brand-700 font-medium hover:underline">{t('register.signIn')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
