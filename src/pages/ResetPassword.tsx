import { FormEvent, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { Button, Field, Input, LanguageSwitcher } from '../components/ui';

export function ResetPassword() {
  const { t } = useTranslation();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const token = params.get('token') ?? '';
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) {
      setError(t('reset.mismatch'));
      return;
    }
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, password });
      navigate('/login');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-800 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-3"><LanguageSwitcher light /></div>
        <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
          <div className="flex items-center gap-2 mb-1 text-slate-800">
            <ShieldCheck size={18} />
            <h1 className="text-lg font-bold">{t('reset.title')}</h1>
          </div>
          <p className="text-sm text-slate-500 mb-6">{t('reset.subtitle')}</p>

          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label={t('reset.newPassword')} required>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            </Field>
            <Field label={t('reset.confirmPassword')} required>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
            </Field>
            <Button type="submit" loading={loading} className="w-full justify-center">{t('reset.update')}</Button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-brand-700 hover:underline">{t('reset.backToSignIn')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
