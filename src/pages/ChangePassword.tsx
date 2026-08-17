import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Field, Input, LanguageSwitcher } from '../components/ui';

export function ChangePassword() {
  const { user, setUser, logout } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMessage('');
    if (password.length < 8) {
      setError(t('changePassword.tooShort'));
      return;
    }
    if (password !== confirm) {
      setError(t('changePassword.mismatch'));
      return;
    }
    setLoading(true);
    try {
      await api.put('/auth/password', { newPassword: password });
      if (user) setUser({ ...user, mustChangePassword: false });
      setMessage(t('changePassword.success'));
      navigate('/', { replace: true });
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
            <KeyRound size={18} />
            <h1 className="text-lg font-bold">{t('changePassword.title')}</h1>
          </div>
          <p className="text-sm text-slate-500 mb-6">
            {t('changePassword.subtitle')}
          </p>

          {message && <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-2">{message}</div>}
          {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

          <form onSubmit={onSubmit} className="space-y-4">
            <Field label={t('changePassword.newPassword')} required hint={t('changePassword.passwordHint')}>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required autoComplete="new-password" />
            </Field>
            <Field label={t('changePassword.confirmNewPassword')} required>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required autoComplete="new-password" />
            </Field>
            <Button type="submit" loading={loading} className="w-full justify-center">{t('changePassword.save')}</Button>
            <Button type="button" variant="secondary" className="w-full justify-center" onClick={() => void logout()}>{t('changePassword.signOut')}</Button>
          </form>
        </div>
      </div>
    </div>
  );
}
