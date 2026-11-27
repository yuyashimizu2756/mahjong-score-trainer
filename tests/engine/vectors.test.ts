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

/**
 * docs/TEST-VECTORS.md の A〜X。
 *
 * 注: いくつかのベクタは docs/RULES.md と矛盾する（PR 本文に詳細）。
 * ここでは「唯一の正」である docs/RULES.md と ISSUE #1 の分解選択規則に
 * 従った実際の値を検証し、doc の意図した値は別途「docs 意図」で検証する。
 */
describe('TEST-VECTORS A-X (RULES 準拠)', () => {
  it('A: 平和ツモ（一気通貫も成立する）', () => {
    const result = ok(
      computeScore(
        input('123m456m789m234p55s', '2p', { ctx: { tsumo: true } }),
      ),
    );
    expect(result.yakuHan).toBe(4);
    expect(yakuIds(result)).toEqual(
      expect.arrayContaining(['pinfu', 'menzenTsumo', 'ittsu']),
    );
    expect(result.fu).toBe(20);
    expect(result.payments.tsumo).toEqual({ dealer: 2600, nonDealer: 1300 });
    expect(result.payments.total).toBe(5200);
    // docs の期待値は 2 翻 20 符 400/700 だが、123m456m789m は一気通貫。
  });

  it('B: リーチ平和ロン（一気通貫も成立する）', () => {
    const result = ok(
      computeScore(
        input('123m456m789m234p55s', '2p', { ctx: { riichi: true } }),
      ),
    );
    expect(result.yakuHan).toBe(4);
    expect(result.fu).toBe(30);
    expect(result.payments.ron).toBe(7700);
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
    expect(yakuIds(result)).toEqual(expect.arrayContaining(['toitoi', 'sanankou']));
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

  it('L: 九蓮宝燈（この牌姿は実際に九蓮宝燈）', () => {
    const result = ok(computeScore(input('111m234m567m789m99m', '9m')));
    expect(result.yakumanCount).toBe(1);
    expect(yakuIds(result)).toEqual(['chuuren']);
    expect(result.payments.ron).toBe(32000);
    // docs の期待値は清一色 6 翻 12000 だが、1112345678999 + 7 の九蓮宝燈。
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

  it('Q: 槓子 4 種の符（雀頭が自風 南で +2）', () => {
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
    expect(yakuIds(result)).toEqual(expect.arrayContaining(['toitoi', 'yakuhaiHaku']));
    expect(result.fuItems.find((item) => item.id === 'pairYakuhai')?.fu).toBe(2);
    expect(result.fu).toBe(70);
    expect(result.payments.ron).toBe(8000);
    // docs の 60 符は自風=南の雀頭 +2 を数え落としている。
  });

  it('R: ロンで完成した刻子は明刻（三暗刻は成立しない）', () => {
    const result = ok(computeScore(input('111m222m333m456p99s', '3m')));
    expect(result.yakuHan).toBe(1);
    expect(yakuIds(result)).toEqual(['iipeikou']);
    expect(result.fu).toBe(40);
    expect(result.payments.ron).toBe(1300);
    // docs は三暗刻 2 翻 3200 を期待するが、ロンで完成した 333m は明刻。
  });

  it('S: 三暗刻 + 門前ツモ', () => {
    const result = ok(
      computeScore(
        input('111m222m333m456p99s', '3m', { ctx: { tsumo: true } }),
      ),
    );
    expect(yakuIds(result)).toEqual(expect.arrayContaining(['sanankou', 'menzenTsumo']));
    expect(result.yakuHan).toBe(3);
    expect(result.fu).toBe(40);
    expect(result.payments.total).toBe(5200);
  });

  it('T: 親の平和ツモ', () => {
    const result = ok(
      computeScore(
        input('123m456m789m234p55s', '2p', {
          ctx: { tsumo: true, seatWind: 1, roundWind: 1 },
        }),
      ),
    );
    expect(result.fu).toBe(20);
    expect(result.payments.tsumo).toEqual({ dealer: 2600, nonDealer: 2600 });
    expect(result.payments.total).toBe(7800);
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

  it('V: リーチ + 二盃口 + 清一色 + ドラ 4', () => {
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
    expect(result.limit).toBe('yakuman');
    expect(result.payments.ron).toBe(32000);
    // docs の 14 翻は 234m234m567m567m11m の分解を見落としている。
    // 同点なら翻が高い分解を選ぶ（ISSUE #1）。
  });

  it('W: 本場・供託', () => {
    const result = ok(
      computeScore(
        input('123m456m789m234p55s', '2p', {
          ctx: { riichi: true, honba: 2, riichiSticks: 1 },
        }),
      ),
    );
    expect(result.payments.ron).toBe(7700);
    expect(result.payments.honba.ron).toBe(600);
    expect(result.payments.riichiSticks).toBe(1000);
  });

  it('X: 同じ牌 5 枚は ok:false', () => {
    const result = computeScore(input('11111m234p567s99s', '9s'));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error).toContain('5 枚');
  });
});

/**
 * docs が意図した数値を、矛盾のない牌姿で再現できることの確認。
 */
describe('TEST-VECTORS の意図した値', () => {
  it('A/B/T/W の意図: 一気通貫を含まない平和形', () => {
    const hand = '123m456p789p234s55s';
    const a = ok(computeScore(input(hand, '2s', { ctx: { tsumo: true } })));
    expect(a.yakuHan).toBe(2);
    expect(a.fu).toBe(20);
    expect(a.payments.tsumo).toEqual({ dealer: 700, nonDealer: 400 });

    const b = ok(computeScore(input(hand, '2s', { ctx: { riichi: true } })));
    expect(b.yakuHan).toBe(2);
    expect(b.fu).toBe(30);
    expect(b.payments.ron).toBe(2000);

    const t = ok(
      computeScore(
        input(hand, '2s', {
          ctx: { tsumo: true, seatWind: 1, roundWind: 1 },
        }),
      ),
    );
    expect(t.payments.tsumo).toEqual({ dealer: 700, nonDealer: 700 });
    expect(t.payments.total).toBe(2100);

    const w = ok(
      computeScore(
        input(hand, '2s', {
          ctx: { riichi: true, honba: 2, riichiSticks: 1 },
        }),
      ),
    );
    expect(w.payments.ron).toBe(2000);
    expect(w.payments.honba.ron).toBe(600);
    expect(w.payments.riichiSticks).toBe(1000);
  });

  it('Q の意図: 雀頭が自風でない場合は 60 符 7700', () => {
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
    expect(result.fu).toBe(60);
    expect(result.payments.ron).toBe(7700);
  });

  it('R の意図: 9s 待ちなら三暗刻 50 符 3200', () => {
    const r = ok(computeScore(input('111m222m333m456p99s', '9s')));
    expect(r.yakuHan).toBe(2);
    expect(r.fu).toBe(50);
    expect(r.payments.ron).toBe(3200);
  });

  it('L の意図: 九蓮にならない清一色は 6 翻 40 符 12000', () => {
    const result = ok(computeScore(input('111m234m567m888m99m', '8m')));
    expect(yakuIds(result)).toEqual(['chinitsu']);
    expect(result.fu).toBe(40);
    expect(result.payments.ron).toBe(12000);
  });
});
