import { computeScore } from '../../src/engine/score';
import type { Meld, ScoreInput } from '../../src/engine/types';
import { makeTile } from '../../src/engine/tiles';
import { ctx, input, meld, tiles } from '../helpers';

function expectError(value: ScoreInput, contains?: string): void {
  const result = computeScore(value);
  expect(result.ok).toBe(false);
  if (!result.ok && contains) expect(result.error).toContain(contains);
}

describe('不正入力は例外を投げず ok:false', () => {
  it('同じ牌が 5 枚以上', () => {
    expectError(input('11111m234p567s99s', '9s'), '5 枚');
  });

  it('赤 5 が 2 枚以上', () => {
    expectError(input('05m05m234p567s99s', '9s'), '赤');
  });

  it('牌枚数が合わない', () => {
    expectError(input('123m', '1m'), '枚数');
    expectError(input('123m456m789m234p555s', '5s'), '枚数');
  });

  it('和了牌が手牌にない', () => {
    expectError(input('123m456p789p234s55s', '7z'), '和了牌');
  });

  it('順子が同種の連番でない', () => {
    expectError(
      input('234m456p789s55s', '5s', { melds: [meld('chi', '135m')] }),
      '順子',
    );
    expectError(
      input('234m456p789s55s', '5s', { melds: [meld('chi', '123z')] }),
      '順子',
    );
  });

  it('刻子が同じ牌でない', () => {
    expectError(
      input('234m456p789s55s', '5s', {
        melds: [{ type: 'pon', tiles: tiles('112m'), open: true }],
      }),
      '刻子',
    );
  });

  it('槓子が 4 枚でない', () => {
    expectError(
      input('234m456p789s55s', '5s', {
        melds: [{ type: 'kan', tiles: tiles('111m'), open: true }],
      }),
      '槓子',
    );
  });

  it('副露の枚数と手牌枚数が矛盾', () => {
    expectError(
      input('123m456p789p234s55s', '5s', {
        melds: [meld('chi', '123m')],
      }),
      '枚数',
    );
  });

  it('門前なのに立直なしで副露ありは問題ないが、立直ありはできない', () => {
    expectError(
      input('234m456p789s55s', '5s', {
        ctx: { riichi: true },
        melds: [meld('pon', '777z')],
      }),
      '立直',
    );
  });

  it('立直とダブル立直は同時に指定できない', () => {
    expectError(
      input('234m345m456p678s22s', '2s', {
        ctx: { riichi: true, doubleRiichi: true },
      }),
      '立直',
    );
  });

  it('一発は立直が必要', () => {
    expectError(
      input('234m345m456p678s22s', '2s', { ctx: { ippatsu: true } }),
      '一発',
    );
  });

  it('海底摸月はツモのみ', () => {
    expectError(
      input('234m345m456p678s22s', '2s', { ctx: { haitei: true } }),
      '海底',
    );
  });

  it('河底撈魚はロンのみ', () => {
    expectError(
      input('234m345m456p678s22s', '2s', {
        ctx: { tsumo: true, houtei: true },
      }),
      '河底',
    );
  });

  it('嶺上開花には槓子が必要', () => {
    expectError(
      input('234m345m456p678s22s', '2s', {
        ctx: { tsumo: true, rinshan: true },
      }),
      '嶺上',
    );
  });

  it('搶槓はロンのみ', () => {
    expectError(
      input('234m345m456p678s22s', '2s', {
        ctx: { tsumo: true, chankan: true },
      }),
      '搶槓',
    );
  });

  it('海底と嶺上は同時に成立しない', () => {
    expectError(
      input('234m345m456p678s22s', '2s', {
        ctx: { tsumo: true, haitei: true, rinshan: true },
        melds: [meld('kan', '1111m')],
      }),
      '海底',
    );
  });

  it('役がない手（ドラのみ）は和了できない', () => {
    expectError(
      input('123m456p789p234s11z', '3s', {
        ctx: { doraIndicators: tiles('2s') },
      }),
      '役',
    );
  });

  it('同じ手でも立直があれば和了できる', () => {
    const result = computeScore(
      input('123m456p789p234s11z', '3s', { ctx: { riichi: true } }),
    );
    expect(result.ok).toBe(true);
  });

  it('不正な牌オブジェクト', () => {
    expectError(
      {
        concealed: [
          makeTile('m', 1),
          makeTile('m', 2),
          makeTile('m', 3),
          ...tiles('456p789s11z'),
          makeTile('z', 9),
        ],
        melds: [],
        winTile: makeTile('m', 1),
        ctx: ctx(),
      },
      '牌',
    );
  });

  it('場況が壊れていても例外を投げない', () => {
    const result = computeScore({} as unknown as ScoreInput);
    expect(result.ok).toBe(false);
  });

  it('副露が壊れていても例外を投げない', () => {
    expectError(
      {
        concealed: tiles('234m456p789s55s'),
        melds: [{ type: 'pon', tiles: [], open: true } as unknown as Meld],
        winTile: makeTile('s', 5),
        ctx: ctx(),
      },
      '刻子',
    );
  });
});
