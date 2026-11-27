import { describe, expect, it } from 'vitest';
import {
  MIN_TILE_WIDTH,
  MOBILE_WIDTH,
  SCENE_FILL,
  columnsFor,
  estimatedTileWidth,
  shouldFallbackToCss3d,
} from '../../src/features/practice/scene/framing';
import { TILE_GAP, TILE_WIDTH } from '../../src/features/practice/scene/layout';

describe('3D ステージの段数と読みやすさ', () => {
  it('幅 640px 未満は 7 枚で折り返す', () => {
    expect(columnsFor(MOBILE_WIDTH - 1, 200)).toBe(7);
    expect(columnsFor(390, 200)).toBe(7);
    expect(columnsFor(360, 200)).toBe(7);
  });

  it('アスペクト 2.2 未満でも折り返す', () => {
    expect(columnsFor(900, 200)).toBe(14);
    expect(columnsFor(900, 500)).toBe(7);
    expect(columnsFor(700, 400)).toBe(7);
    // 2.2 ちょうどは折り返さない。
    expect(columnsFor(704, 320)).toBe(14);
  });

  it('デスクトップは 14 枚の 1 段', () => {
    expect(columnsFor(1120, 200)).toBe(14);
    expect(columnsFor(1000, 200)).toBe(14);
  });

  it('幅が取れないときは 1 段（14 枚）', () => {
    expect(columnsFor(0, 200)).toBe(14);
    expect(columnsFor(Number.NaN, 200)).toBe(14);
  });

  it('牌 1 枚の幅を見積もる', () => {
    const width = estimatedTileWidth(390, 7);
    expect(width).toBeCloseTo(
      (390 * SCENE_FILL) / (7 * (TILE_WIDTH + TILE_GAP)),
      6,
    );
    expect(estimatedTileWidth(0, 7)).toBe(Number.POSITIVE_INFINITY);
  });

  it('360px でも 2 段なら最小幅を確保できる（フォールバックしない）', () => {
    expect(estimatedTileWidth(296, 7)).toBeGreaterThanOrEqual(MIN_TILE_WIDTH);
    expect(shouldFallbackToCss3d(296, 200)).toBe(false);
    expect(shouldFallbackToCss3d(360, 200)).toBe(false);
    expect(shouldFallbackToCss3d(1120, 200)).toBe(false);
  });

  it('極端に狭いステージだけ CSS 3D に戻す', () => {
    expect(shouldFallbackToCss3d(200, 200)).toBe(true);
  });

  it('アスペクトが低いと折り返して読みやすさを保つ', () => {
    // 900px 幅でも高さ 500px（aspect 1.8）なら 7 枚 x 2 段。
    expect(columnsFor(900, 500)).toBe(7);
    const oneRow = estimatedTileWidth(900, 14);
    const twoRows = estimatedTileWidth(900, 7);
    expect(twoRows).toBeGreaterThan(oneRow);
  });
});
