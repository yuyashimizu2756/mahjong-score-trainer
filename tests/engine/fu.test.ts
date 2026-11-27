import { computeScore } from '../../src/engine/score';
import type { ScoreOutcome, ScoreResult } from '../../src/engine/types';
import { input, meld } from '../helpers';

function ok(outcome: ScoreOutcome): ScoreResult {
  if (!outcome.ok) throw new Error(`expected ok, got: ${outcome.error}`);
  return outcome;
}

function itemFu(result: ScoreResult, id: string): number | undefined {
  return result.fuItems.find((item) => item.id === id)?.fu;
}

function sumItems(result: ScoreResult): number {
  return result.fuItems.reduce((sum, item) => sum + item.fu, 0);
}

describe('符計算', () => {
  it('副底 20 + 門前ロン 10 + 単騎 2 → 40 符', () => {
    const result = ok(computeScore(input('234m345m456p678s22s', '2s')));
    expect(itemFu(result, 'base')).toBe(20);
    expect(itemFu(result, 'menzenRon')).toBe(10);
    expect(itemFu(result, 'wait_tanki')).toBe(2);
    expect(itemFu(result, 'roundUp')).toBe(8);
    expect(result.fu).toBe(40);
  });

  it('ツモ +2', () => {
    const result = ok(
      computeScore(input('234m345m456p678s22s', '2s', { ctx: { tsumo: true } })),
    );
    expect(itemFu(result, 'tsumo')).toBe(2);
    expect(itemFu(result, 'menzenRon')).toBeUndefined();
    expect(result.fu).toBe(30);
  });

  it('平和ツモは 20 符（ツモ +2 を足さない）', () => {
    const result = ok(
      computeScore(input('123m456p789p234s55s', '2s', { ctx: { tsumo: true } })),
    );
    expect(result.fu).toBe(20);
    expect(itemFu(result, 'tsumo')).toBeUndefined();
    expect(result.yaku.map((y) => y.id)).toEqual(
      expect.arrayContaining(['pinfu', 'menzenTsumo']),
    );
  });

  it('平和ロンは 30 符', () => {
    const result = ok(computeScore(input('123m456p789p234s55s', '2s')));
    expect(result.fu).toBe(30);
    expect(itemFu(result, 'menzenRon')).toBe(10);
  });

  it('喰い平和形のロンは 20 → 30 符', () => {
    const result = ok(
      computeScore(
        input('22m234s678s', '4s', {
          melds: [meld('chi', '234m'), meld('chi', '567p')],
        }),
      ),
    );
    expect(result.fu).toBe(30);
    expect(itemFu(result, 'kuipinfu')).toBe(10);
    expect(itemFu(result, 'menzenRon')).toBeUndefined();
  });

  it('嵌張待ち +2', () => {
    const result = ok(
      computeScore(
        input('234m456p234s55s', '3s', { melds: [meld('pon', '777z')] }),
      ),
    );
    expect(itemFu(result, 'wait_kanchan')).toBe(2);
    expect(result.fu).toBe(30);
  });

  it('辺張待ち +2', () => {
    const result = ok(computeScore(input('123m123p123s456m99p', '3s')));
    expect(itemFu(result, 'wait_penchan')).toBe(2);
    expect(result.fu).toBe(40);
  });

  it('役牌の雀頭 +2', () => {
    const result = ok(computeScore(input('123m789p111s789s11z', '1z')));
    expect(itemFu(result, 'pairYakuhai')).toBe(2);
  });

  it('連風牌の雀頭は +2（+4 にしない）', () => {
    const result = ok(
      computeScore(
        input('123m456p789p234s11z', '3s', {
          ctx: { seatWind: 1, roundWind: 1, riichi: true },
        }),
      ),
    );
    expect(itemFu(result, 'pairYakuhai')).toBe(2);
    expect(result.fu).toBe(40);
  });

  it('中張の明刻 2 / 幺九の明刻 4 / 中張の暗刻 4 / 幺九の暗刻 8', () => {
    const result = ok(computeScore(input('111m333p555s777s99p', '7s')));
    expect(itemFu(result, 'triplet_closed_terminal')).toBe(8);
    expect(itemFu(result, 'triplet_closed_simple')).toBe(4);
    expect(itemFu(result, 'triplet_open_simple')).toBe(2);
    expect(result.fu).toBe(50);
  });

  it('幺九の明刻 4（副露）', () => {
    const result = ok(
      computeScore(
        input('22z', '2z', {
          ctx: { seatWind: 3 },
          melds: [
            meld('kan', '5555z'),
            meld('kan', '1111m'),
            meld('pon', '333p'),
            meld('pon', '999s'),
          ],
        }),
      ),
    );
    expect(itemFu(result, 'triplet_open_terminal')).toBe(4);
    expect(result.fu).toBe(60);
  });

  it('槓子の符: 明槓 8 / 幺九明槓 16 / 暗槓 16 / 幺九暗槓 32', () => {
    const result = ok(
      computeScore(
        input('678s99s', '9s', {
          melds: [
            meld('kan', '1111m', false),
            meld('kan', '2222p', true),
            meld('pon', '555z'),
          ],
        }),
      ),
    );
    expect(itemFu(result, 'kan_closed_terminal')).toBe(32);
    expect(itemFu(result, 'kan_open_simple')).toBe(8);
    expect(result.fu).toBe(70);
  });

  it('暗槓（中張）16 と明刻の符', () => {
    const result = ok(
      computeScore(
        input('678s11z', '1z', {
          ctx: { roundWind: 1 },
          melds: [
            meld('kan', '2222p', false),
            meld('pon', '555z'),
            meld('pon', '999s'),
          ],
        }),
      ),
    );
    expect(itemFu(result, 'kan_closed_simple')).toBe(16);
    expect(result.fu).toBe(50);
  });

  it('七対子は 25 符固定', () => {
    const result = ok(computeScore(input('11m33m55m77m22p44p66s', '6s')));
    expect(result.fu).toBe(25);
    expect(result.fuItems).toEqual([{ id: 'chiitoitsu', label: '七対子', fu: 25 }]);
  });

  it('31 → 40（切り上げ）', () => {
    const result = ok(computeScore(input('234m345m456p678s22s', '2s')));
    expect(result.fu).toBe(40);
    expect(itemFu(result, 'roundUp')).toBe(8);
  });

  it('48 → 50（切り上げ）', () => {
    const result = ok(computeScore(input('111m333p555s777s99p', '7s')));
    expect(result.fu).toBe(50);
    expect(itemFu(result, 'roundUp')).toBe(2);
  });

  it('符の内訳の合計が fu と一致する', () => {
    const inputs = [
      input('234m345m456p678s22s', '2s'),
      input('123m456p789p234s55s', '2s', { ctx: { tsumo: true } }),
      input('111m333p555s777s99p', '7s'),
      input('22z', '2z', {
        ctx: { seatWind: 3 },
        melds: [
          meld('kan', '5555z'),
          meld('kan', '1111m'),
          meld('pon', '333p'),
          meld('pon', '999s'),
        ],
      }),
      input('11m33m55m77m22p44p66s', '6s'),
    ];
    for (const value of inputs) {
      const result = ok(computeScore(value));
      expect(sumItems(result)).toBe(result.fu);
    }
  });
});
