import axios, { AxiosError } from 'axios';
import i18n from '../i18n';

export const TOKEN_KEY = 'gov_access_token';
export const REFRESH_KEY = 'gov_refresh_token';
export const USER_KEY = 'gov_user';

export const api = axios.create({
  baseURL: '/api/v1',
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

let refreshing: Promise<string> | null = null;

api.interceptors.response.use(
  (res) => res,
  async (error: AxiosError) => {
    const original: any = error.config;
    const status = error.response?.status;

    if (status === 401 && original && !original._retry && !original.url.includes('/auth/login')) {
      original._retry = true;
      try {
        const refreshToken = localStorage.getItem(REFRESH_KEY);
        if (!refreshToken) throw new Error('no refresh token');
        if (!refreshing) {
          refreshing = axios
            .post('/api/v1/auth/refresh', { refreshToken })
            .then((r) => r.data.accessToken as string)
            .finally(() => {
              refreshing = null;
            });
        }
        const token = await refreshing;
        localStorage.setItem(TOKEN_KEY, token);
        original.headers.Authorization = `Bearer ${token}`;
        return api(original);
      } catch {
        localStorage.clear();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  },
);

export function apiError(err: unknown): string {
  if (axios.isAxiosError(err)) {
    const data = err.response?.data as any;
    const status = err.response?.status;
    const message = typeof data?.error === 'string' && data.error ? data.error : err.message;
    return translateApiError(message, status);
  }
  return String(err);
}

function translateApiError(message: string, status?: number): string {
  const t = (key: string) => i18n.t(`errors.${key}`);
  if (/locked/i.test(message)) return t('errors.accountLocked');
  if (/pending approval/i.test(message)) return t('errors.accountPending');
  if (/inactive/i.test(message)) return t('errors.accountInactive');
  if (/disabled/i.test(message)) return t('errors.accountDisabled');
  if (/expired/i.test(message)) return t('errors.accountExpired');
  if (/too many requests/i.test(message)) return t('errors.rateLimited');
  if (/invalid|incorrect|credential|password|username/i.test(message)) return t('errors.invalidCredentials');
  if (/verification code|authenticator|two-factor/i.test(message)) return t('errors.invalidTotp');
  if (status === 403) return t('errors.forbidden');
  if (status === 404) return t('errors.notFound');
  if (status === 422) return t('errors.validationFailed');
  if (status === 401) return t('errors.invalidCredentials');
  return message || t('errors.generic');
}

export function setAuth(accessToken: string, refreshToken: string, user: any) {
  localStorage.setItem(TOKEN_KEY, accessToken);
  localStorage.setItem(REFRESH_KEY, refreshToken);
  localStorage.setItem(USER_KEY, JSON.stringify(user));
}

export function clearAuth() {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(REFRESH_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredUser(): any | null {
  try {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}
