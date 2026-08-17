import { FormEvent, useState } from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { Button, Field, Input, LanguageSwitcher } from '../components/ui';

export function ForgotPassword() {
  const { t } = useTranslation();
  const [username, setUsername] = useState('');
  const [message, setMessage] = useState('');
  const [resetUrl, setResetUrl] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { username });
      setMessage(res.data.message ?? t('forgot.sentMessage'));
      if (res.data.resetUrl) setResetUrl(res.data.resetUrl);
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
            <h1 className="text-lg font-bold">{t('forgot.title')}</h1>
          </div>
          <p className="text-sm text-slate-500 mb-6">{t('forgot.subtitle')}</p>

          {message && <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-2">{message}</div>}
          {resetUrl && (
            <div className="mb-4 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-xs px-3 py-2 break-all">
              {t('forgot.devLink')} <a href={resetUrl} className="underline">{resetUrl}</a>
            </div>
          )}
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label={t('forgot.username')} required>
              <Input value={username} onChange={(e) => setUsername(e.target.value)} required />
            </Field>
            <Button type="submit" loading={loading} className="w-full justify-center">{t('forgot.sendLink')}</Button>
          </form>
          <div className="mt-4 text-center">
            <Link to="/login" className="text-sm text-brand-700 hover:underline">{t('forgot.backToSignIn')}</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
