import { ReactNode, SelectHTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes, ButtonHTMLAttributes } from 'react';
import { Loader2, Languages } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import i18n, { LANG_KEY } from '../i18n';

export function cx(...parts: (string | false | null | undefined)[]) {
  return parts.filter(Boolean).join(' ');
}

export function Card({ title, subtitle, actions, children, className }: {
  title?: ReactNode; subtitle?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string;
}) {
  return (
    <div className={cx('bg-white rounded-xl border border-slate-200 shadow-sm', className)}>
      {(title || actions) && (
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            {title && <h3 className="font-semibold text-slate-800">{title}</h3>}
            {subtitle && <p className="text-xs text-slate-500 mt-0.5">{subtitle}</p>}
          </div>
          {actions}
        </div>
      )}
      <div className="p-5">{children}</div>
    </div>
  );
}

export function Button({ variant = 'primary', loading, className, children, ...rest }: ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'; loading?: boolean;
}) {
  const styles = {
    primary: 'bg-brand-700 hover:bg-brand-800 text-white',
    secondary: 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
    ghost: 'text-brand-700 hover:bg-brand-50',
  } as Record<string, string>;
  return (
    <button
      className={cx(
        'inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed',
        styles[variant],
        className,
      )}
      disabled={loading}
      {...rest}
    >
      {loading && <Loader2 size={15} className="animate-spin" />}
      {children}
    </button>
  );
}

export function LanguageSwitcher({ light = false }: { light?: boolean }) {
  const { i18n } = useTranslation();
  function change(lang: string) {
    localStorage.setItem(LANG_KEY, lang);
    void i18n.changeLanguage(lang);
  }
  return (
    <div className="inline-flex items-center gap-2">
      <Languages size={15} className={light ? 'text-white/60' : 'text-slate-400'} />
      <select
        value={i18n.language}
        onChange={(e) => change(e.target.value)}
        className={cx(
          'text-xs rounded-lg border px-2 py-1.5 focus:outline-none focus:ring-2 focus:ring-brand-600/40',
          light ? 'bg-white/10 border-white/25 text-white' : 'bg-white border-slate-300 text-slate-700',
        )}
        aria-label="Language / Ururimi"
      >
        <option value="en">English</option>
        <option value="rw">Kinyarwanda</option>
      </select>
    </div>
  );
}

export function Input({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={cx(
        'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 bg-white',
        className,
      )}
      {...rest}
    />
  );
}

export function Select({ className, children, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 bg-white',
        className,
      )}
      {...rest}
    >
      {children}
    </select>
  );
}

export function Textarea({ className, ...rest }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea
      className={cx(
        'w-full px-3 py-2 rounded-lg border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600/40 focus:border-brand-600 bg-white',
        className,
      )}
      {...rest}
    />
  );
}

export function Field({ label, required, children, hint }: { label: string; required?: boolean; children: ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-slate-600 mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </span>
      {children}
      {hint && <span className="block text-[11px] text-slate-400 mt-1">{hint}</span>}
    </label>
  );
}

const badgeColors: Record<string, string> = {
  green: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  red: 'bg-red-50 text-red-700 border-red-200',
  amber: 'bg-amber-50 text-amber-700 border-amber-200',
  blue: 'bg-blue-50 text-blue-700 border-blue-200',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
  purple: 'bg-purple-50 text-purple-700 border-purple-200',
};

export function Badge({ children, color = 'slate' }: { children: ReactNode; color?: keyof typeof badgeColors | string }) {
  return (
    <span className={cx('inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium border', badgeColors[color] ?? badgeColors.slate)}>
      {children}
    </span>
  );
}

export function statusColor(status: string): string {
  const s = status?.toUpperCase();
  if (['RESOLVED', 'CLOSED', 'COMPLETED', 'APPROVED', 'FINALIZED', 'ACTIVE'].includes(s)) return 'green';
  if (['REJECTED', 'CANCELLED', 'SUSPENDED', 'LOCKED', 'INACTIVE', 'DISABLED', 'EXPIRED'].includes(s)) return 'red';
  if (['URGENT', 'HIGH', 'ESCALATED'].includes(s)) return 'red';
  if (['IN_PROGRESS', 'UNDER_REVIEW', 'ASSIGNED', 'SUBMITTED', 'PUBLISHED', 'RECEIVED', 'PENDING'].includes(s)) return 'amber';
  if (['MEDIUM'].includes(s)) return 'amber';
  if (['PLANNED', 'DRAFT', 'REVISION', 'LOW'].includes(s)) return 'slate';
  return 'blue';
}

export function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  const s = (status ?? '').toUpperCase();
  const key = `status.${s}`;
  const label = t(key);
  return <Badge color={statusColor(s)}>{label === key ? s.replace(/_/g, ' ') : label}</Badge>;
}

export function StatCard({ label, value, icon, accent = 'brand' }: { label: string; value: ReactNode; icon?: ReactNode; accent?: string }) {
  const accents: Record<string, string> = {
    brand: 'bg-brand-50 text-brand-700',
    green: 'bg-emerald-50 text-emerald-600',
    red: 'bg-red-50 text-red-600',
    amber: 'bg-amber-50 text-amber-600',
    purple: 'bg-purple-50 text-purple-600',
  };
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-4 flex items-center gap-3 shadow-sm">
      {icon && <div className={cx('h-10 w-10 rounded-lg flex items-center justify-center shrink-0', accents[accent])}>{icon}</div>}
      <div className="min-w-0">
        <div className="text-xl font-bold text-slate-800 leading-tight">{value}</div>
        <div className="text-xs text-slate-500 truncate">{label}</div>
      </div>
    </div>
  );
}

export function Modal({ open, onClose, title, children, wide }: {
  open: boolean; onClose: () => void; title: string; children: ReactNode; wide?: boolean;
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onClose}>
      <div
        className={cx('bg-white rounded-xl shadow-xl w-full max-h-[90vh] overflow-y-auto', wide ? 'max-w-3xl' : 'max-w-lg')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h3 className="font-semibold text-slate-800">{title}</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">&times;</button>
        </div>
        <div className="p-5">{children}</div>
      </div>
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-center py-16 text-slate-400">
      <Loader2 className="animate-spin mr-2" size={20} />
      <span className="text-sm">{label ?? t('common.loading')}</span>
    </div>
  );
}

export function EmptyState({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="text-center py-12">
      <div className="text-sm font-medium text-slate-500">{title}</div>
      {children && <div className="text-xs text-slate-400 mt-1">{children}</div>}
    </div>
  );
}

export function Pagination({ page, pages, onChange }: { page: number; pages: number; onChange: (p: number) => void }) {
  const { t } = useTranslation();
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <span className="text-slate-500 text-xs">{t('common.page', { page, pages })}</span>
      <div className="flex gap-2">
        <Button variant="secondary" disabled={page <= 1} onClick={() => onChange(page - 1)}>{t('common.prev')}</Button>
        <Button variant="secondary" disabled={page >= pages} onClick={() => onChange(page + 1)}>{t('common.next')}</Button>
      </div>
    </div>
  );
}

export function PageHeader({ title, subtitle, actions, breadcrumb }: { title: string; subtitle?: string; actions?: ReactNode; breadcrumb?: ReactNode }) {
  return (
    <div className="mb-6">
      {breadcrumb && <div className="text-xs text-slate-400 mb-1">{breadcrumb}</div>}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800">{title}</h1>
          {subtitle && <p className="text-sm text-slate-500 mt-0.5">{subtitle}</p>}
        </div>
        {actions}
      </div>
    </div>
  );
}

export function Table({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto -mx-5 px-5">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-200">
            {headers.map((h) => (
              <th key={h} className="text-left font-semibold text-slate-500 text-xs uppercase py-3 pr-4 whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-100">{children}</tbody>
      </table>
    </div>
  );
}

export function formatDate(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleDateString(i18n.language === 'rw' ? 'rw-RW' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function formatDateTime(d?: string | null) {
  if (!d) return '—';
  return new Date(d).toLocaleString(i18n.language === 'rw' ? 'rw-RW' : 'en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export function money(n: number) {
  return new Intl.NumberFormat('en-RW', { style: 'currency', currency: 'RWF', maximumFractionDigits: 0 }).format(n || 0);
}
