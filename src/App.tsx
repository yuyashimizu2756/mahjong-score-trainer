import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Hand } from './components/Hand';
import { Tile } from './components/Tile';
import { computeScore } from './engine/score';
import { parseTiles } from './engine/tiles';
import type { ScoreResult, Tile as TileType } from './engine/types';

type TabId = 'home' | 'learn' | 'practice' | 'chart' | 'yaku' | 'settings';

type IconName = TabId | 'arrow' | 'spark';

interface TabDefinition {
  id: TabId;
  label: string;
  short: string;
  icon: IconName;
  description: string;
  planned: string[];
}

const TABS: TabDefinition[] = [
  {
    id: 'home',
    label: 'ホーム',
    short: 'ホーム',
    icon: 'home',
    description: '学習の進み具合と今日の成績をまとめます。',
    planned: ['学習進捗', '今日の成績', 'クイック開始'],
  },
  {
    id: 'learn',
    label: '学習',
    short: '学習',
    icon: 'learn',
    description: '役 → 翻 → 符 → 点数の流れを 6 つのレッスンで解説します。',
    planned: ['6 レッスンのステップ式解説', '各レッスン末の確認問題', 'つまずきポイントの復習'],
  },
  {
    id: 'practice',
    label: '練習',
    short: '練習',
    icon: 'practice',
    description: '実際の牌姿と場況から、翻・符・点数を回答します。',
    planned: ['難易度 3 段階（入門 / 標準 / 上級）', '回答は 1 問ずつ / 4 択から選択', '間違いの復習キュー'],
  },
  {
    id: 'chart',
    label: '点数表',
    short: '点数表',
    icon: 'chart',
    description: '子 / 親 × ツモ / ロン × 符 × 翻の早見表です。',
    planned: ['符 × 翻の点数表', '現在の問題のセルをハイライト', '満貫以上の上限表示'],
  },
  {
    id: 'yaku',
    label: '役一覧',
    short: '役一覧',
    icon: 'yaku',
    description: '門前 / 副露の翻数、成立条件、例を検索できます。',
    planned: ['役カタログ（検索・絞り込み）', '喰い下がりの表示', '役満の複合ルール'],
  },
  {
    id: 'settings',
    label: '設定',
    short: '設定',
    icon: 'settings',
    description: '出題範囲や表示、学習データを管理します。',
    planned: ['出題範囲の設定', '牌の色・サイズ', '成績リセット / データ削除'],
  },
];

const SAMPLE_TILES = parseTiles('234m567p555z666z77z') ?? [];
const SAMPLE_WIN =
  SAMPLE_TILES.find((tile) => tile.suit === 'z' && tile.rank === 7) ??
  SAMPLE_TILES[0];

const SAMPLE_RESULT: ScoreResult | { ok: false; error: string } =
  SAMPLE_TILES.length > 0
    ? computeScore({
        concealed: SAMPLE_TILES,
        melds: [],
        winTile: SAMPLE_WIN,
        ctx: {
          tsumo: false,
          seatWind: 2,
          roundWind: 1,
          riichi: false,
          doraIndicators: [],
          honba: 0,
          riichiSticks: 0,
        },
      })
    : { ok: false, error: 'サンプルを読み込めませんでした' };

function Icon({
  name,
  className = 'h-5 w-5',
}: {
  name: IconName;
  className?: string;
}) {
  const paths: Record<IconName, ReactNode> = {
    home: (
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.5V21h14V9.5" />
        <path d="M9.5 21v-6h5v6" />
      </>
    ),
    learn: (
      <>
        <path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z" />
        <path d="M4 20.5A2.5 2.5 0 0 1 6.5 18H20v3H6.5" />
        <path d="M8 7h8M8 11h6" />
      </>
    ),
    practice: (
      <>
        <circle cx="12" cy="12" r="8.5" />
        <circle cx="12" cy="12" r="4.5" />
        <circle cx="12" cy="12" r="1" />
      </>
    ),
    chart: (
      <>
        <rect x="3.5" y="4.5" width="17" height="15" rx="2" />
        <path d="M3.5 9.5h17M3.5 14.5h17M9 4.5v15M15 4.5v15" />
      </>
    ),
    yaku: (
      <>
        <path d="M8 6h12M8 12h12M8 18h12" />
        <path d="M4 6h.01M4 12h.01M4 18h.01" />
      </>
    ),
    settings: (
      <>
        <circle cx="12" cy="12" r="3" />
        <path d="M19.4 15a1.7 1.7 0 0 0 .34 1.87l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.7 1.7 0 0 0-1.87-.34 1.7 1.7 0 0 0-1 1.55V21a2 2 0 1 1-4 0v-.09a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.87.34l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.7 1.7 0 0 0 4.6 15a1.7 1.7 0 0 0-1.55-1H3a2 2 0 1 1 0-4h.09A1.7 1.7 0 0 0 4.6 8.9a1.7 1.7 0 0 0-.34-1.87l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.7 1.7 0 0 0 9 4.54a1.7 1.7 0 0 0 1-1.55V3a2 2 0 1 1 4 0v.09a1.7 1.7 0 0 0 1 1.55 1.7 1.7 0 0 0 1.87-.34l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.7 1.7 0 0 0 19.4 9c.14.37.4.68.74.9.27.17.58.26.9.26H21a2 2 0 1 1 0 4h-.09a1.7 1.7 0 0 0-1.51.84z" />
      </>
    ),
    arrow: <path d="M5 12h14M13 6l6 6-6 6" />,
    spark: (
      <>
        <path d="m12 3 1.6 4.9L18.5 9.5l-4.9 1.6L12 16l-1.6-4.9L5.5 9.5l4.9-1.6z" />
        <path d="M18.5 15.5 19.3 18l2.2.8-2.2.8-.8 2.4-.8-2.4-2.2-.8 2.2-.8z" />
      </>
    ),
  };

  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.7"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      {paths[name]}
    </svg>
  );
}

function readTabFromHash(): TabId {
  if (typeof window === 'undefined') return 'home';
  const hash = window.location.hash.replace(/^#\/?/, '');
  return TABS.some((tab) => tab.id === hash) ? (hash as TabId) : 'home';
}

function PlaceholderPage({ tab }: { tab: TabDefinition }) {
  return (
    <section className="mx-auto max-w-3xl rounded-3xl border border-kinari bg-paper-soft p-6 shadow-[0_18px_50px_-30px_rgba(16,60,49,0.45)] sm:p-10">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-forest-mist text-forest">
          <Icon name={tab.icon} />
        </span>
        <div>
          <h2 className="text-xl font-bold text-forest sm:text-2xl">{tab.label}</h2>
          <p className="text-xs font-medium tracking-wide text-vermillion">準備中</p>
        </div>
      </div>

      <p className="mt-5 text-sm leading-7 text-sumi-soft sm:text-base">
        {tab.description}
      </p>

      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {tab.planned.map((item) => (
          <li
            key={item}
            className="flex items-start gap-2 rounded-xl border border-kinari bg-paper px-3 py-2 text-sm text-sumi"
          >
            <span
              aria-hidden="true"
              className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-vermillion"
            />
            {item}
          </li>
        ))}
      </ul>

      <p className="mt-7 rounded-xl border border-forest/15 bg-forest-mist/60 px-4 py-3 text-xs leading-6 text-forest">
        点数計算エンジンと画面の土台は実装済みです。この画面の本実装は Issue #2
        以降で追加します。
      </p>
    </section>
  );
}

function SampleCard() {
  const result = SAMPLE_RESULT;
  const yaku = result.ok ? result.yaku.map((hit) => hit.name).join('・') : '—';

  return (
    <aside className="flex h-full flex-col justify-between rounded-3xl border border-forest/20 bg-forest p-5 text-paper shadow-[0_24px_60px_-35px_rgba(16,60,49,0.9)] sm:p-7">
      <div>
        <div className="flex items-center justify-between">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-paper/60">
            例題 / 標準
          </p>
          <span className="rounded-full border border-paper/25 px-2.5 py-1 text-[11px] text-paper/80">
            {result.ok ? `${result.han} 翻 ${result.fu} 符` : '準備中'}
          </span>
        </div>

        <div className="mt-5 rounded-2xl bg-paper/95 p-3 sm:p-4">
          <Hand
            concealed={SAMPLE_TILES}
            winTile={SAMPLE_WIN}
            size="sm"
            className="gap-1"
          />
        </div>

        <dl className="mt-5 grid grid-cols-[4.5rem_1fr] gap-y-2 text-sm">
          <dt className="text-paper/55">成立役</dt>
          <dd className="font-medium">{yaku}</dd>
          <dt className="text-paper/55">符</dt>
          <dd className="font-medium">{result.ok ? `${result.fu} 符` : '—'}</dd>
          <dt className="text-paper/55">点数</dt>
          <dd className="font-medium">
            {result.ok
              ? `${result.payments.ron?.toLocaleString('ja-JP')} 点`
              : '—'}
          </dd>
        </dl>
      </div>

      <p className="mt-6 flex items-center gap-2 border-t border-paper/15 pt-4 text-xs text-paper/60">
        <Icon name="spark" className="h-4 w-4 text-gold" />
        和了牌を朱色でハイライトしています
      </p>
    </aside>
  );
}

function HomePage({ onSelect }: { onSelect: (tab: TabId) => void }) {
  const features: Array<{ tab: TabId; title: string; body: string; icon: IconName }> = [
    {
      tab: 'learn',
      title: '学習',
      body: '役から点数までの流れを、6 つのレッスンで順番に。',
      icon: 'learn',
    },
    {
      tab: 'practice',
      title: '練習',
      body: '実際の牌姿と場況で、翻・符・点数を反復する。',
      icon: 'practice',
    },
    {
      tab: 'chart',
      title: '点数表',
      body: '子 / 親 × ツモ / ロン。迷ったらすぐ確認。',
      icon: 'chart',
    },
    {
      tab: 'yaku',
      title: '役一覧',
      body: '門前と副露の翻数、条件、例を検索できる。',
      icon: 'yaku',
    },
  ];

  return (
    <div className="space-y-8">
      <section className="grid gap-5 lg:grid-cols-[1.08fr_0.92fr]">
        <div className="rounded-3xl border border-kinari bg-paper-soft p-6 shadow-[0_18px_50px_-30px_rgba(16,60,49,0.45)] sm:p-9">
          <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-vermillion">
            Riichi Mahjong Score Trainer
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight text-forest sm:text-4xl">
            点数計算を、
            <br />
            理解して反復して身につける。
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-7 text-sumi-soft sm:text-base">
            役 → 翻 → 符 → 点数の流れを、実際の牌姿と場況で練習できます。
            1 問 30 秒の反復と、その場で分解して見せる解説で、迷わない計算を目指します。
          </p>

          <div className="mt-7 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => onSelect('practice')}
              className="inline-flex items-center gap-2 rounded-full bg-forest px-5 py-2.5 text-sm font-semibold text-paper transition-colors hover:bg-forest-soft"
            >
              練習をはじめる
              <Icon name="arrow" className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => onSelect('learn')}
              className="inline-flex items-center gap-2 rounded-full border border-forest/25 px-5 py-2.5 text-sm font-semibold text-forest transition-colors hover:bg-forest-mist"
            >
              学習の流れを見る
            </button>
          </div>

          <dl className="mt-8 grid grid-cols-3 gap-3 border-t border-kinari pt-5">
            {[
              ['6', 'レッスン'],
              ['3', '難易度'],
              ['120+', 'エンジンテスト'],
            ].map(([value, label]) => (
              <div key={label}>
                <dt className="text-[11px] tracking-wide text-sumi-soft">{label}</dt>
                <dd className="mt-1 text-xl font-bold text-forest">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <SampleCard />
      </section>

      <section aria-labelledby="features-heading">
        <div className="flex items-end justify-between gap-4">
          <h2 id="features-heading" className="text-lg font-bold text-forest">
            できること
          </h2>
          <p className="text-xs text-sumi-soft">v0.1.0</p>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {features.map((feature) => (
            <button
              key={feature.tab}
              type="button"
              onClick={() => onSelect(feature.tab)}
              className="group rounded-2xl border border-kinari bg-paper-soft p-4 text-left transition-colors hover:border-forest/30 hover:bg-forest-mist/50"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest-mist text-forest">
                <Icon name={feature.icon} className="h-5 w-5" />
              </span>
              <span className="mt-3 block text-sm font-bold text-forest">
                {feature.title}
              </span>
              <span className="mt-1 block text-xs leading-6 text-sumi-soft">
                {feature.body}
              </span>
            </button>
          ))}
        </div>
      </section>

      <section className="rounded-2xl border border-kinari bg-paper-soft px-5 py-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-sumi">
            <span className="font-semibold text-forest">実装状況:</span>{' '}
            エンジン（役・符・点数・出題）は実装済み。画面は順次追加します。
          </p>
          <div className="flex flex-wrap gap-2 text-[11px] font-medium">
            <span className="rounded-full bg-forest-mist px-2.5 py-1 text-forest">
              エンジン済み
            </span>
            <span className="rounded-full bg-vermillion-soft px-2.5 py-1 text-vermillion">
              UI 準備中
            </span>
            <span className="rounded-full bg-paper-deep px-2.5 py-1 text-sumi-soft">
              オフライン / 単一 HTML
            </span>
          </div>
        </div>
      </section>
    </div>
  );
}

function TileLegend() {
  const samples: TileType[] = [
    { suit: 'm', rank: 1 },
    { suit: 'p', rank: 5 },
    { suit: 's', rank: 5, red: true },
    { suit: 'z', rank: 7 },
  ];
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-kinari bg-paper-soft px-4 py-3">
      <div className="flex gap-1">
        {samples.map((tile, index) => (
          <Tile key={index} tile={tile} size="sm" />
        ))}
        <Tile tile={{ suit: 's', rank: 1 }} size="sm" faceDown />
      </div>
      <p className="text-xs leading-6 text-sumi-soft">
        萬子・筒子・索子・字牌は色で区別。赤 5 と伏せ牌も CSS で描画します。
      </p>
    </div>
  );
}

export default function App() {
  const [tabId, setTabId] = useState<TabId>(readTabFromHash);
  const tab = TABS.find((item) => item.id === tabId) ?? TABS[0];

  useEffect(() => {
    const onHashChange = () => setTabId(readTabFromHash());
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  useEffect(() => {
    document.title = `${tab.label} | 麻雀点数トレーナー`;
  }, [tab.label]);

  const select = (id: TabId) => {
    setTabId(id);
    if (typeof window !== 'undefined') {
      try {
        window.history.replaceState(null, '', `#${id}`);
      } catch {
        window.location.hash = id;
      }
    }
  };

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-kinari/80 bg-paper/85 backdrop-blur">
        <div className="mx-auto w-full max-w-6xl px-4 pb-2 pt-3 sm:px-6">
          <div className="flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => select('home')}
              className="flex items-center gap-2.5 rounded-lg text-left"
              aria-label="麻雀点数トレーナー ホーム"
            >
              <span
                aria-hidden="true"
                className="flex h-9 w-9 items-center justify-center rounded-xl bg-forest text-lg font-bold text-paper shadow-sm"
              >
                東
              </span>
              <span>
                <span className="block text-sm font-bold leading-tight text-forest">
                  麻雀点数トレーナー
                </span>
                <span className="block text-[10px] tracking-wide text-sumi-soft">
                  役・符・点数を、自分の手で。
                </span>
              </span>
            </button>
            <span className="hidden rounded-full border border-forest/15 bg-forest-mist px-3 py-1 text-[11px] font-medium text-forest sm:inline">
              v0.1.0
            </span>
          </div>

          <nav
            aria-label="メインナビゲーション"
            className="mt-2 flex gap-1 overflow-x-auto pb-1"
          >
            {TABS.map((item) => {
              const active = item.id === tabId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => select(item.id)}
                  aria-current={active ? 'page' : undefined}
                  className={[
                    'inline-flex shrink-0 items-center gap-2 rounded-full px-3.5 py-2 text-sm font-medium transition-colors',
                    active
                      ? 'bg-forest text-paper shadow-sm'
                      : 'text-sumi-soft hover:bg-forest-mist hover:text-forest',
                  ].join(' ')}
                >
                  <Icon name={item.icon} className="h-4 w-4" />
                  {item.label}
                </button>
              );
            })}
          </nav>
        </div>
      </header>

      <main className="mx-auto w-full max-w-6xl flex-1 px-4 py-7 sm:px-6 sm:py-10">
        {tab.id === 'home' ? (
          <div className="space-y-6">
            <HomePage onSelect={select} />
            <TileLegend />
          </div>
        ) : (
          <PlaceholderPage tab={tab} />
        )}
      </main>

      <footer className="border-t border-kinari/80 bg-paper-soft/60">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-2 px-4 py-5 text-[11px] text-sumi-soft sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <p>麻雀点数トレーナー v0.1.0 — リーチ麻雀の関東標準ルール</p>
          <p>採点ルールは docs/RULES.md、設計は docs/DESIGN.md に従います。</p>
        </div>
      </footer>
    </div>
  );
}
