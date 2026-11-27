import { describe, expect, it } from 'vitest';
import {
  FU_ROWS,
  HAN_COLUMNS,
  isCellValid,
  scoreCell,
} from '../../src/lib/score-table';
import { computeScore } from '../../src/engine/score';
import { input, meld, tiles } from '../helpers';
import type { ScoreResult } from '../../src/engine/types';

function ok(concealed: string, win: string, options?: Parameters<typeof input>[2]): ScoreResult {
  const result = computeScore(input(concealed, win, options));
  if (!result.ok) throw new Error(result.error);
  return result;
}

function expectMatchesEngine(
  fu: number,
  han: number,
  dealer: boolean,
  tsumo: boolean,
  result: ScoreResult,
): void {
  const cell = scoreCell(fu, han, { dealer, tsumo });
  expect(cell.valid).toBe(true);
  if (tsumo) {
    expect(cell.tsumo).toEqual(result.payments.tsumo);
    expect(cell.total).toBe(result.payments.total);
  } else {
    expect(cell.ron).toBe(result.payments.ron);
    expect(cell.total).toBe(result.payments.total);
  }
  expect(cell.limit).toBe(result.limit);
}

describe('score-table', () => {
  it('代表セル: 30 符 3 翻の子ロンは 3,900', () => {
    const cell = scoreCell(30, 3, { dealer: false, tsumo: false });
    expect(cell.ron).toBe(3900);
    expect(cell.limit).toBe('none');
  });

  it('代表セル: 40 符 4 翻は満貫 8,000', () => {
    const child = scoreCell(40, 4, { dealer: false, tsumo: false });
    const parent = scoreCell(40, 4, { dealer: true, tsumo: false });
    expect(child.ron).toBe(8000);
    expect(child.limit).toBe('mangan');
    expect(parent.ron).toBe(12000);
  });

  it('代表セル: 子ツモ 20 符 2 翻は 400 / 700', () => {
    const cell = scoreCell(20, 2, { dealer: false, tsumo: true });
    expect(cell.tsumo).toEqual({ dealer: 700, nonDealer: 400 });
    expect(cell.total).toBe(1500);
  });

  it('親ツモは全員から同額', () => {
    const cell = scoreCell(20, 2, { dealer: true, tsumo: true });
    expect(cell.tsumo).toEqual({ dealer: 700, nonDealer: 700 });
    expect(cell.total).toBe(2100);
  });

  it('3 翻 60 符は 7,700（満貫未満）', () => {
    const cell = scoreCell(60, 3, { dealer: false, tsumo: false });
    expect(cell.ron).toBe(7700);
    expect(cell.limit).toBe('none');
  });

  it('20 符ロンと 25 符 1 翻は成立しない', () => {
    expect(isCellValid(20, 2, false)).toBe(false);
    expect(scoreCell(20, 2, { dealer: false, tsumo: false }).valid).toBe(false);
    expect(isCellValid(25, 1, false)).toBe(false);
    expect(isCellValid(25, 2, false)).toBe(true);
    expect(isCellValid(20, 2, true)).toBe(true);
  });

  it('全行・全列で不正セル以外は支払いが正の値になる', () => {
    for (const fu of FU_ROWS) {
      for (const han of HAN_COLUMNS) {
        for (const dealer of [false, true]) {
          for (const tsumo of [false, true]) {
            const cell = scoreCell(fu, han, { dealer, tsumo });
            if (cell.valid) expect(cell.total).toBeGreaterThan(0);
          }
        }
      }
    }
  });

  it('エンジン A: 平和ツモ 20 符 2 翻', () => {
    const result = ok('123m234p456p789s55s', '2p', {
      ctx: { tsumo: true },
    });
    expect(result.fu).toBe(20);
    expect(result.han).toBe(2);
    expectMatchesEngine(20, 2, false, true, result);
  });

  it('エンジン B: リーチ平和ロン 30 符 2 翻', () => {
    const result = ok('123m234p456p789s55s', '2p', {
      ctx: { riichi: true },
    });
    expect(result.fu).toBe(30);
    expect(result.han).toBe(2);
    expectMatchesEngine(30, 2, false, false, result);
  });

  it('エンジン C: 断幺九 40 符 1 翻', () => {
    const result = ok('234m345m456p678s22s', '2s');
    expect(result.fu).toBe(40);
    expect(result.han).toBe(1);
    expectMatchesEngine(40, 1, false, false, result);
  });

  it('エンジン D: 役牌 30 符 1 翻', () => {
    const result = ok('234m456p789s55s', '5s', {
      melds: [meld('pon', '777z')],
    });
    expectMatchesEngine(30, 1, false, false, result);
  });

  it('エンジン I: リーチ + 平和 + 一気通貫 30 符 4 翻', () => {
    const result = ok('123m456m789m234p55s', '2p', {
      ctx: { riichi: true },
    });
    expect(result.fu).toBe(30);
    expect(result.han).toBe(4);
    expectMatchesEngine(30, 4, false, false, result);
  });

  it('エンジン J: 混一色 + 役牌 50 符 4 翻（満貫）', () => {
    const result = ok('111m234m567m99m777z', '7z');
    expect(result.fu).toBe(50);
    expect(result.han).toBe(4);
    expectMatchesEngine(50, 4, false, false, result);
  });

  it('エンジン: 30 符 3 翻（ピンフ + 断幺 + ドラ 1）', () => {
    const result = ok('22m345m456p678s345s', '3m', {
      ctx: { doraIndicators: tiles('4s') },
    });
    expect(result.fu).toBe(30);
    expect(result.han).toBe(3);
    expectMatchesEngine(30, 3, false, false, result);
  });

  it('エンジン: 40 符 4 翻（リーチ + 断幺 + ドラ 2）', () => {
    const result = ok('234m345m456p678s22s', '2s', {
      ctx: { riichi: true, doraIndicators: tiles('1s') },
    });
    expect(result.fu).toBe(40);
    expect(result.han).toBe(4);
    expectMatchesEngine(40, 4, false, false, result);
  });

  it('エンジン: 親ロン 40 符 4 翻', () => {
    const result = ok('234m345m456p678s22s', '2s', {
      ctx: {
        seatWind: 1,
        riichi: true,
        doraIndicators: tiles('1s'),
      },
    });
    expectMatchesEngine(40, 4, true, false, result);
  });

  it('エンジン: 親ツモ 20 符 2 翻', () => {
    const result = ok('123m234p456p789s55s', '2p', {
      ctx: { seatWind: 1, tsumo: true },
    });
    expectMatchesEngine(20, 2, true, true, result);
  });
});
