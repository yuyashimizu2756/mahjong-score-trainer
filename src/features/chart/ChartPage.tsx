import { useEffect, useState } from 'react';
import type { ChartFocus } from '../../lib/chart-focus';
import {
  FU_ROWS,
  HAN_COLUMNS,
  scoreCell,
  type TableCell,
} from '../../lib/score-table';
import { formatNumber } from '../../lib/format';
import { Icon } from '../../components/Icon';
import { Badge, Button, PageHeader } from '../../components/ui';

type ChartTab = 'childRon' | 'childTsumo' | 'dealerRon' | 'dealerTsumo';

interface TabDefinition {
  id: ChartTab;
  label: string;
  dealer: boolean;
  tsumo: boolean;
  note: string;
}

const TABS: TabDefinition[] = [
  {
    id: 'childRon',
    label: '子ロン',
    dealer: false,
    tsumo: false,
    note: '放銃者 1 人から受け取る',
  },
  {
    id: 'childTsumo',
    label: '子ツモ',
    dealer: false,
    tsumo: true,
    note: '子 2 人と親 1 人から受け取る',
  },
  {
    id: 'dealerRon',
    label: '親ロン',
    dealer: true,
    tsumo: false,
    note: '放銃者 1 人から受け取る',
  },
  {
    id: 'dealerTsumo',
    label: '親ツモ',
    dealer: true,
    tsumo: true,
    note: '3 人全員から受け取る',
  },
];

function cellText(cell: TableCell, tsumo: boolean): string {
  if (!cell.valid) return '—';
  if (tsumo) {
    if (!cell.tsumo) return '—';
    if (cell.tsumo.dealer === cell.tsumo.nonDealer) {
      return `${formatNumber(cell.tsumo.dealer)}オール`;
    }
    return `${formatNumber(cell.tsumo.nonDealer)} / ${formatNumber(
      cell.tsumo.dealer,
    )}`;
  }
  return formatNumber(cell.ron ?? 0);
}

function cellAria(
  fu: number,
  han: number | 'yakuman',
  cell: TableCell,
  tsumo: boolean,
): string {
  const head = han === 'yakuman' ? `${fu} 符 役満` : `${fu} 符 ${han} 翻`;
  return `${head} ${cellText(cell, tsumo)}`;
}

function cellClass(cell: TableCell, highlight: boolean): string {
  return [
    'relative border border-ivory-200/80 px-1 py-1 text-center align-middle text-[10px] leading-4',
    !cell.valid
      ? 'bg-ivory-100/40 text-ink-500/35'
      : cell.limit === 'yakuman'
        ? 'cell-yakuman font-semibold'
        : cell.limit !== 'none'
          ? 'cell-limit font-semibold'
          : 'text-ink-900',
    highlight ? 'outline outline-2 -outline-offset-2 outline-vermilion' : '',
  ].join(' ');
}

export interface ChartPageProps {
  focus: ChartFocus | null;
}

export function ChartPage({ focus }: ChartPageProps) {
  const [tab, setTab] = useState<ChartTab>(() => {
    if (!focus) return 'childRon';
    if (focus.dealer) return focus.tsumo ? 'dealerTsumo' : 'dealerRon';
    return focus.tsumo ? 'childTsumo' : 'childRon';
  });

  useEffect(() => {
    if (!focus) return;
    setTab(
      focus.dealer
        ? focus.tsumo
          ? 'dealerTsumo'
          : 'dealerRon'
        : focus.tsumo
          ? 'childTsumo'
          : 'childRon',
    );
  }, [focus]);

  const active = TABS.find((item) => item.id === tab) ?? TABS[0];

  const print = () => {
    if (typeof window === 'undefined') return;
    try {
      window.print();
    } catch {
      // 印刷不可の環境では何もしない。
    }
  };

  const isHighlighted = (fu: number, han: number | 'yakuman'): boolean => {
    if (!focus) return false;
    if (focus.dealer !== active.dealer || focus.tsumo !== active.tsumo) {
      return false;
    }
    if (focus.yakumanCount && focus.yakumanCount > 0) {
      return han === 'yakuman' && fu === focus.fu;
    }
    return han === focus.han && fu === focus.fu;
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Chart"
        title="点数表"
        description="符 × 翻の支払いを 4 つの向きで確認できます。満貫以上は金、役満は朱で示します。本場・供託は含みません。"
        actions={
          <Button
            tone="outline"
            size="sm"
            onClick={print}
            icon={<Icon name="printer" className="h-4 w-4" />}
            className="no-print"
          >
            印刷
          </Button>
        }
      />

      <div className="no-print flex flex-wrap items-center gap-2">
        <div
          role="tablist"
          aria-label="点数表の向き"
          className="card-dark flex flex-wrap gap-1 p-1"
        >
          {TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              aria-selected={tab === item.id}
              onClick={() => setTab(item.id)}
              className={[
                'rounded-[8px] px-3.5 py-2 text-xs font-semibold transition-colors',
                tab === item.id
                  ? 'bg-gold text-ink-900'
                  : 'text-ivory-50/65 hover:bg-ivory-50/10 hover:text-ivory-50',
              ].join(' ')}
            >
              {item.label}
            </button>
          ))}
        </div>
        <p className="text-[11px] text-ivory-50/55">{active.note}</p>
        {focus ? (
          <Badge tone="vermilion" className="no-print">
            練習のセルをハイライト中
          </Badge>
        ) : null}
      </div>

      <section className="card print-sheet overflow-hidden">
        <div className="border-b border-ivory-200 px-4 py-3">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[17px] text-ink-900">
              点数表 — {active.label}
            </h2>
            <p className="text-[10px] text-ink-500">
              単位: 点 / 100 点未満切り上げ / 本場・供託を含まない
            </p>
          </div>
          <p
            id="chart-scroll-hint"
            className="mt-1 text-[10px] leading-5 text-ink-500"
          >
            ← 横にスクロールできます。1 列目の符は固定です。 →
          </p>
        </div>

        <div
          role="region"
          tabIndex={0}
          aria-label="点数表。横にスクロールできます。1 列目の符は固定です。"
          aria-describedby="chart-scroll-hint"
          className="overflow-x-auto overscroll-x-contain scroll-thin"
        >
          <table className="w-full min-w-[820px] border-collapse text-[10px]">
            <caption className="sr-only">
              {active.label}の符と翻による点数表
            </caption>
            <thead>
              <tr>
                <th
                  scope="col"
                  className="sticky left-0 z-10 border border-ivory-200 bg-ivory-100 px-2 py-2 text-left text-[10px] font-semibold text-ink-700"
                >
                  符 \ 翻
                </th>
                {HAN_COLUMNS.map((han) => (
                  <th
                    key={han}
                    scope="col"
                    className="border border-ivory-200 bg-ivory-100 px-1 py-2 text-center text-[10px] font-semibold text-ink-700"
                  >
                    {han} 翻
                  </th>
                ))}
                <th
                  scope="col"
                  className="border border-vermilion/40 bg-vermilion/10 px-1 py-2 text-center text-[10px] font-semibold text-vermilion"
                >
                  役満
                </th>
              </tr>
            </thead>
            <tbody>
              {FU_ROWS.map((fu) => (
                <tr key={fu}>
                  <th
                    scope="row"
                    className="sticky left-0 z-10 border border-ivory-200 bg-ivory-100 px-2 py-1 text-left text-[10px] font-semibold text-ink-700"
                  >
                    {fu} 符
                    {fu === 25 ? (
                      <span className="ml-1 text-[8px] font-normal text-ink-500">
                        七対子
                      </span>
                    ) : null}
                    {fu === 20 ? (
                      <span className="ml-1 text-[8px] font-normal text-ink-500">
                        平和ツモ
                      </span>
                    ) : null}
                  </th>
                  {HAN_COLUMNS.map((han) => {
                    const cell = scoreCell(fu, han, {
                      dealer: active.dealer,
                      tsumo: active.tsumo,
                    });
                    const highlight = isHighlighted(fu, han);
                    return (
                      <td
                        key={han}
                        aria-label={cellAria(fu, han, cell, active.tsumo)}
                        aria-current={highlight ? 'true' : undefined}
                        className={cellClass(cell, highlight)}
                      >
                        {cellText(cell, active.tsumo)}
                        {highlight ? (
                          <span
                            aria-hidden="true"
                            className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-vermilion"
                          />
                        ) : null}
                      </td>
                    );
                  })}
                  {(() => {
                    const cell = scoreCell(fu, 0, {
                      dealer: active.dealer,
                      tsumo: active.tsumo,
                      yakumanCount: 1,
                    });
                    const highlight = isHighlighted(fu, 'yakuman');
                    return (
                      <td
                        aria-label={cellAria(
                          fu,
                          'yakuman',
                          cell,
                          active.tsumo,
                        )}
                        aria-current={highlight ? 'true' : undefined}
                        className={cellClass(cell, highlight)}
                      >
                        {cellText(cell, active.tsumo)}
                        {highlight ? (
                          <span
                            aria-hidden="true"
                            className="absolute right-0.5 top-0.5 h-1.5 w-1.5 rounded-full bg-vermilion"
                          />
                        ) : null}
                      </td>
                    );
                  })()}
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="space-y-1.5 border-t border-ivory-200 px-4 py-3 text-[10px] leading-5 text-ink-500">
          <p>
            <span className="font-semibold text-ink-700">「—」のセル</span>:
            20 符は平和ツモのみ、25 符は七対子（2 翻以上）のみのため、成立しない組み合わせです。
          </p>
          <p>
            <span className="cell-limit inline-block rounded px-1 font-semibold">
              満貫以上
            </span>
            は金、
            <span className="cell-yakuman inline-block rounded px-1 font-semibold">
              役満
            </span>
            は朱で表示します。4 翻以下でも基本点 2,000 以上なら満貫です。
          </p>
          <p>
            ツモの「子 / 親」はそれぞれの支払い額です。親ツモは全員から同額を受け取ります。
          </p>
        </div>
      </section>
    </div>
  );
}
