import type { ReactNode } from 'react';
import { Icon } from './Icon';
import type { IconName } from './Icon';
import type { RouteName } from '../lib/router';

interface NavItem {
  id: RouteName;
  label: string;
  icon: IconName;
}

export const NAV_ITEMS: NavItem[] = [
  { id: 'home', label: 'ホーム', icon: 'home' },
  { id: 'learn', label: '学習', icon: 'learn' },
  { id: 'memorize', label: '覚え方', icon: 'memorize' },
  { id: 'practice', label: '練習', icon: 'practice' },
  { id: 'chart', label: '点数表', icon: 'chart' },
  { id: 'yaku', label: '役一覧', icon: 'yaku' },
  { id: 'settings', label: '設定', icon: 'settings' },
];

function Brand({ onHome, compact = false }: { onHome: () => void; compact?: boolean }) {
  return (
    <button
      type="button"
      onClick={onHome}
      className="flex items-center gap-2.5 rounded-lg text-left"
      aria-label="麻雀点数トレーナー ホーム"
    >
      <span
        aria-hidden="true"
        className="brand-tile text-tile-man"
      >
        東
      </span>
      <span>
        <span
          className={[
            'block font-serif font-semibold leading-tight text-ivory-50',
            compact ? 'text-[13px]' : 'text-[15px]',
          ].join(' ')}
        >
          麻雀点数トレーナー
        </span>
        {!compact ? (
          <span className="mt-0.5 block text-[10px] tracking-wide text-ivory-50/55">
            役・符・点数を、自分の手で。
          </span>
        ) : null}
      </span>
    </button>
  );
}

function ReviewBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span className="ml-auto rounded-full bg-gold px-1.5 py-0.5 text-[9px] font-bold leading-none text-ink-900">
      復習 {count}
    </span>
  );
}

export interface LayoutProps {
  route: RouteName;
  onNavigate: (route: RouteName) => void;
  reviewCount: number;
  reduceMotion: boolean;
  children: ReactNode;
}

export function Layout({
  route,
  onNavigate,
  reviewCount,
  reduceMotion,
  children,
}: LayoutProps) {
  return (
    <div
      className={[
        'app-shell flex flex-col desk:grid desk:grid-cols-[216px_minmax(0,1fr)]',
        reduceMotion ? 'reduce-motion' : '',
      ].join(' ')}
    >
      {/* デスクトップ左レール */}
      <aside className="no-print sticky top-0 hidden h-screen flex-col border-r border-line bg-felt-800/55 px-4 py-6 backdrop-blur desk:flex">
        <Brand onHome={() => onNavigate('home')} />
        <nav
          aria-label="メインナビゲーション"
          className="mt-8 flex flex-1 flex-col gap-1"
        >
          {NAV_ITEMS.map((item) => {
            const active = item.id === route;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => onNavigate(item.id)}
                aria-current={active ? 'page' : undefined}
                className={[
                  'group relative flex w-full items-center gap-3 rounded-[10px] px-3 py-2.5 text-left text-sm transition-colors',
                  active
                    ? 'bg-ivory-50/10 font-semibold text-ivory-50'
                    : 'text-ivory-50/65 hover:bg-ivory-50/5 hover:text-ivory-50',
                ].join(' ')}
              >
                <span
                  aria-hidden="true"
                  className={[
                    'absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-full',
                    active ? 'bg-vermilion' : 'bg-transparent',
                  ].join(' ')}
                />
                <Icon
                  name={item.icon}
                  className={[
                    'h-[18px] w-[18px]',
                    active ? 'text-gold' : 'text-ivory-50/55',
                  ].join(' ')}
                />
                <span>{item.label}</span>
                {item.id === 'practice' ? (
                  <ReviewBadge count={reviewCount} />
                ) : null}
              </button>
            );
          })}
        </nav>
        <div className="mt-6 border-t border-line pt-4">
          <p className="text-[10px] leading-5 text-ivory-50/45">
            リーチ麻雀・関東標準
            <br />
            オフライン
          </p>
        </div>
      </aside>

      <div className="flex min-h-0 min-w-0 flex-1 flex-col desk:min-h-screen">
        {/* モバイル / タブレット上部（スクロール領域の外に固定） */}
        <header className="no-print z-20 shrink-0 border-b border-line bg-felt-900/85 backdrop-blur desk:hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3">
            <Brand onHome={() => onNavigate('home')} compact />
            <div className="flex items-center gap-2">
              {reviewCount > 0 ? (
                <button
                  type="button"
                  onClick={() => onNavigate('practice')}
                  className="rounded-full border border-gold/40 bg-gold/10 px-2.5 py-1 text-[10px] font-semibold text-gold"
                >
                  復習 {reviewCount}
                </button>
              ) : null}
            </div>
          </div>
          <nav
            aria-label="タブナビゲーション"
            className="hidden gap-1 overflow-x-auto px-3 pb-2 tab:flex desk:hidden"
          >
            {NAV_ITEMS.map((item) => {
              const active = item.id === route;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition-colors',
                    active
                      ? 'bg-ivory-50/10 font-semibold text-ivory-50'
                      : 'text-ivory-50/60 hover:text-ivory-50',
                  ].join(' ')}
                >
                  <Icon name={item.icon} className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </header>

        <div
          data-scroll-root
          className="min-h-0 flex-1 overflow-y-auto scroll-pb-20 desk:flex-1 desk:overflow-visible desk:scroll-pb-0"
        >
          <main className="mx-auto w-full max-w-[1120px] px-4 pb-10 pt-6 tab:px-6 desk:pb-12 desk:pt-9">
            {children}
          </main>

          <footer className="no-print border-t border-line px-4 py-5 text-[10px] leading-5 text-ivory-50/40">
            <div className="mx-auto flex w-full max-w-[1120px] flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <p>麻雀点数トレーナー v0.1.0 — リーチ麻雀の関東標準ルール</p>
              <p>
                採点は docs/RULES.md、保存はこのブラウザの localStorage のみ。
              </p>
            </div>
          </footer>
        </div>

        {/* モバイル下部ナビ: 通常フローで高さを占有する */}
        <nav
          aria-label="クイックナビゲーション"
          className="no-print shrink-0 border-t border-line bg-felt-900/95 pb-[env(safe-area-inset-bottom)] backdrop-blur tab:hidden"
        >
          <div className="flex h-16 items-stretch">
            {NAV_ITEMS.map((item) => {
              const active = item.id === route;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => onNavigate(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 whitespace-nowrap text-[9px] leading-none',
                    active ? 'font-semibold text-ivory-50' : 'text-ivory-50/55',
                  ].join(' ')}
                >
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute inset-x-3 top-0 h-[2px] rounded-full bg-vermilion"
                    />
                  ) : null}
                  <span className="relative">
                    <Icon name={item.icon} className="h-[18px] w-[18px]" />
                    {item.id === 'practice' && reviewCount > 0 ? (
                      <span className="absolute -right-2 -top-1.5 rounded-full bg-gold px-1 text-[8px] font-bold leading-[13px] text-ink-900">
                        {reviewCount}
                      </span>
                    ) : null}
                  </span>
                  {item.label}
                </button>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
}
