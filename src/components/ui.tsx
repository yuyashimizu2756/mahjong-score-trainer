import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { useEffect, useId, useRef } from 'react';
import { Icon } from './Icon';

type ButtonTone = 'primary' | 'gold' | 'ghost' | 'outline' | 'danger' | 'quiet';
type ButtonSize = 'sm' | 'md' | 'lg';

const TONES: Record<ButtonTone, string> = {
  primary:
    'bg-vermilion text-ivory-50 hover:bg-vermilion-soft disabled:bg-vermilion/40',
  gold: 'bg-gold text-ink-900 hover:brightness-105 disabled:opacity-40',
  ghost:
    'bg-ivory-50/10 text-ivory-50 hover:bg-ivory-50/15 disabled:opacity-40',
  outline:
    'border border-ivory-200 bg-ivory-50 text-ink-900 hover:bg-ivory-100 disabled:opacity-40',
  danger:
    'border border-vermilion bg-transparent text-vermilion hover:bg-vermilion/10 disabled:opacity-40',
  quiet:
    'text-ivory-50/70 hover:bg-ivory-50/10 hover:text-ivory-50 disabled:opacity-40',
};

const SIZES: Record<ButtonSize, string> = {
  sm: 'min-h-8 px-3 py-1.5 text-xs',
  md: 'min-h-10 px-4 py-2 text-sm',
  lg: 'min-h-12 px-5 py-3 text-[15px]',
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: ButtonTone;
  size?: ButtonSize;
  icon?: ReactNode;
}

export function Button({
  tone = 'primary',
  size = 'md',
  icon,
  className = '',
  children,
  type = 'button',
  ...rest
}: ButtonProps) {
  return (
    <button
      type={type}
      className={[
        'inline-flex items-center justify-center gap-2 rounded-[10px] font-semibold transition-colors',
        'disabled:cursor-not-allowed',
        TONES[tone],
        SIZES[size],
        className,
      ].join(' ')}
      {...rest}
    >
      {icon}
      {children}
    </button>
  );
}

export function PageHeader({
  eyebrow,
  title,
  description,
  actions,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow ? (
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.22em] text-gold">
            {eyebrow}
          </p>
        ) : null}
        <h1 className="text-ivory-50">{title}</h1>
        {description ? (
          <p className="mt-2 max-w-2xl text-[13px] leading-6 text-ivory-50/60">
            {description}
          </p>
        ) : null}
      </div>
      {actions ? <div className="shrink-0">{actions}</div> : null}
    </header>
  );
}

export function Panel({
  children,
  className = '',
  tone = 'light',
}: {
  children: ReactNode;
  className?: string;
  tone?: 'light' | 'dark';
}) {
  return (
    <section
      className={[tone === 'light' ? 'card' : 'card-dark', className].join(' ')}
    >
      {children}
    </section>
  );
}

export function SectionTitle({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <div>
        <h2 className="text-[17px] text-ivory-50">{title}</h2>
        {hint ? (
          <p className="mt-0.5 text-[11px] text-ivory-50/50">{hint}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

type BadgeTone = 'gold' | 'jade' | 'vermilion' | 'neutral' | 'dark';

const BADGES: Record<BadgeTone, string> = {
  gold: 'bg-gold/15 text-gold border-gold/35',
  jade: 'bg-jade/15 text-jade border-jade/35',
  vermilion: 'bg-vermilion/15 text-vermilion border-vermilion/35',
  neutral: 'bg-ivory-100 text-ink-700 border-ivory-200',
  dark: 'bg-ivory-50/10 text-ivory-50/70 border-line',
};

export function Badge({
  children,
  tone = 'neutral',
  className = '',
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={[
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold leading-4',
        BADGES[tone],
        className,
      ].join(' ')}
    >
      {children}
    </span>
  );
}

export function Switch({
  checked,
  onChange,
  label,
  description,
  id,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description?: string;
  id?: string;
}) {
  const generatedId = useId();
  const switchId = id ?? generatedId;
  return (
    <div className="flex items-start justify-between gap-4 py-3">
      <div>
        <label
          htmlFor={switchId}
          className="block cursor-pointer text-sm font-semibold text-ink-900"
        >
          {label}
        </label>
        {description ? (
          <p className="mt-0.5 text-xs leading-5 text-ink-500">
            {description}
          </p>
        ) : null}
      </div>
      <button
        id={switchId}
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={[
          'relative mt-0.5 h-6 w-11 shrink-0 rounded-full border transition-colors',
          checked
            ? 'border-gold/60 bg-gold'
            : 'border-ivory-200 bg-ivory-200/60',
        ].join(' ')}
      >
        <span
          aria-hidden="true"
          className={[
            'absolute top-1/2 h-4 w-4 -translate-y-1/2 rounded-full transition-all',
            checked ? 'left-[22px] bg-ink-900' : 'left-[3px] bg-ivory-50',
          ].join(' ')}
        />
      </button>
    </div>
  );
}

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel,
  tone = 'danger',
  onConfirm,
  onCancel,
}: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  tone?: 'danger' | 'gold';
  onConfirm: () => void;
  onCancel: () => void;
}) {
  const confirmRef = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (open) confirmRef.current?.focus();
  }, [open]);
  if (!open) return null;
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-felt-900/75 p-4 backdrop-blur-sm"
      role="presentation"
      onKeyDown={(event) => {
        if (event.key === 'Escape') onCancel();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-title"
        className="card w-full max-w-md p-6 animate-panel"
      >
        <div className="flex items-start gap-3">
          <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-vermilion/15 text-vermilion">
            <Icon name="alert" className="h-5 w-5" />
          </span>
          <div>
            <h2 id="confirm-title" className="text-[17px] text-ink-900">
              {title}
            </h2>
            <p className="mt-2 text-[13px] leading-6 text-ink-700">
              {description}
            </p>
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button tone="outline" size="sm" onClick={onCancel}>
            キャンセル
          </Button>
          <button
            ref={confirmRef}
            type="button"
            onClick={onConfirm}
            className={[
              'inline-flex min-h-8 items-center justify-center rounded-[10px] px-3 py-1.5 text-xs font-semibold transition-colors',
              tone === 'danger'
                ? 'bg-vermilion text-ivory-50 hover:bg-vermilion-soft'
                : 'bg-gold text-ink-900 hover:brightness-105',
            ].join(' ')}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

export function ProgressBar({
  value,
  max,
  label,
}: {
  value: number;
  max: number;
  label: string;
}) {
  const ratio = max > 0 ? Math.min(1, value / max) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] text-ivory-50/55">
        <span>{label}</span>
        <span className="nums">
          {value} / {max}
        </span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={max}
        aria-valuenow={value}
        aria-label={label}
        className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-ivory-50/10"
      >
        <div
          className="h-full rounded-full bg-gold transition-[width] duration-200"
          style={{ width: `${Math.round(ratio * 100)}%` }}
        />
      </div>
    </div>
  );
}
