import { computeScore } from '../../src/engine/score';
import type { ScoreOutcome, ScoreResult } from '../../src/engine/types';
import { input, meld, tiles } from '../helpers';

function ok(outcome: ScoreOutcome): ScoreResult {
  if (!outcome.ok) throw new Error(`expected ok, got: ${outcome.error}`);
  return outcome;
}

const fiveHan = () =>
  input('234m345m456p678s55s', '6s', {
    ctx: { riichi: true, ippatsu: true, tsumo: true },
  });

describe('点数計算・上限', () => {
  it('基本点 = 符 × 2^(翻+2)', () => {
    const result = ok(computeScore(input('234m345m456p678s22s', '2s')));
    expect(result.basePoints).toBe(40 * 2 ** 3);
  });

  it('満貫（5 翻）', () => {
    const result = ok(computeScore(fiveHan()));
    expect(result.han).toBe(5);
    expect(result.limit).toBe('mangan');
    expect(result.basePoints).toBe(2000);
    expect(result.payments.tsumo).toEqual({ dealer: 4000, nonDealer: 2000 });
    expect(result.payments.total).toBe(8000);
  });

  it('跳満（6 翻）', () => {
    const result = ok(
      computeScore({
        ...fiveHan(),
        ctx: { ...fiveHan().ctx, doraIndicators: tiles('1m') },
      }),
    );
    expect(result.han).toBe(6);
    expect(result.limit).toBe('haneman');
    expect(result.payments.tsumo).toEqual({ dealer: 6000, nonDealer: 3000 });
    expect(result.payments.total).toBe(12000);
  });

  it('倍満（8 翻）', () => {
    const indicator = tiles('1m')[0];
    const result = ok(
      computeScore({
        ...fiveHan(),
        ctx: {
          ...fiveHan().ctx,
          doraIndicators: [indicator, indicator, indicator],
        },
      }),
    );
    expect(result.han).toBe(8);
    expect(result.limit).toBe('baiman');
    expect(result.payments.tsumo).toEqual({ dealer: 8000, nonDealer: 4000 });
  });

  it('三倍満（11 翻）', () => {
    const indicator = tiles('1m')[0];
    const result = ok(
      computeScore({
        ...fiveHan(),
        ctx: {
          ...fiveHan().ctx,
          doraIndicators: Array.from({ length: 6 }, () => indicator),
        },
      }),
    );
    expect(result.han).toBe(11);
    expect(result.limit).toBe('sanbaiman');
    expect(result.payments.tsumo).toEqual({ dealer: 12000, nonDealer: 6000 });
  });

  it('数え役満（13 翻以上）', () => {
    const indicator = tiles('1m')[0];
    const result = ok(
      computeScore({
        ...fiveHan(),
        ctx: {
          ...fiveHan().ctx,
          doraIndicators: Array.from({ length: 8 }, () => indicator),
        },
      }),
    );
    expect(result.han).toBe(13);
    expect(result.limit).toBe('yakuman');
    expect(result.yakumanCount).toBe(0);
    expect(result.basePoints).toBe(8000);
    expect(result.payments.tsumo).toEqual({ dealer: 16000, nonDealer: 8000 });
  });

  it('役満は 8000 × 役満数', () => {
    const result = ok(computeScore(input('222s333s444s666s88s', '6s')));
    expect(result.limit).toBe('yakuman');
    expect(result.basePoints).toBe(8000);
    expect(result.payments.ron).toBe(32000);
  });

  it('ダブル役満は 16000 × ...', () => {
    const result = ok(
      computeScore(
        input('111z666z777z22z', '2z', { melds: [meld('pon', '555z')] }),
      ),
    );
    expect(result.basePoints).toBe(16000);
    expect(result.payments.ron).toBe(64000);
  });

  it('4 翻 40 符は満貫', () => {
    const result = ok(
      computeScore(
        input('234m234p234s567m55s', '3s', { ctx: { riichi: true } }),
      ),
    );
    expect(result.han).toBe(4);
    expect(result.fu).toBe(40);
    expect(result.limit).toBe('mangan');
    expect(result.payments.ron).toBe(8000);
  });

  it('3 翻 60 符は 7700', () => {
    const melds = [
      meld('kan', '5555z'),
      meld('kan', '1111m'),
      meld('pon', '333p'),
      meld('pon', '999s'),
    ];
    const ron = ok(
      computeScore(
        input('22z', '2z', {
          ctx: { seatWind: 3 },
          melds,
        }),
      ),
    );
    expect(ron.fu).toBe(60);
    expect(ron.limit).toBe('none');
    expect(ron.payments.ron).toBe(7700);

    const tsumo = ok(
      computeScore(
        input('22z', '2z', {
          ctx: { seatWind: 3, tsumo: true },
          melds: [
            meld('kan', '1111m'),
            meld('kan', '5555z'),
            meld('pon', '333p'),
            meld('pon', '444s'),
          ],
        }),
      ),
    );
    expect(tsumo.fu).toBe(60);
    expect(tsumo.payments.tsumo).toEqual({ dealer: 3900, nonDealer: 2000 });
    expect(tsumo.payments.total).toBe(7900);
  });

  it('3 翻 70 符は基本点 2000 以上で満貫', () => {
    const result = ok(
      computeScore(
        input('22z', '2z', {
          melds: [
            meld('kan', '5555z'),
            meld('kan', '1111m'),
            meld('pon', '333p'),
            meld('pon', '999s'),
          ],
        }),
      ),
    );
    expect(result.fu).toBe(70);
    expect(result.limit).toBe('mangan');
    expect(result.payments.ron).toBe(8000);
  });
});

describe('支払い', () => {
  it('子ロン・子ツモ・親ロン・親ツモ', () => {
    const child = ok(computeScore(input('234m345m456p678s22s', '2s')));
    expect(child.payments.ron).toBe(1300);

    const dealerRon = ok(
      computeScore(
        input('234m345m456p678s22s', '2s', {
          ctx: { seatWind: 1, roundWind: 1 },
        }),
      ),
    );
    expect(dealerRon.payments.ron).toBe(2000);

    const childTsumo = ok(
      computeScore(
        input('234m345m456p678s22s', '2s', { ctx: { tsumo: true } }),
      ),
    );
    expect(childTsumo.payments.tsumo).toEqual({ dealer: 1000, nonDealer: 500 });
    expect(childTsumo.payments.total).toBe(2000);

    const dealerTsumo = ok(
      computeScore(
        input('234m345m456p678s22s', '2s', {
          ctx: { tsumo: true, seatWind: 1, roundWind: 1 },
        }),
      ),
    );
    expect(dealerTsumo.payments.tsumo).toEqual({ dealer: 1000, nonDealer: 1000 });
    expect(dealerTsumo.payments.total).toBe(3000);
  });

  it('100 点未満は切り上げる', () => {
    const result = ok(computeScore(input('123m456p789p234s55s', '2s')));
    // 1 翻 30 符: 240 × 4 = 960 → 1000
    expect(result.basePoints).toBe(240);
    expect(result.payments.ron).toBe(1000);
  });

  it('本場はロン +300 / ツモ +100、供託は 1000 × 本数', () => {
    const ron = ok(
      computeScore(
        input('123m456p789p234s55s', '2s', {
          ctx: { riichi: true, honba: 2, riichiSticks: 1 },
        }),
      ),
    );
    expect(ron.payments.ron).toBe(2000);
    expect(ron.payments.honba).toEqual({ ron: 600, tsumoEach: 200 });
    expect(ron.payments.riichiSticks).toBe(1000);
    expect(ron.payments.total).toBe(2000);

    const tsumo = ok(
      computeScore(
        input('123m456p789p234s55s', '2s', {
          ctx: { tsumo: true, honba: 2, riichiSticks: 1 },
        }),
      ),
    );
    expect(tsumo.payments.honba).toEqual({ ron: 600, tsumoEach: 200 });
    expect(tsumo.payments.riichiSticks).toBe(1000);
    expect(tsumo.payments.total).toBe(1500);
  });

  it('ツモの total は 3 人分の合計（本場・供託を除く）', () => {
    const result = ok(
      computeScore(input('234m345m456p678s22s', '2s', { ctx: { tsumo: true } })),
    );
    expect(result.payments.total).toBe(1000 + 500 * 2);
  });
});
