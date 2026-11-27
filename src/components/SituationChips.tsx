import type { Meld, Tile as TileType, WinContext } from '../engine/types';
import { doraFromIndicator, sameTile } from '../engine/tiles';
import { tileJaLabel } from '../lib/tile-label';
import { Tile } from './Tile';
import { windLabel } from '../lib/format';

function countKind(tiles: readonly TileType[], target: TileType): number {
  return tiles.filter((tile) => sameTile(tile, target)).length;
}

interface DoraRowProps {
  label: string;
  indicators: readonly TileType[];
  handTiles: readonly TileType[];
  /** 裏ドラなど、文脈を読み上げ名に含めるための接頭辞。 */
  ariaPrefix: string;
}

function DoraRow({ label, indicators, handTiles, ariaPrefix }: DoraRowProps) {
  return (
    <>
      {indicators.map((indicator, index) => {
        const dora = doraFromIndicator(indicator);
        const count = countKind(handTiles, dora);
        return (
          <div
            key={`${ariaPrefix}-${index}`}
            aria-label={`${ariaPrefix} ${tileJaLabel(indicator)} → ドラ ${tileJaLabel(dora)}、手牌に ${count} 枚`}
            className="flex flex-wrap items-center gap-1.5 text-[11px]"
          >
            <span className="text-[9px] uppercase tracking-wide opacity-65">
              {label}
            </span>
            <Tile tile={indicator} size="sm" />
            <span aria-hidden="true" className="text-ink-500">
              →
            </span>
            <Tile tile={dora} size="sm" />
            <span className="whitespace-nowrap font-semibold">
              {tileJaLabel(dora)} ×{count}
            </span>
          </div>
        );
      })}
    </>
  );
}

export function SituationChips({
  ctx,
  concealed = [],
  melds = [],
}: {
  ctx: WinContext;
  /** 手牌（和了牌を含む）。ドラ・赤ドラの枚数に使う。 */
  concealed?: readonly TileType[];
  melds?: readonly Meld[];
}) {
  const chips: Array<{
    label: string;
    value: string;
    tone?: 'gold' | 'vermilion' | 'jade';
  }> = [];
  chips.push({ label: '自風', value: windLabel(ctx.seatWind) });
  chips.push({ label: '場風', value: windLabel(ctx.roundWind) });
  chips.push({
    label: '和了',
    value: ctx.tsumo ? 'ツモ' : 'ロン',
    tone: ctx.tsumo ? 'jade' : 'gold',
  });
  chips.push({
    label: 'リーチ',
    value: ctx.doubleRiichi
      ? 'ダブル立直'
      : ctx.riichi
        ? '立直'
        : 'なし',
    tone: ctx.doubleRiichi || ctx.riichi ? 'vermilion' : undefined,
  });
  if (ctx.doubleRiichi || ctx.riichi) {
    chips.push({
      label: '一発',
      value: ctx.ippatsu ? 'あり' : 'なし',
      tone: ctx.ippatsu ? 'vermilion' : undefined,
    });
  }

  const handTiles = [
    ...concealed,
    ...melds.flatMap((meld) => meld.tiles),
  ];
  const redCount = handTiles.filter((tile) => tile.red).length;
  if (redCount > 0) {
    chips.push({ label: '赤ドラ', value: String(redCount), tone: 'vermilion' });
  }

  if (ctx.haitei) chips.push({ label: '海底', value: '海底摸月' });
  if (ctx.houtei) chips.push({ label: '河底', value: '河底撈魚' });
  if (ctx.rinshan) chips.push({ label: '嶺上', value: '嶺上開花' });
  if (ctx.chankan) chips.push({ label: '搶槓', value: '搶槓' });
  if (ctx.honba > 0) chips.push({ label: '本場', value: `${ctx.honba} 本場` });
  if (ctx.riichiSticks > 0)
    chips.push({ label: '供託', value: `${ctx.riichiSticks} 本` });

  const riichi = ctx.doubleRiichi || ctx.riichi;
  const uraIndicators = riichi ? (ctx.uraIndicators ?? []) : [];

  return (
    <div role="group" aria-label="場況" className="space-y-3">
      <div className="flex flex-wrap gap-1.5">
        {chips.map((chip) => (
          <span
            key={`${chip.label}-${chip.value}`}
            className={[
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px]',
              chip.tone === 'vermilion'
                ? 'border-vermilion/40 bg-vermilion/10 text-vermilion-soft'
                : chip.tone === 'jade'
                  ? 'border-jade/40 bg-jade/10 text-jade'
                  : chip.tone === 'gold'
                    ? 'border-gold/40 bg-gold/10 text-gold'
                    : 'border-ivory-200 bg-ivory-50 text-ink-700',
            ].join(' ')}
          >
            <span className="text-[9px] uppercase tracking-wide opacity-65">
              {chip.label}
            </span>
            <span className="font-semibold">{chip.value}</span>
          </span>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        {ctx.doraIndicators.length > 0 ? (
          <DoraRow
            label="ドラ"
            indicators={ctx.doraIndicators}
            handTiles={handTiles}
            ariaPrefix="ドラ表示牌"
          />
        ) : (
          <p className="flex items-center gap-1.5 text-[11px]">
            <span className="text-[9px] uppercase tracking-wide opacity-65">
              ドラ
            </span>
            <span className="font-semibold text-ink-700">なし</span>
          </p>
        )}
        {uraIndicators.length > 0 ? (
          <DoraRow
            label="裏ドラ"
            indicators={uraIndicators}
            handTiles={handTiles}
            ariaPrefix="裏ドラ表示牌"
          />
        ) : null}
      </div>
    </div>
  );
}
