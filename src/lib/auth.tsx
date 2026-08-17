import { createContext, useCallback, useContext, useMemo, useState, ReactNode } from 'react';
import { api, clearAuth, getStoredUser, setAuth } from './api';
import { AuthUser } from './types';

interface AuthContextValue {
  user: AuthUser | null;
  login: (username: string, password: string) => Promise<LoginResult>;
  completeMfaLogin: (mfaToken: string, code: string) => Promise<AuthUser>;
  register: (data: any) => Promise<void>;
  logout: (refreshToken?: string) => Promise<void>;
  setUser: (u: AuthUser) => void;
  refreshMe: () => Promise<void>;
}

export interface LoginResult {
  user: AuthUser | null;
  requiresTwoFactor: boolean;
  mfaToken?: string;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUserState] = useState<AuthUser | null>(() => getStoredUser());

  const setUser = useCallback((u: AuthUser) => {
    setUserState(u);
    localStorage.setItem('gov_user', JSON.stringify(u));
  }, []);

  const login = useCallback(async (username: string, password: string): Promise<LoginResult> => {
    const res = await api.post('/auth/login', { username, password });
    const data = res.data;
    if (data.requiresTwoFactor) {
      return { user: null, requiresTwoFactor: true, mfaToken: data.mfaToken };
    }
    setAuth(data.accessToken, data.refreshToken, data.user);
    setUserState(data.user);
    return { user: data.user as AuthUser, requiresTwoFactor: false };
  }, []);

  const completeMfaLogin = useCallback(async (mfaToken: string, code: string): Promise<AuthUser> => {
    const res = await api.post('/auth/2fa/login', { mfaToken, code });
    const data = res.data;
    setAuth(data.accessToken, data.refreshToken, data.user);
    setUserState(data.user);
    return data.user as AuthUser;
  }, []);

  const register = useCallback(async (payload: any) => {
    await api.post('/auth/register', payload);
  }, []);

  const logout = useCallback(async (refreshToken?: string) => {
    try {
      await api.post('/auth/logout', { refreshToken: refreshToken ?? localStorage.getItem('gov_refresh_token') });
    } catch {
      /* ignore */
    }
    clearAuth();
    setUserState(null);
  }, []);

  const refreshMe = useCallback(async () => {
    try {
      const res = await api.get('/auth/me');
      const me = res.data;
      const merged: AuthUser = {
        id: me.id,
        fullName: me.fullName,
        username: me.username,
        email: me.email,
        phone: me.phone,
        role: me.role,
        roleName: me.roleName,
        level: me.level,
        profilePhoto: me.profilePhoto,
        mustChangePassword: me.mustChangePassword,
        twoFactorEnabled: me.twoFactorEnabled,
      };
      setUser(merged);
    } catch {
      /* ignore */
    }
  }, [setUser]);

  const value = useMemo(
    () => ({ user, login, completeMfaLogin, register, logout, setUser, refreshMe }),
    [user, login, completeMfaLogin, register, logout, setUser, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
