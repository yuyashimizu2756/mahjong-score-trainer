import { computeScore } from '../../src/engine/score';
import type { ScoreOutcome } from '../../src/engine/types';
import { input, meld, tiles } from '../helpers';

function ok(outcome: ScoreOutcome) {
  if (!outcome.ok) throw new Error(`expected ok, got: ${outcome.error}`);
  return outcome;
}

function yakuIds(outcome: ScoreOutcome): string[] {
  return ok(outcome).yaku.map((hit) => hit.id);
}

/** docs/TEST-VECTORS.md の A〜Z（修正版）。 */
describe('TEST-VECTORS A-Z', () => {
  it('A: 平和ツモ', () => {
    const result = ok(
      computeScore(
        input('123m234p456p789s55s', '2p', { ctx: { tsumo: true } }),
      ),
    );
    expect(result.yakuHan).toBe(2);
    expect(yakuIds(result)).toEqual(
      expect.arrayContaining(['pinfu', 'menzenTsumo']),
    );
    expect(result.fu).toBe(20);
    expect(result.wait).toBe('ryanmen');
    expect(result.payments.tsumo).toEqual({ dealer: 700, nonDealer: 400 });
    expect(result.payments.total).toBe(1500);
  });

  it('B: リーチ平和ロン', () => {
    const result = ok(
      computeScore(
        input('123m234p456p789s55s', '2p', { ctx: { riichi: true } }),
      ),
    );
    expect(result.yakuHan).toBe(2);
    expect(yakuIds(result)).toEqual(expect.arrayContaining(['riichi', 'pinfu']));
    expect(result.fu).toBe(30);
    expect(result.payments.ron).toBe(2000);
  });

  it('C: 断幺九・単騎ロン', () => {
    const result = ok(computeScore(input('234m345m456p678s22s', '2s')));
    expect(yakuIds(result)).toEqual(['tanyao']);
    expect(result.fu).toBe(40);
    expect(result.payments.ron).toBe(1300);
    expect(result.wait).toBe('tanki');
  });

  it('D: 役牌 中・副露', () => {
    const result = ok(
      computeScore(
        input('234m456p789s55s', '5s', { melds: [meld('pon', '777z')] }),
      ),
    );
    expect(yakuIds(result)).toEqual(['yakuhaiChun']);
    expect(result.fu).toBe(30);
    expect(result.payments.ron).toBe(1000);
  });

  it('E: 七対子', () => {
    const result = ok(computeScore(input('11m33m55m77m22p44p66s', '6s')));
    expect(yakuIds(result)).toEqual(['chiitoitsu']);
    expect(result.fu).toBe(25);
    expect(result.payments.ron).toBe(1600);
  });

  it('F: 対々和 + 三暗刻（ロンで完成した刻子は明刻）', () => {
    const result = ok(computeScore(input('111m333p555s777s99p', '7s')));
    expect(yakuIds(result)).toEqual(
      expect.arrayContaining(['toitoi', 'sanankou']),
    );
    expect(result.fu).toBe(50);
    expect(result.limit).toBe('mangan');
    expect(result.payments.ron).toBe(8000);
  });

  it('G: 国士無双', () => {
    const result = ok(computeScore(input('19m19p19s1234567z1m', '1m')));
    expect(result.yakumanCount).toBe(1);
    expect(yakuIds(result)).toEqual(['kokushi']);
    expect(result.payments.ron).toBe(32000);
  });

  it('H: 喰い平和形ロン（20 符 → 30 符）', () => {
    const result = ok(
      computeScore(
        input('22m234s678s', '4s', {
          melds: [meld('chi', '234m'), meld('chi', '567p')],
        }),
      ),
    );
    expect(yakuIds(result)).toEqual(['tanyao']);
    expect(result.fu).toBe(30);
    expect(result.wait).toBe('ryanmen');
    expect(result.payments.ron).toBe(1000);
  });

  it('I: リーチ + 平和 + 一気通貫', () => {
    const result = ok(
      computeScore(
        input('123m456m789m234p55s', '2p', { ctx: { riichi: true } }),
      ),
    );
    expect(result.yakuHan).toBe(4);
    expect(yakuIds(result)).toEqual(
      expect.arrayContaining(['riichi', 'pinfu', 'ittsu']),
    );
    expect(result.fu).toBe(30);
    expect(result.payments.ron).toBe(7700);
  });

  it('J: 混一色 + 役牌 中', () => {
    const result = ok(computeScore(input('111m234m567m99m777z', '7z')));
    expect(result.yakuHan).toBe(4);
    expect(result.fu).toBe(50);
    expect(result.limit).toBe('mangan');
    expect(result.payments.ron).toBe(8000);
  });

  it('K: 緑一色', () => {
    const result = ok(computeScore(input('222s333s444s666s88s', '6s')));
    expect(result.yakumanCount).toBe(1);
    expect(yakuIds(result)).toEqual(['ryuuiisou']);
    expect(result.payments.ron).toBe(32000);
  });

  it('L: 清一色（九蓮ではない）', () => {
    const result = ok(computeScore(input('111m234m567m888m99m', '8m')));
    expect(yakuIds(result)).toEqual(['chinitsu']);
    expect(result.yakuHan).toBe(6);
    expect(result.fu).toBe(40);
    expect(result.payments.ron).toBe(12000);
  });

  it('M: 三色同順・辺張', () => {
    const result = ok(computeScore(input('123m123p123s456m99p', '3s')));
    expect(yakuIds(result)).toEqual(['sanshokuDoujun']);
    expect(result.fu).toBe(40);
    expect(result.wait).toBe('penchan');
    expect(result.payments.ron).toBe(2600);
  });

  it('N: 混全帯幺九', () => {
    const result = ok(computeScore(input('123m789p111s789s11z', '1z')));
    expect(yakuIds(result)).toEqual(['chanta']);
    expect(result.fu).toBe(50);
    expect(result.payments.ron).toBe(3200);
  });

  it('O: 純全帯幺九', () => {
    const result = ok(computeScore(input('123m789m123p789p99s', '9s')));
    expect(yakuIds(result)).toEqual(['junchan']);
    expect(result.fu).toBe(40);
    expect(result.payments.ron).toBe(5200);
  });

  it('P: 小三元 + 白 + 發', () => {
    const result = ok(computeScore(input('234m567p555z666z77z', '7z')));
    expect(result.yakuHan).toBe(4);
    expect(result.fu).toBe(50);
    expect(result.payments.ron).toBe(8000);
  });

  it('Q: 槓子 4 種の符（雀頭は西で役牌ではない）', () => {
    const result = ok(
      computeScore(
        input('33z', '3z', {
          melds: [
            meld('kan', '5555z'),
            meld('kan', '1111m'),
            meld('pon', '333p'),
            meld('pon', '999s'),
          ],
        }),
      ),
    );
    expect(yakuIds(result)).toEqual(
      expect.arrayContaining(['toitoi', 'yakuhaiHaku']),
    );
    expect(result.fuItems.find((item) => item.id === 'pairYakuhai')).toBeUndefined();
    expect(result.fu).toBe(60);
    expect(result.payments.ron).toBe(7700);
  });

  it('R: 対々和 + 三暗刻（ロンで完成した 777s は明刻）', () => {
    const result = ok(computeScore(input('111m555p777s888p44z', '7s')));
    expect(yakuIds(result)).toEqual(
      expect.arrayContaining(['toitoi', 'sanankou']),
    );
    expect(result.yakuHan).toBe(4);
    expect(result.fu).toBe(50);
    expect(result.payments.ron).toBe(8000);
  });

  it('S: 四暗刻（ツモ）', () => {
    const result = ok(
      computeScore(
        input('111m555p777s888p44z', '7s', { ctx: { tsumo: true } }),
      ),
    );
    expect(result.yakumanCount).toBe(1);
    expect(yakuIds(result)).toEqual(['suuankou']);
    expect(result.payments.tsumo).toEqual({ dealer: 16000, nonDealer: 8000 });
    expect(result.payments.total).toBe(32000);
  });

  it('T: 親の平和ツモ', () => {
    const result = ok(
      computeScore(
        input('123m234p456p789s55s', '2p', {
          ctx: { tsumo: true, seatWind: 1, roundWind: 1 },
        }),
      ),
    );
    expect(result.yakuHan).toBe(2);
    expect(result.fu).toBe(20);
    expect(result.payments.tsumo).toEqual({ dealer: 700, nonDealer: 700 });
    expect(result.payments.total).toBe(2100);
  });

  it('U: 大三元 + 字一色 = ダブル役満', () => {
    const result = ok(
      computeScore(
        input('111z666z777z22z', '2z', {
          melds: [meld('pon', '555z')],
        }),
      ),
    );
    expect(result.yakumanCount).toBe(2);
    expect(result.payments.ron).toBe(64000);
  });

  it('V: リーチ + 平和 + 二盃口 + 清一色 + ドラ 4', () => {
    const result = ok(
      computeScore(
        input('123m123m456m456m77m', '7m', {
          ctx: { riichi: true, doraIndicators: tiles('3m6m') },
        }),
      ),
    );
    expect(result.doraHan).toBe(4);
    expect(result.yakuHan).toBe(11);
    expect(result.han).toBe(15);
    expect(result.fu).toBe(30);
    expect(result.limit).toBe('yakuman');
    expect(result.payments.ron).toBe(32000);
  });

  it('W: 本場・供託', () => {
    const result = ok(
      computeScore(
        input('123m234p456p789s55s', '2p', {
          ctx: { riichi: true, honba: 2, riichiSticks: 1 },
        }),
      ),
    );
    expect(result.payments.ron).toBe(2000);
    expect(result.payments.honba.ron).toBe(600);
    expect(result.payments.riichiSticks).toBe(1000);
  });

  it('X: 同じ牌 5 枚は ok:false', () => {
    const result = computeScore(input('11111m234p567s999s', '9s'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('5 枚');
  });

  it('Y: 純正九蓮宝燈（ダブル役満）', () => {
    const result = ok(computeScore(input('111m234m567m789m99m', '7m')));
    expect(result.yakumanCount).toBe(2);
    expect(yakuIds(result)).toEqual(['chuurenPure']);
    expect(result.payments.ron).toBe(64000);
  });

  it('Z: 三色同刻', () => {
    const result = ok(computeScore(input('111m111p111s234m99s', '1s')));
    expect(yakuIds(result)).toEqual(['sanshokuDoukou']);
    expect(result.yakuHan).toBe(2);
    expect(result.fu).toBe(50);
    expect(result.payments.ron).toBe(3200);
  });
});
