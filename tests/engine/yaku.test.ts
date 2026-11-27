import { computeScore } from '../../src/engine/score';
import type { ScoreInput, ScoreOutcome } from '../../src/engine/types';
import { input, meld } from '../helpers';

function ok(outcome: ScoreOutcome) {
  if (!outcome.ok) throw new Error(`expected ok, got: ${outcome.error}`);
  return outcome;
}

function yakuMap(value: ScoreInput): Map<string, number> {
  const result = ok(computeScore(value));
  const map = new Map<string, number>();
  for (const hit of result.yaku) map.set(hit.id, hit.han);
  return map;
}

describe('通常役', () => {
  it('立直', () => {
    const result = ok(
      computeScore(
        input('234m345m456p678s22s', '2s', { ctx: { riichi: true } }),
      ),
    );
    expect(result.yaku.map((y) => y.id)).toEqual(
      expect.arrayContaining(['riichi', 'tanyao']),
    );
  });

  it('ダブル立直は立直と重複しない', () => {
    const map = yakuMap(
      input('234m345m456p678s22s', '2s', {
        ctx: { doubleRiichi: true },
      }),
    );
    expect(map.get('doubleRiichi')).toBe(2);
    expect(map.has('riichi')).toBe(false);
  });

  it('一発', () => {
    const map = yakuMap(
      input('234m345m456p678s22s', '2s', {
        ctx: { riichi: true, ippatsu: true },
      }),
    );
    expect(map.get('ippatsu')).toBe(1);
  });

  it('門前清自摸和', () => {
    const map = yakuMap(
      input('234m345m456p678s22s', '2s', { ctx: { tsumo: true } }),
    );
    expect(map.get('menzenTsumo')).toBe(1);
  });

  it('平和（ロン 30 符）', () => {
    const result = ok(computeScore(input('123m456p789p234s55s', '2s')));
    expect(result.yaku.map((y) => y.id)).toEqual(['pinfu']);
    expect(result.fu).toBe(30);
  });

  it('断幺九（門前）', () => {
    const map = yakuMap(input('234m345m456p678s22s', '2s'));
    expect(map.get('tanyao')).toBe(1);
  });

  it('断幺九（副露しても 1 翻）', () => {
    const map = yakuMap(
      input('22m234s678s', '4s', {
        melds: [meld('chi', '234m'), meld('chi', '567p')],
      }),
    );
    expect(map.get('tanyao')).toBe(1);
  });

  it('一盃口', () => {
    const map = yakuMap(input('112233m456p789s55s', '3m'));
    expect(map.get('iipeikou')).toBe(1);
  });

  it('二盃口（一盃口は重複しない）', () => {
    const map = yakuMap(input('112233m112233p55s', '3m'));
    expect(map.get('ryanpeikou')).toBe(3);
    expect(map.has('iipeikou')).toBe(false);
  });

  it('役牌 白', () => {
    const map = yakuMap(
      input('234m456p789s55s', '5s', { melds: [meld('pon', '555z')] }),
    );
    expect(map.get('yakuhaiHaku')).toBe(1);
  });

  it('役牌 發', () => {
    const map = yakuMap(
      input('234m456p789s55s', '5s', { melds: [meld('pon', '666z')] }),
    );
    expect(map.get('yakuhaiHatsu')).toBe(1);
  });

  it('役牌 中', () => {
    const map = yakuMap(
      input('234m456p789s55s', '5s', { melds: [meld('pon', '777z')] }),
    );
    expect(map.get('yakuhaiChun')).toBe(1);
  });

  it('役牌 自風（場風とは重複しない）', () => {
    const map = yakuMap(
      input('234m456p789s55s', '5s', {
        ctx: { seatWind: 1, roundWind: 2 },
        melds: [meld('pon', '111z')],
      }),
    );
    expect(map.get('yakuhaiSeat')).toBe(1);
    expect(map.has('yakuhaiRound')).toBe(false);
  });

  it('役牌 場風', () => {
    const map = yakuMap(
      input('234m456p789s55s', '5s', {
        ctx: { seatWind: 2, roundWind: 1 },
        melds: [meld('pon', '111z')],
      }),
    );
    expect(map.get('yakuhaiRound')).toBe(1);
    expect(map.has('yakuhaiSeat')).toBe(false);
  });

  it('連風牌の刻子は自風 + 場風で 2 翻', () => {
    const map = yakuMap(
      input('234m456p789s55s', '5s', {
        ctx: { seatWind: 1, roundWind: 1 },
        melds: [meld('pon', '111z')],
      }),
    );
    expect(map.get('yakuhaiSeat')).toBe(1);
    expect(map.get('yakuhaiRound')).toBe(1);
  });

  it('嶺上開花', () => {
    const map = yakuMap(
      input('234m456p789s55s', '5s', {
        ctx: { tsumo: true, rinshan: true },
        melds: [meld('kan', '1111m')],
      }),
    );
    expect(map.get('rinshan')).toBe(1);
    expect(map.has('menzenTsumo')).toBe(false);
  });

  it('海底摸月', () => {
    const map = yakuMap(
      input('234m345m456p678s22s', '2s', {
        ctx: { tsumo: true, haitei: true },
      }),
    );
    expect(map.get('haitei')).toBe(1);
  });

  it('河底撈魚', () => {
    const map = yakuMap(
      input('234m345m456p678s22s', '2s', { ctx: { houtei: true } }),
    );
    expect(map.get('houtei')).toBe(1);
  });

  it('搶槓', () => {
    const map = yakuMap(
      input('234m345m456p678s22s', '2s', { ctx: { chankan: true } }),
    );
    expect(map.get('chankan')).toBe(1);
  });

  it('三色同順（門前 2 翻）', () => {
    const map = yakuMap(input('123m123p123s456m99p', '3s'));
    expect(map.get('sanshokuDoujun')).toBe(2);
  });

  it('三色同順（副露 1 翻）', () => {
    const map = yakuMap(
      input('456m123p123s99p', '3s', { melds: [meld('chi', '123m')] }),
    );
    expect(map.get('sanshokuDoujun')).toBe(1);
  });

  it('一気通貫（門前 2 翻）', () => {
    const map = yakuMap(input('123m456m789m234p55s', '2p'));
    expect(map.get('ittsu')).toBe(2);
  });

  it('一気通貫（副露 1 翻）', () => {
    const map = yakuMap(
      input('456m789m234p55s', '2p', { melds: [meld('chi', '123m')] }),
    );
    expect(map.get('ittsu')).toBe(1);
  });

  it('混全帯幺九（門前 2 翻）', () => {
    const map = yakuMap(input('123m789p111s789s11z', '1z'));
    expect(map.get('chanta')).toBe(2);
  });

  it('混全帯幺九（副露 1 翻）', () => {
    const map = yakuMap(
      input('789p111s789s11z', '1z', { melds: [meld('chi', '123m')] }),
    );
    expect(map.get('chanta')).toBe(1);
  });

  it('純全帯幺九（門前 3 翻）', () => {
    const map = yakuMap(input('123m789m123p789p99s', '9s'));
    expect(map.get('junchan')).toBe(3);
  });

  it('純全帯幺九（副露 2 翻）', () => {
    const map = yakuMap(
      input('789m123p789p99s', '9s', { melds: [meld('chi', '123m')] }),
    );
    expect(map.get('junchan')).toBe(2);
  });

  it('七対子', () => {
    const map = yakuMap(input('11m33m55m77m22p44p66s', '6s'));
    expect(map.get('chiitoitsu')).toBe(2);
    expect(map.has('pinfu')).toBe(false);
  });

  it('対々和', () => {
    const map = yakuMap(
      input('333s444s99s', '9s', {
        melds: [meld('pon', '111m'), meld('pon', '222p')],
      }),
    );
    expect(map.get('toitoi')).toBe(2);
  });

  it('三暗刻（門前・ツモ）', () => {
    const map = yakuMap(
      input('111m222m333m456p99s', '3m', { ctx: { tsumo: true } }),
    );
    expect(map.get('sanankou')).toBe(2);
  });

  it('三暗刻（副露しても 2 翻）', () => {
    const map = yakuMap(
      input('222p333s444s99s', '9s', { melds: [meld('pon', '111m')] }),
    );
    expect(map.get('sanankou')).toBe(2);
  });

  it('三槓子', () => {
    const map = yakuMap(
      input('456m99s', '9s', {
        melds: [
          meld('kan', '5555z'),
          meld('kan', '1111m'),
          meld('kan', '2222p'),
        ],
      }),
    );
    expect(map.get('sankantsu')).toBe(2);
    expect(map.get('yakuhaiHaku')).toBe(1);
  });

  it('小三元', () => {
    const map = yakuMap(input('234m567p555z666z77z', '7z'));
    expect(map.get('shousangen')).toBe(2);
    expect(map.get('yakuhaiHaku')).toBe(1);
    expect(map.get('yakuhaiHatsu')).toBe(1);
  });

  it('混老頭（七対子と複合）', () => {
    const map = yakuMap(input('11m99m11p99p11s99s11z', '1z'));
    expect(map.get('chiitoitsu')).toBe(2);
    expect(map.get('honroutou')).toBe(2);
  });

  it('混一色（門前 3 翻）', () => {
    const map = yakuMap(input('111m234m567m99m777z', '7z'));
    expect(map.get('honitsu')).toBe(3);
  });

  it('混一色（副露 2 翻）', () => {
    const map = yakuMap(
      input('111m234m567m99m', '9m', { melds: [meld('pon', '777z')] }),
    );
    expect(map.get('honitsu')).toBe(2);
  });

  it('清一色（門前 6 翻）', () => {
    const map = yakuMap(input('111m234m567m888m99m', '8m'));
    expect(map.get('chinitsu')).toBe(6);
  });

  it('清一色（副露 5 翻）', () => {
    const map = yakuMap(
      input('111m567m888m99m', '9m', { melds: [meld('chi', '234m')] }),
    );
    expect(map.get('chinitsu')).toBe(5);
  });

  it('平和と七対子は同時に成立しない', () => {
    const map = yakuMap(input('234m345m456p678s22s', '2s'));
    expect(map.has('pinfu')).toBe(false);
  });

  it('三暗刻は対々和と複合する', () => {
    const map = yakuMap(input('111m333p555s777s99p', '7s'));
    expect(map.get('sanankou')).toBe(2);
    expect(map.get('toitoi')).toBe(2);
  });
  it('三色同刻（門前 2 翻）', () => {
    const map = yakuMap(input('111m111p111s234m99s', '1s'));
    expect(map.get('sanshokuDoukou')).toBe(2);
  });

  it('三色同刻（副露しても 2 翻）', () => {
    const map = yakuMap(
      input('111p111s234m99s', '1s', { melds: [meld('pon', '111m')] }),
    );
    expect(map.get('sanshokuDoukou')).toBe(2);
  });

  it('三色同刻は槓子でも成立する', () => {
    const map = yakuMap(
      input('111s234m99s', '1s', {
        melds: [meld('kan', '1111m'), meld('pon', '111p')],
      }),
    );
    expect(map.get('sanshokuDoukou')).toBe(2);
  });

  it('三色同刻は 2 種だけでは成立しない', () => {
    const map = yakuMap(
      input('111m111p234m99s', '9s', { melds: [meld('pon', '555z')] }),
    );
    expect(map.has('sanshokuDoukou')).toBe(false);
    expect(map.get('yakuhaiHaku')).toBe(1);
  });

  it('三色同順と三色同刻は別の役', () => {
    const map = yakuMap(input('123m123p123s456m99p', '3s'));
    expect(map.get('sanshokuDoujun')).toBe(2);
    expect(map.has('sanshokuDoukou')).toBe(false);
  });
});

describe('役満', () => {
  it('国士無双', () => {
    const result = ok(computeScore(input('19m19p19s1234567z1m', '1m')));
    expect(result.yakumanCount).toBe(1);
    expect(result.yaku.map((y) => y.id)).toEqual(['kokushi']);
  });

  it('四暗刻（ツモ）', () => {
    const result = ok(
      computeScore(
        input('111m222p333s444s55z', '4s', { ctx: { tsumo: true } }),
      ),
    );
    expect(result.yakumanCount).toBe(1);
    expect(result.yaku.map((y) => y.id)).toEqual(['suuankou']);
  });

  it('四暗刻単騎はダブル役満', () => {
    const result = ok(computeScore(input('111m222p333s444s55z', '5z')));
    expect(result.yakumanCount).toBe(2);
    expect(result.yaku.map((y) => y.id)).toEqual(['suuankouTanki']);
    expect(result.payments.ron).toBe(64000);
  });

  it('大三元', () => {
    const result = ok(computeScore(input('123m555z666z777z11z', '1z')));
    expect(result.yakumanCount).toBe(1);
    expect(result.yaku.map((y) => y.id)).toEqual(['daisangen']);
  });

  it('字一色', () => {
    const result = ok(
      computeScore(
        input('222z333z555z66z', '6z', { melds: [meld('pon', '111z')] }),
      ),
    );
    expect(result.yakumanCount).toBe(1);
    expect(result.yaku.map((y) => y.id)).toEqual(['tsuuiisou']);
  });

  it('緑一色', () => {
    const result = ok(computeScore(input('222s333s444s666s88s', '6s')));
    expect(result.yakumanCount).toBe(1);
    expect(result.yaku.map((y) => y.id)).toEqual(['ryuuiisou']);
  });

  it('清老頭', () => {
    const result = ok(
      computeScore(
        input('999m111p999p11s', '1s', { melds: [meld('pon', '111m')] }),
      ),
    );
    expect(result.yakumanCount).toBe(1);
    expect(result.yaku.map((y) => y.id)).toEqual(['chinroutou']);
  });

  it('小四喜', () => {
    const result = ok(computeScore(input('111z222z333z456m44z', '4z')));
    expect(result.yakumanCount).toBe(1);
    expect(result.yaku.map((y) => y.id)).toEqual(['shousuushii']);
  });

  it('大四喜はダブル役満', () => {
    const result = ok(computeScore(input('111z222z333z444z55m', '4z')));
    expect(result.yakumanCount).toBe(2);
    expect(result.yaku.map((y) => y.id)).toEqual(['daisuushii']);
    expect(result.payments.ron).toBe(64000);
  });

  it('四槓子', () => {
    const result = ok(
      computeScore(
        input('55z', '5z', {
          melds: [
            meld('kan', '1111m'),
            meld('kan', '2222p'),
            meld('kan', '3333s'),
            meld('kan', '4444s'),
          ],
        }),
      ),
    );
    expect(result.yakumanCount).toBe(1);
    expect(result.yaku.map((y) => y.id)).toEqual(['suukantsu']);
  });

  it('九蓮宝燈', () => {
    const result = ok(computeScore(input('111m234m567m789m99m', '9m')));
    expect(result.yakumanCount).toBe(1);
    expect(result.yaku.map((y) => y.id)).toEqual(['chuuren']);
  });

  it('純正九蓮宝燈はダブル役満', () => {
    const result = ok(computeScore(input('11123456789999m', '9m')));
    expect(result.yakumanCount).toBe(2);
    expect(result.yaku.map((y) => y.id)).toEqual(['chuurenPure']);
    expect(result.payments.ron).toBe(64000);
  });

  it('役満は重複する（大三元 + 字一色）', () => {
    const result = ok(
      computeScore(
        input('111z666z777z22z', '2z', { melds: [meld('pon', '555z')] }),
      ),
    );
    expect(result.yakumanCount).toBe(2);
    expect(result.yaku.map((y) => y.id).sort()).toEqual(
      ['daisangen', 'tsuuiisou'].sort(),
    );
  });

  it('役満が成立すると通常役の翻は加算しない', () => {
    const result = ok(computeScore(input('222s333s444s666s88s', '6s')));
    expect(result.han).toBe(0);
    expect(result.yakuHan).toBe(0);
    expect(result.doraHan).toBe(0);
    expect(result.yaku.every((y) => y.id === 'ryuuiisou')).toBe(true);
  });
});
