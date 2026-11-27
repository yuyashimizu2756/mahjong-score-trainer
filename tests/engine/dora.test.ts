import { computeScore } from '../../src/engine/score';
import type { ScoreOutcome } from '../../src/engine/types';
import { input, meld, tiles } from '../helpers';

function ok(outcome: ScoreOutcome) {
  if (!outcome.ok) throw new Error(`expected ok, got: ${outcome.error}`);
  return outcome;
}

describe('ドラ', () => {
  it('赤 5 は 1 翻', () => {
    const result = ok(computeScore(input('234m345m456p678s05s', '6s')));
    expect(result.doraHan).toBe(1);
    expect(result.yakuHan).toBe(2);
    expect(result.han).toBe(3);
  });

  it('ドラ表示牌の変換（9 → 1）', () => {
    const result = ok(
      computeScore(
        input('234m345m456p678s55s', '6s', {
          ctx: { doraIndicators: tiles('9p9p9p'), tsumo: true },
        }),
      ),
    );
    // 9p のドラは 1p。手牌に 1p はないのでドラ 0。
    expect(result.doraHan).toBe(0);
  });

  it('槓子の 4 枚もドラとして数える', () => {
    const result = ok(
      computeScore(
        input('22z', '2z', {
          ctx: { seatWind: 3, doraIndicators: tiles('9m') },
          melds: [
            meld('kan', '1111m'),
            meld('kan', '5555z'),
            meld('pon', '333p'),
            meld('pon', '999s'),
          ],
        }),
      ),
    );
    expect(result.doraHan).toBe(4);
  });

  it('裏ドラはリーチ時のみ有効', () => {
    const withRiichi = ok(
      computeScore(
        input('123m456p789p234s55s', '2s', {
          ctx: { riichi: true, uraIndicators: tiles('1s') },
        }),
      ),
    );
    expect(withRiichi.doraHan).toBe(1);

    const withoutRiichi = ok(
      computeScore(
        input('123m456p789p234s55s', '2s', {
          ctx: { uraIndicators: tiles('1s') },
        }),
      ),
    );
    expect(withoutRiichi.doraHan).toBe(0);
  });

  it('表ドラと裏ドラは合算する', () => {
    const result = ok(
      computeScore(
        input('123m456p789p234s55s', '2s', {
          ctx: {
            riichi: true,
            doraIndicators: tiles('1s'),
            uraIndicators: tiles('1s'),
          },
        }),
      ),
    );
    expect(result.doraHan).toBe(2);
    expect(result.han).toBe(4);
  });

  it('ドラのみの手は ok:false', () => {
    const result = computeScore(
      input('123m456p789p234s11z', '3s', {
        ctx: { doraIndicators: tiles('2s') },
      }),
    );
    expect(result.ok).toBe(false);
  });
});
