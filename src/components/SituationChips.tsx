import type { WinContext } from '../engine/types';
import { Tile } from './Tile';
import { Badge } from './ui';
import { windLabel } from '../lib/format';

export function SituationChips({ ctx }: { ctx: WinContext }) {
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
  if (ctx.doubleRiichi)
    chips.push({ label: '立直', value: 'ダブル立直', tone: 'vermilion' });
  else if (ctx.riichi)
    chips.push({ label: '立直', value: '立直', tone: 'vermilion' });
  if (ctx.ippatsu) chips.push({ label: '一発', value: 'あり', tone: 'vermilion' });
  if (ctx.haitei) chips.push({ label: '海底', value: '海底摸月' });
  if (ctx.houtei) chips.push({ label: '河底', value: '河底撈魚' });
  if (ctx.rinshan) chips.push({ label: '嶺上', value: '嶺上開花' });
  if (ctx.chankan) chips.push({ label: '搶槓', value: '搶槓' });
  if (ctx.honba > 0) chips.push({ label: '本場', value: `${ctx.honba} 本場` });
  if (ctx.riichiSticks > 0)
    chips.push({ label: '供託', value: `${ctx.riichiSticks} 本` });

  return (
    <div className="space-y-3">
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

      {(ctx.doraIndicators.length > 0 ||
        (ctx.uraIndicators && ctx.uraIndicators.length > 0)) && (
        <div className="flex flex-wrap items-end gap-x-5 gap-y-2">
          {ctx.doraIndicators.length > 0 ? (
            <div>
              <Badge tone="neutral">ドラ表示牌</Badge>
              <div className="mt-1.5 flex gap-1">
                {ctx.doraIndicators.map((tile, index) => (
                  <Tile key={`dora-${index}`} tile={tile} size="sm" />
                ))}
              </div>
            </div>
          ) : null}
          {ctx.uraIndicators && ctx.uraIndicators.length > 0 ? (
            <div>
              <Badge tone="neutral">裏ドラ表示牌</Badge>
              <div className="mt-1.5 flex gap-1">
                {ctx.uraIndicators.map((tile, index) => (
                  <Tile key={`ura-${index}`} tile={tile} size="sm" />
                ))}
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
