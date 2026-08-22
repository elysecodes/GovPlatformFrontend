import { FormEvent, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShieldCheck, KeyRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../lib/auth';
import { apiError } from '../lib/api';
import { Button, Field, Input, LanguageSwitcher } from '../components/ui';

export function Login() {
  const { login, completeMfaLogin } = useAuth();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // 2FA challenge step
  const [mfaToken, setMfaToken] = useState('');
  const [mfaCode, setMfaCode] = useState('');
  const [mfaLoading, setMfaLoading] = useState(false);

  async function finishLogin(r: { requiresTwoFactor: boolean; mfaToken?: string }) {
    if (r.requiresTwoFactor) {
      setMfaToken(r.mfaToken!);
      return;
    }
    navigate('/');
  }

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(username, password);
      await finishLogin(result);
    } catch (err) {
      setError(apiError(err));
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitMfa(e: FormEvent) {
    e.preventDefault();
    setError('');
    setMfaLoading(true);
    try {
      await completeMfaLogin(mfaToken, mfaCode);
      navigate('/');
    } catch (err) {
      setError(apiError(err));
    } finally {
      setMfaLoading(false);
    }
  }

  function backToCredentials() {
    setMfaToken('');
    setMfaCode('');
    setError('');
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-900 to-brand-800 p-4">
      <div className="w-full max-w-md">
        <div className="flex justify-end mb-3"><LanguageSwitcher light /></div>
        <div className="flex items-center justify-center gap-2 mb-6 text-white">
          <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center">
            <ShieldCheck size={24} />
          </div>
          <div>
            <div className="text-xl font-bold leading-tight">{t('common.appName')}</div>
            <div className="text-xs text-white/60">{t('common.appSubtitle')}</div>
          </div>
        </div>

        <div className="bg-white rounded-2xl shadow-xl p-8">
          {mfaToken ? (
            <>
              <div className="flex items-center gap-2 mb-1 text-slate-800">
                <KeyRound size={18} />
                <h1 className="text-lg font-bold">{t('login.twoFactorVerification')}</h1>
              </div>
              <p className="text-sm text-slate-500 mb-4">
                {t('login.twoFactorHint')}
              </p>

              {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

              <form onSubmit={onSubmitMfa} className="space-y-4">
                <Field label={t('login.verificationCode')} required>
                  <Input
                    value={mfaCode}
                    onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                    inputMode="numeric"
                    autoFocus
                    placeholder="000000"
                    required
                  />
                </Field>
                <Button type="submit" loading={mfaLoading} className="w-full justify-center">{t('login.verifyAndSignIn')}</Button>
              </form>

              <button onClick={backToCredentials} className="mt-4 w-full text-center text-xs text-slate-500 hover:text-slate-700">
                {t('common.backToSignIn')}
              </button>
            </>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-1 text-slate-800">
                <KeyRound size={18} />
                <h1 className="text-lg font-bold">{t('login.signIn')}</h1>
              </div>
              <p className="text-sm text-slate-500 mb-6">{t('login.usageHint')}</p>

              {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

              <form onSubmit={onSubmit} className="space-y-4">
                <Field label={t('login.username')} required>
                  <Input value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" required />
                </Field>
                <Field label={t('login.password')} required>
                  <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
                </Field>
                <div className="flex justify-end">
                  <Link to="/forgot-password" className="text-xs text-brand-700 hover:underline">{t('login.forgotPassword')}</Link>
                </div>
                <Button type="submit" loading={loading} className="w-full justify-center">{t('login.signIn')}</Button>
              </form>

              <div className="mt-6 text-center">
                <span className="text-sm text-slate-500">{t('login.areYouCitizen')} </span>
                <Link to="/register" className="text-sm text-brand-700 font-medium hover:underline">{t('login.createAccount')}</Link>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
