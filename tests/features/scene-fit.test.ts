import { describe, expect, it } from 'vitest';
import type { Tile } from '../../src/engine/types';
import { BASE_ELEVATION } from '../../src/features/practice/scene/camera';
import {
  FIT_MARGIN,
  fitFrustum,
  projectBounds,
} from '../../src/features/practice/scene/fit';
import { layoutHand } from '../../src/features/practice/scene/layout';

const fourteen: Tile[] = Array.from({ length: 14 }, (_, index) => ({
  suit: (['m', 'p', 's', 'z'] as const)[Math.floor(index / 9)],
  rank: (index % 9) + 1,
}));

function expectInside(
  fit: ReturnType<typeof fitFrustum>,
  bounds: ReturnType<typeof layoutHand>['bounds'],
): void {
  const projected = projectBounds(bounds);
  expect(fit.left).toBeLessThanOrEqual(projected.minU + 1e-9);
  expect(fit.right).toBeGreaterThanOrEqual(projected.maxU - 1e-9);
  expect(fit.bottom).toBeLessThanOrEqual(projected.minV + 1e-9);
  expect(fit.top).toBeGreaterThanOrEqual(projected.maxV - 1e-9);
}

describe('3D カメラのフィット', () => {
  it('14 枚 1 段を横長ステージに 88% でフィットする', () => {
    const layout = layoutHand({ concealed: fourteen });
    const fit = fitFrustum(layout.bounds, 1120 / 200);
    expectInside(fit, layout.bounds);
    expect(fit.fillX).toBeCloseTo(1 - 2 * FIT_MARGIN, 4);
    expect(fit.fillX).toBeGreaterThan(0.8);
    // 高さはアスペクトの都合で余るが、内容は中央に来る。
    expect(fit.fillY).toBeGreaterThan(0.3);
    const projected = projectBounds(layout.bounds);
    expect((fit.left + fit.right) / 2).toBeCloseTo(
      (projected.minU + projected.maxU) / 2,
      6,
    );
    expect((fit.top + fit.bottom) / 2).toBeCloseTo(
      (projected.minV + projected.maxV) / 2,
      6,
    );
  });

  it('2 段の手牌を縦長ステージにフィットする', () => {
    const layout = layoutHand({ concealed: fourteen, maxPerRow: 7 });
    expect(layout.rows).toBe(2);
    const fit = fitFrustum(layout.bounds, 390 / 200);
    expectInside(fit, layout.bounds);
    expect(fit.fillX).toBeGreaterThan(0.8);
    expect(fit.width / fit.height).toBeCloseTo(390 / 200, 6);
  });

  it('bounds が空でも潰れない', () => {
    const fit = fitFrustum(
      { minX: -1, maxX: 1, minY: 0, maxY: 1, minZ: -0.5, maxZ: 0.5 },
      1,
    );
    expect(fit.width).toBeGreaterThan(0);
    expect(fit.height).toBeGreaterThan(0);
    expect(Number.isFinite(fit.left)).toBe(true);
  });

  it('仰角が高いほど縦の投影は小さくなる（見下ろしの効果）', () => {
    const layout = layoutHand({ concealed: fourteen });
    const low = projectBounds(layout.bounds, BASE_ELEVATION);
    const high = projectBounds(layout.bounds, BASE_ELEVATION + 0.4);
    expect(high.maxV - high.minV).toBeLessThan(low.maxV - low.minV);
  });
});
