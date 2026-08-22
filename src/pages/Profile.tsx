import { FormEvent, useEffect, useState } from 'react';
import { api, apiError } from '../lib/api';
import { useAuth } from '../lib/auth';
import { Button, Card, Field, Input, PageHeader, Spinner, Table, formatDateTime } from '../components/ui';

export function Profile() {
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
      setMessage('Profile updated');
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
      setMessage('Password changed');
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
      setMessage('Two-factor authentication is now enabled.');
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
      setMessage('Two-factor authentication has been disabled.');
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
      <PageHeader title="My Profile" subtitle="Your account details and security" breadcrumb="Northern Province / Profile" />

      {message && <div className="mb-4 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm px-3 py-2">{message}</div>}
      {error && <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="Account information">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between"><span className="text-slate-500">Role</span><span className="text-slate-800">{profile.roleName}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Username</span><span className="text-slate-800">{profile.username}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Status</span><span className="text-slate-800">{profile.status}</span></div>
            <div className="flex justify-between"><span className="text-slate-500">Last login</span><span className="text-slate-800">{profile.lastLoginAt ? formatDateTime(profile.lastLoginAt) : '—'}</span></div>
          </div>
          {chain.length > 0 && (
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className="text-xs uppercase text-slate-400 mb-2">Administrative scope</div>
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
          <Card title="Update profile">
            <form onSubmit={saveProfile} className="space-y-4">
              <Field label="Full name" required>
                <Input value={profileForm.fullName ?? ''} onChange={(e) => setProfileForm({ ...profileForm, fullName: e.target.value })} required />
              </Field>
              <Field label="Email"><Input value={profileForm.email ?? ''} onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })} /></Field>
              <Field label="Phone"><Input value={profileForm.phone ?? ''} onChange={(e) => setProfileForm({ ...profileForm, phone: e.target.value })} /></Field>
              <Button type="submit" loading={saving}>Save profile</Button>
            </form>
          </Card>

          <Card title="Change password">
            <form onSubmit={changePassword} className="space-y-4">
              <Field label="Current password" required>
                <Input type="password" value={pwdForm.currentPassword ?? ''} onChange={(e) => setPwdForm({ ...pwdForm, currentPassword: e.target.value })} required />
              </Field>
              <Field label="New password" required>
                <Input type="password" value={pwdForm.newPassword ?? ''} onChange={(e) => setPwdForm({ ...pwdForm, newPassword: e.target.value })} required />
              </Field>
              <Button type="submit" loading={saving}>Change password</Button>
            </form>
          </Card>

          <Card title="Two-factor authentication" subtitle="Protect your account with a TOTP authenticator app">
            {mfaSetup ? (
              <div className="space-y-4">
                <p className="text-sm text-slate-500">
                  Scan this QR code with your authenticator app (Google Authenticator, Aegis, etc.), then enter the 6-digit code to confirm.
                </p>
                <a href={mfaSetup.otpauthUrl} target="_blank" rel="noreferrer" className="block text-center text-xs text-brand-700 hover:underline">
                  Open provisioning link
                </a>
                <div className="rounded-lg bg-slate-50 border border-slate-200 p-3 text-center">
                  <div className="text-[10px] uppercase text-slate-400 mb-1">Secret key (manual entry)</div>
                  <code className="text-xs text-slate-700 break-all">{mfaSetup.secret}</code>
                </div>
                <form onSubmit={confirmMfa} className="space-y-3">
                  <Field label="6-digit code" required>
                    <Input value={mfaCode} onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))} inputMode="numeric" placeholder="000000" required />
                  </Field>
                  <div className="flex gap-2">
                    <Button type="submit" loading={mfaBusy}>Confirm & enable</Button>
                    <Button type="button" variant="secondary" onClick={() => setMfaSetup(null)}>Cancel</Button>
                  </div>
                </form>
              </div>
            ) : profile.twoFactorEnabled ? (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <span className={`h-2.5 w-2.5 rounded-full ${profile.twoFactorEnabled ? 'bg-emerald-500' : 'bg-slate-300'}`} />
                  <span className="text-sm text-slate-700 font-medium">{profile.twoFactorEnabled ? 'Enabled' : 'Disabled'}</span>
                </div>
                <form onSubmit={disableMfa} className="space-y-3">
                  <p className="text-xs text-slate-400">To disable, provide a current code from your authenticator app or your account password.</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <Field label="Code">
                      <Input value={mfaDisableForm.code ?? ''} onChange={(e) => setMfaDisableForm({ ...mfaDisableForm, code: e.target.value.replace(/\D/g, '').slice(0, 6) })} inputMode="numeric" placeholder="000000" />
                    </Field>
                    <Field label="Password">
                      <Input type="password" value={mfaDisableForm.password ?? ''} onChange={(e) => setMfaDisableForm({ ...mfaDisableForm, password: e.target.value })} />
                    </Field>
                  </div>
                  <Button type="submit" variant="danger" loading={mfaBusy}>Disable 2FA</Button>
                </form>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-slate-500">Your account is not yet protected by two-factor authentication.</p>
                <Button onClick={startMfaSetup} loading={mfaBusy}>Enable 2FA</Button>
              </div>
            )}
          </Card>
        </div>

        <Card title="Login history" className="lg:col-span-1">
          {history.length === 0 ? (
            <p className="text-sm text-slate-400">No login records.</p>
          ) : (
            <Table headers={['Time', 'Result']}>
              {history.map((h) => (
                <tr key={h.id}>
                  <td className="py-2 pr-4 text-xs text-slate-500">{formatDateTime(h.createdAt)}</td>
                  <td className="py-2 pr-4">
                    <span className={`text-[11px] font-medium ${h.success ? 'text-emerald-600' : 'text-red-600'}`}>{h.success ? 'Success' : 'Failed'}</span>
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
