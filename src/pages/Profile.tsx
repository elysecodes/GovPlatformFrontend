import { FormEvent, useEffect, useState } from 'react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { useTranslation } from 'react-i18next';
import { Button, Card, Field, Input, PageHeader, Spinner, Table, formatDateTime } from '../components/ui';

export function Profile() {
  const { t } = useTranslation();
  const { user, setUser, refreshMe } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [profileForm, setProfileForm] = useState<any>({});
  const [pwdForm, setPwdForm] = useState<any>({});
  const [history, setHistory] = useState<any[]>([]);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // 2FA state
  const [mfaSetup, setMfaSetup] = useState<any>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaDisableForm, setMfaDisableForm] = useState<any>({});
  const [mfaBusy, setMfaBusy] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const me = await api.get('/auth/me');
      setProfile(me.data);
      setProfileForm({ fullName: me.data.fullName, phone: me.data.phone, email: me.data.email ?? '' });
      const hist = await api.get('/auth/login-history');
      setHistory(hist.data.items);
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => { void load(); }, []);

  async function saveProfile(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.put('/auth/profile', profileForm);
      await refreshMe();
      await load();
      setMessage(t('profile.profileUpdated'));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function changePassword(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    setError('');
    try {
      await api.put('/auth/password', pwdForm);
      setPwdForm({});
      setMessage(t('profile.passwordChanged'));
    } catch (err) {
      setError(apiError(err));
    } finally {
      setSaving(false);
    }
  }

  async function startMfaSetup() {
    setError('');
    setMessage('');
    try {
      const res = await api.post('/auth/2fa/setup');
      setMfaSetup(res.data);
    } catch (err) {
      setError(apiError(err));
    }
  }

  async function confirmMfa(e: FormEvent) {
    e.preventDefault();
    setMfaBusy(true);
    setError('');
    setMessage('');
    try {
      await api.post('/auth/2fa/verify', { code: mfaCode });
      setMfaSetup(null);
      setMfaCode('');
      setMessage(t('profile.mfaEnabled'));
      await load();
      await refreshMe();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setMfaBusy(false);
    }
  }

  async function disableMfa(e: FormEvent) {
    e.preventDefault();
    setMfaBusy(true);
    setError('');
    setMessage('');
    try {
      await api.post('/auth/2fa/disable', mfaDisableForm);
      setMfaDisableForm({});
      setMessage(t('profile.mfaDisabled'));
      await load();
      await refreshMe();
    } catch (err) {
      setError(apiError(err));
    } finally {
      setMfaBusy(false);
    }
  }

  if (loading) return <Spinner />;

  const scope = profile?.scope;
  const chain = [scope?.province?.name, scope?.district?.name, scope?.sector?.name, scope?.cell?.name, scope?.village?.name].filter(Boolean);

  return (
    <div>
      <PageHeader title={t('profile.title')} subtitle={t('profile.subtitle')} breadcrumb={`${t('common.appName')} / ${t('profile.title')}`} />

      {message && <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-2">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title={t('profile.accountInfo')}>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">{t('profile.role')}</span><span className="text-slate-800">{profile.roleName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{t('profile.username')}</span><span className="text-slate-800">{profile.username}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{t('profile.status')}</span><span className="text-slate-800">{profile.status}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">{t('profile.lastLogin')}</span><span className="text-slate-800">{profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : '—'}</span></div>
          </div>
          {chain.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs uppercase text-slate-400 mb-2">{t('profile.adminScope')}</div>
              <div className="text-sm text-slate-700 space-y-1">
                {chain.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> {c}
                  </div>
                ))}
              </div>
            </div>
          )}
        </Card>

        <div className="space-y-5">
          <Card title={t('profile.updateProfile')}>
            <form onSubmit={saveProfile} className="space-y-4">
              <Field label={t('profile.fullName')} required>
                <Input value={profileForm.fullName ?? ''} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })} required />
              </Field>
              <Field label={t('profile.email')}><Input value={profileForm.email ?? ''} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} /></Field>
              <Field label={t('profile.phone')}><Input value={profileForm.phone ?? ''} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} /></Field>
              <Button type="submit" loading={saving}>{t('profile.saveProfile')}</Button>
            </form>
          </Card>

          <Card title={t('profile.changePassword')}>
            <form onSubmit={changePassword} className="space-y-4">
              <Field label={t('profile.currentPassword')} required>
                <Input type="password" value={pwdForm.currentPassword ?? ''} onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })} required />
              </Field>
              <Field label={t('profile.newPassword')} required>
                <Input type="password" value={pwdForm.newPassword ?? ''} onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })} required />
              </Field>
              <Button type="submit" loading={saving}>{t('profile.changePasswordBtn')}</Button>
            </form>
          </Card>

          <Card title={t('profile.mfaTitle')} subtitle={t('profile.mfaSubtitle')}>
            {mfaSetup ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  {t('profile.mfaScanHint')}
                </p>
                <a href={mfaSetup.otpauthUrl} target="_blank" rel="noreferrer" className="block text-center text-xs text-brand-700 hover:underline">
                  {t('profile.mfaOpenLink')}
                </a>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
                  <div className="text-[10px] uppercase text-slate-400 mb-1">{t('profile.mfaSecretKey')}</div>
                  <code className="text-xs text-slate-700 break-all">{mfaSetup.secret}</code>
                </div>
                <form onSubmit={confirmMfa} className="space-y-3">
                  <Field label={t('profile.mfaCode')} required>
                    <Input value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="000000" required />
                  </Field>
                  <div className="flex gap-2">
                    <Button type="submit" loading={mfaBusy}>{t('profile.mfaConfirmEnable')}</Button>
                    <Button type="button" variant="secondary" onClick={() => setMfaSetup(null)}>{t('profile.cancel')}</Button>
                  </div>
                </form>
              </div>
            ) : profile.twoFactorEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${profile.twoFactorEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="text-sm text-slate-700 font-medium">{profile.twoFactorEnabled ? t('profile.enabled') : t('profile.disabled')}</span>
                </div>
                <form onSubmit={disableMfa} className="space-y-3">
                  <p className="text-xs text-slate-400">{t('profile.mfaDisableHint')}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label={t('profile.code')}>
                      <Input value={mfaDisableForm.code ?? ''} onChange={(e) => setMfaDisableForm({ ...mfaDisableForm, code: e.target.value.replace(/\D/g, '').slice(0, 6) })} inputMode="numeric" placeholder="000000" />
                    </Field>
                    <Field label={t('profile.password')}>
                      <Input type="password" value={mfaDisableForm.password ?? ''} onChange={(e) => setMfaDisableForm({ ...mfaDisableForm, password: e.target.value })} />
                    </Field>
                  </div>
                  <Button type="submit" variant="danger" loading={mfaBusy}>{t('profile.disable2fa')}</Button>
                </form>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">{t('profile.mfaNotEnabled')}</p>
                <Button onClick={startMfaSetup} loading={mfaBusy}>{t('profile.enable2fa')}</Button>
              </div>
            )}
          </Card>
        </div>

        <Card title={t('profile.loginHistory')} className="lg:col-span-1">
          {history.length === 0 ? (
            <p className="text-sm text-slate-400">{t('profile.noLoginRecords')}</p>
          ) : (
            <Table headers={[t('profile.colTime'), t('profile.colResult')]}>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="py-2 pr-4 text-xs text-slate-500">{formatDateTime(h.createdAt)}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-[11px] font-medium ${h.success ? 'text-emerald-600' : 'text-red-600'}`}>{h.success ? t('profile.success') : t('profile.failed')}</span>
                  </td>
                </tr>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </div>
  );
}
