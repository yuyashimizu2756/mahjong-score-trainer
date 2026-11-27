import { useMemo, useState } from 'react';
import type { Stats } from '../../lib/storage';
import {
  YAKU_CATALOG,
  matchesFilter,
  searchYaku,
  sortYaku,
  type YakuEntry,
  type YakuFilter,
} from '../../data/yaku';
import { parseTiles } from '../../engine/tiles';
import { Hand } from '../../components/Hand';
import { Icon } from '../../components/Icon';
import { Badge, PageHeader } from '../../components/ui';

const FILTERS: Array<{ id: YakuFilter; label: string }> = [
  { id: 'all', label: 'すべて' },
  { id: 'closed', label: '門前' },
  { id: 'open', label: '副露' },
  { id: 'yakuman', label: '役満' },
];

function hanBadge(entry: YakuEntry) {
  if (entry.yakuman) {
    return (
      <Badge tone="vermilion">
        {entry.yakuman >= 2 ? `${entry.yakuman} 倍役満` : '役満'}
      </Badge>
    );
  }
  return (
    <Badge tone="gold">
      門前 {entry.closedHan ?? '—'} 翻 / 副露 {entry.openHan ?? '—'}
    </Badge>
  );
}

function accuracyOf(
  stats: Stats,
  id: string,
): { total: number; percent: number } {
  const record = stats.byYaku[id];
  if (!record || record.total === 0) return { total: 0, percent: 0 };
  return {
    total: record.total,
    percent: Math.round((record.correct / record.total) * 100),
  };
}

function YakuCard({
  entry,
  weak,
  accuracy,
}: {
  entry: YakuEntry;
  weak: boolean;
  accuracy: number;
}) {
  const tiles = parseTiles(entry.example) ?? [];
  return (
    <article
      data-testid="yaku-card"
      className="card flex flex-col p-4"
      aria-labelledby={`yaku-${entry.id}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-1.5">
            <h2 id={`yaku-${entry.id}`} className="text-[17px] text-ink-900">
              {entry.name}
            </h2>
            {weak ? <Badge tone="vermilion">苦手 {accuracy}%</Badge> : null}
          </div>
          <p className="text-[10px] tracking-wide text-ink-500">
            {entry.reading}
          </p>
        </div>
        {hanBadge(entry)}
      </div>

      <p className="mt-2.5 text-[12px] leading-6 text-ink-700">
        {entry.condition}
      </p>
      {entry.note ? (
        <p className="mt-1.5 rounded-lg border border-ivory-200 bg-ivory-100/60 px-2.5 py-1.5 text-[11px] leading-5 text-ink-500">
          複合の注意: {entry.note}
        </p>
      ) : null}

      <div className="mt-3 rounded-lg border border-ivory-200 bg-ivory-100/60 p-2">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="text-[9px] font-semibold uppercase tracking-wide text-ink-500">
            例
          </span>
          <span className="text-[9px] text-ink-500">{entry.exampleLabel}</span>
        </div>
        <div className="mt-1.5 overflow-x-auto scroll-thin">
          <Hand concealed={tiles} size="sm" />
        </div>
      </div>
    </article>
  );
}

export interface YakuPageProps {
  stats: Stats;
}

export function YakuPage({ stats }: YakuPageProps) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<YakuFilter>('all');
  const [order, setOrder] = useState<'catalog' | 'hanDesc' | 'hanAsc'>(
    'catalog',
  );

  const entries = useMemo(() => {
    const filtered = YAKU_CATALOG.filter((entry) =>
      matchesFilter(entry, filter),
    );
    const searched = searchYaku(filtered, query);
    return sortYaku(searched, order);
  }, [filter, order, query]);

  const weakCount = YAKU_CATALOG.filter((entry) => {
    const record = stats.byYaku[entry.id];
    if (!record || record.total < 2) return false;
    return record.correct / record.total < 0.6;
  }).length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Yaku"
        title="役一覧"
        description="全 42 役の翻数・成立条件・複合の注意を検索できます。練習で正答率の低い役には「苦手」バッジが付きます。"
        actions={
          <div className="flex items-center gap-2">
            <Badge tone="dark">{YAKU_CATALOG.length} 役</Badge>
            {weakCount > 0 ? (
              <Badge tone="vermilion">苦手 {weakCount}</Badge>
            ) : null}
          </div>
        }
      />

      <div className="card-dark flex flex-col gap-3 p-3 sm:flex-row sm:items-center">
        <label className="relative flex-1">
          <span className="sr-only">役を検索</span>
          <Icon
            name="search"
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ivory-50/40"
          />
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="役名・読み・条件で検索（例: 平和、ぴんふ）"
            className="h-10 w-full rounded-[10px] border border-line bg-felt-900/50 pl-9 pr-3 text-sm text-ivory-50 placeholder:text-ivory-50/35"
          />
        </label>

        <div
          role="group"
          aria-label="役のフィルタ"
          className="flex flex-wrap gap-1"
        >
          {FILTERS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setFilter(item.id)}
              aria-pressed={filter === item.id}
              className={[
                'rounded-[8px] border px-3 py-1.5 text-[11px] font-semibold transition-colors',
                filter === item.id
                  ? 'border-gold/60 bg-gold/15 text-gold'
                  : 'border-line text-ivory-50/60 hover:bg-ivory-50/5 hover:text-ivory-50',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-2 text-[11px] text-ivory-50/60">
          <span>並び</span>
          <select
            value={order}
            onChange={(event) =>
              setOrder(event.target.value as 'catalog' | 'hanDesc' | 'hanAsc')
            }
            className="h-9 rounded-[8px] border border-line bg-felt-900/60 px-2 text-[11px] text-ivory-50"
          >
            <option value="catalog">カタログ順</option>
            <option value="hanDesc">翻数が高い順</option>
            <option value="hanAsc">翻数が低い順</option>
          </select>
        </label>
      </div>

      <p className="nums text-[11px] text-ivory-50/50">
        {entries.length} 件を表示
        {query ? `（「${query}」の検索結果）` : ''}
      </p>

      {entries.length === 0 ? (
        <div className="card p-8 text-center">
          <p className="text-[13px] text-ink-700">
            条件に合う役が見つかりませんでした。
          </p>
          <button
            type="button"
            onClick={() => {
              setQuery('');
              setFilter('all');
            }}
            className="mt-2 text-[11px] font-semibold text-vermilion hover:underline"
          >
            検索条件をリセット
          </button>
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {entries.map((entry) => {
            const accuracy = accuracyOf(stats, entry.id);
            const weak = accuracy.total >= 2 && accuracy.percent < 60;
            return (
              <YakuCard
                key={entry.id}
                entry={entry}
                weak={weak}
                accuracy={accuracy.percent}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
