import type { Problem } from '../engine/types';
import type { RefObject } from 'react';
import { explainResult } from '../lib/explain';
import {
  formatFu,
  formatHan,
  formatLimit,
  formatNumber,
  formatPoints,
  paymentView,
  waitLabel,
} from '../lib/format';
import type { ChartFocus } from '../lib/chart-focus';
import { Hand } from './Hand';
import { Icon } from './Icon';
import { Badge, Button } from './ui';

export interface ResultPanelProps {
  problem: Problem;
  correct: boolean;
  reviewAdded: boolean;
  onNext: () => void;
  onChart: (focus: ChartFocus) => void;
  onAddReview: () => void;
  panelRef?: RefObject<HTMLElement | null>;
  titleRef?: RefObject<HTMLHeadingElement | null>;
}

function Formula({ problem }: { problem: Problem }) {
  const { answer, input } = problem;
  const dealer = input.ctx.seatWind === 1;

  let main: string;
  if (answer.yakumanCount > 0) {
    main = `8000 × ${answer.yakumanCount} = ${formatNumber(
      8000 * answer.yakumanCount,
    )}`;
  } else if (answer.limit === 'none') {
    main = `${answer.fu} × 2^(${answer.han}+2) = ${formatNumber(
      answer.basePoints,
    )}`;
  } else if (answer.limit === 'mangan' && answer.han < 5) {
    main = `${answer.fu} × 2^(${answer.han}+2) = ${formatNumber(
      answer.fu * 2 ** (answer.han + 2),
    )} → 満貫 2,000`;
  } else {
    main = `基本点 ${formatNumber(answer.basePoints)}（${formatLimit(
      answer.limit,
    )}）`;
  }

  return (
    <div className="rounded-xl border border-ivory-200 bg-ivory-100/70 px-3 py-2.5">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
        基本点の式
      </p>
      <p className="nums mt-1 text-[15px] font-semibold text-ink-900">{main}</p>
      <p className="mt-1 text-[11px] leading-5 text-ink-500">
        {dealer ? '親' : '子'}
        {input.ctx.tsumo ? 'ツモ' : 'ロン'}の係数を掛けて 100 点未満を切り上げます。
      </p>
    </div>
  );
}

export function ResultPanel({
  problem,
  correct,
  reviewAdded,
  onNext,
  onChart,
  onAddReview,
  panelRef,
  titleRef,
}: ResultPanelProps) {
  const { answer, input } = problem;
  const { ctx } = input;
  const dealer = ctx.seatWind === 1;
  const view = paymentView({
    ron: answer.payments.ron,
    tsumo: answer.payments.tsumo,
    total: answer.payments.total,
    dealer,
  });
  const honbaTotal = ctx.tsumo ? 100 * ctx.honba * 3 : 300 * ctx.honba;
  const grandTotal =
    answer.payments.total + honbaTotal + answer.payments.riichiSticks;

  return (
    <section
      ref={panelRef}
      data-testid="result-panel"
      aria-labelledby="result-title"
      className="card animate-panel scroll-mt-24 overflow-hidden desk:scroll-mt-6"
    >
      <div
        role="status"
        className={[
          'flex items-center gap-3 px-5 py-3.5',
          correct ? 'bg-jade/10' : 'bg-vermilion/10',
        ].join(' ')}
      >
        <span
          className={[
            'flex h-8 w-8 shrink-0 items-center justify-center rounded-full',
            correct ? 'bg-jade text-ivory-50' : 'bg-vermilion text-ivory-50',
          ].join(' ')}
        >
          <Icon name={correct ? 'check' : 'cross'} className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2
            id="result-title"
            ref={titleRef}
            tabIndex={-1}
            className={[
              'text-sm font-bold',
              correct ? 'text-jade' : 'text-vermilion',
            ].join(' ')}
          >
            {correct ? '正解' : '不正解'}
          </h2>
          <p className="text-[11px] text-ink-500">
            {correct
              ? '役・符・支払いの流れを確認しましょう。'
              : 'どこでずれたかを下の内訳で確認しましょう。'}
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-[10px] text-ink-500">
            {dealer ? '親' : '子'}
            {ctx.tsumo ? 'ツモ' : 'ロン'}
            {answer.limit !== 'none' ? `・${formatLimit(answer.limit)}` : ''}
          </p>
          <p className="nums text-2xl font-bold leading-tight text-ink-900">
            {formatNumber(view.total)}
            <span className="ml-0.5 text-xs font-semibold">点</span>
          </p>
          <p className="text-[10px] text-ink-500">
            {ctx.tsumo ? '3 人合計' : '放銃者の支払い'}
          </p>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="rounded-xl border border-ivory-200 bg-ivory-100/50 p-3">
          <Hand
            concealed={input.concealed}
            melds={input.melds}
            winTile={input.winTile}
            size="sm"
          />
          <p className="mt-2 text-[11px] text-ink-500">
            分解: <span className="nums">{answer.decomposition}</span>
            <span className="mx-1.5">/</span>
            待ち: {waitLabel(answer.wait)}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-ink-900">成立役</h3>
              <Badge tone="neutral">
                {answer.yakumanCount > 0
                  ? answer.yakumanCount >= 2
                    ? `${answer.yakumanCount} 倍役満`
                    : '役満'
                  : `役 ${answer.yakuHan} 翻`}
              </Badge>
            </div>
            <ul className="mt-2 space-y-1">
              {answer.yaku.map((hit, index) => (
                <li
                  key={`${hit.id}-${index}`}
                  className="flex items-baseline justify-between gap-2 border-b border-ivory-200/70 pb-1 text-[12px] last:border-0"
                >
                  <span className="text-ink-900">{hit.name}</span>
                  <span className="nums shrink-0 font-semibold text-ink-700">
                    {hit.yakuman
                      ? hit.yakuman >= 2
                        ? `${hit.yakuman} 倍`
                        : '役満'
                      : `${hit.han} 翻`}
                  </span>
                </li>
              ))}
              {answer.doraHan > 0 ? (
                <li className="flex items-baseline justify-between gap-2 text-[12px]">
                  <span className="text-ink-700">ドラ・赤・裏ドラ</span>
                  <span className="nums shrink-0 font-semibold text-ink-700">
                    {answer.doraHan} 翻
                  </span>
                </li>
              ) : null}
            </ul>
            {answer.yakumanCount === 0 ? (
              <p className="mt-2 text-[11px] text-ink-500">
                合計{' '}
                <span className="nums font-semibold">
                  {formatHan(answer.han)}
                </span>
                {answer.doraHan > 0 ? '（役 + ドラ）' : ''}
              </p>
            ) : null}
          </div>

          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-[13px] font-bold text-ink-900">符の内訳</h3>
              <Badge tone="neutral">
                {answer.yakumanCount > 0 ? '—' : formatFu(answer.fu)}
              </Badge>
            </div>
            <ul className="mt-2 space-y-1">
              {answer.fuItems.map((item, index) => (
                <li
                  key={`${item.id}-${index}`}
                  className="flex items-baseline justify-between gap-2 border-b border-ivory-200/70 pb-1 text-[12px] last:border-0"
                >
                  <span className="text-ink-900">{item.label}</span>
                  <span className="nums shrink-0 font-semibold text-ink-700">
                    +{item.fu}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-[11px] text-ink-500">
              合計{' '}
              <span className="nums font-semibold">{formatFu(answer.fu)}</span>
              {answer.yakumanCount > 0
                ? '（役満のため点数には不使用）'
                : ''}
            </p>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-[1.2fr_1fr]">
          <Formula problem={problem} />
          <div className="rounded-xl border border-ivory-200 bg-ivory-100/70 px-3 py-2.5">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-ink-500">
              支払い
            </p>
            <div className="nums mt-1 space-y-0.5 text-[13px] font-semibold text-ink-900">
              {view.kind === 'tsumo' ? (
                ctx.seatWind === 1 ? (
                  <p>{formatPoints(view.total / 3)} オール</p>
                ) : (
                  <>
                    <p>
                      子 {formatPoints(answer.payments.tsumo?.nonDealer ?? 0)}
                    </p>
                    <p>親 {formatPoints(answer.payments.tsumo?.dealer ?? 0)}</p>
                  </>
                )
              ) : (
                <p>{formatPoints(answer.payments.ron ?? 0)}</p>
              )}
            </div>
            {ctx.honba > 0 || ctx.riichiSticks > 0 ? (
              <div className="mt-1.5 space-y-0.5 border-t border-ivory-200 pt-1.5 text-[11px] text-ink-700">
                {ctx.honba > 0 ? (
                  <p>
                    本場 {ctx.honba}:
                    <span className="nums font-semibold">
                      {' '}
                      +{formatNumber(honbaTotal)} 点
                    </span>
                  </p>
                ) : null}
                {ctx.riichiSticks > 0 ? (
                  <p>
                    供託 {ctx.riichiSticks} 本:
                    <span className="nums font-semibold">
                      {' '}
                      +{formatNumber(answer.payments.riichiSticks)} 点
                    </span>
                  </p>
                ) : null}
                <p className="font-semibold text-ink-900">
                  受け取り合計{' '}
                  <span className="nums">{formatNumber(grandTotal)} 点</span>
                </p>
              </div>
            ) : null}
          </div>
        </div>

        <div className="rounded-xl border border-gold/30 bg-gold/10 px-3 py-2.5">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-gold">
            なぜその点数か
          </p>
          <p className="mt-1 text-[12px] leading-6 text-ink-700">
            {explainResult(problem)}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-ivory-200 pt-4">
          <Button
            tone="gold"
            size="md"
            onClick={() =>
              onChart({
                fu: answer.fu,
                han: answer.han,
                dealer,
                tsumo: ctx.tsumo,
                yakumanCount: answer.yakumanCount,
              })
            }
            icon={<Icon name="chart" className="h-4 w-4" />}
          >
            点数表で見る
          </Button>
          <Button
            tone="outline"
            size="md"
            onClick={onAddReview}
            disabled={reviewAdded}
            icon={
              <Icon name={reviewAdded ? 'check' : 'book'} className="h-4 w-4" />
            }
          >
            {reviewAdded ? '復習に追加済み' : '復習に追加'}
          </Button>
          <Button
            tone="primary"
            size="md"
            className="ml-auto"
            onClick={onNext}
            icon={<Icon name="arrow" className="h-4 w-4" />}
          >
            次へ{' '}
            <span className="text-[10px] font-normal opacity-75">Enter</span>
          </Button>
        </div>
      </div>
    </section>
  );
}
