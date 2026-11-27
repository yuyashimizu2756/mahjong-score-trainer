import { describe, expect, it } from 'vitest';
import {
  BASE_ELEVATION,
  CAMERA_RADIUS,
  DEFAULT_ORBIT,
  MAX_AZIMUTH,
  MAX_ELEVATION,
  clampOrbit,
  orbitFromDrag,
  orbitPosition,
} from '../../src/features/practice/scene/camera';

describe('3D カメラの軌道', () => {
  it('基準位置は (0, 7.5, 9.5) 付近', () => {
    const position = orbitPosition(DEFAULT_ORBIT);
    expect(position.x).toBeCloseTo(0, 6);
    expect(position.y).toBeCloseTo(7.5, 6);
    expect(position.z).toBeCloseTo(9.5, 6);
  });

  it('どの角度でも注視点からの距離は一定', () => {
    const samples = [
      { azimuth: 0, elevation: BASE_ELEVATION },
      { azimuth: MAX_AZIMUTH, elevation: BASE_ELEVATION + MAX_ELEVATION },
      { azimuth: -MAX_AZIMUTH, elevation: BASE_ELEVATION - MAX_ELEVATION },
      { azimuth: 0.3, elevation: 0.5 },
    ];
    for (const sample of samples) {
      const position = orbitPosition(sample);
      expect(
        Math.hypot(position.x, position.y, position.z),
      ).toBeCloseTo(CAMERA_RADIUS, 6);
    }
  });

  it('水平 ±25°・垂直 ±10° を超えない', () => {
    const tooFar = clampOrbit({
      azimuth: 2,
      elevation: 2,
    });
    expect(tooFar.azimuth).toBeCloseTo(MAX_AZIMUTH, 6);
    expect(tooFar.elevation).toBeCloseTo(
      BASE_ELEVATION + MAX_ELEVATION,
      6,
    );

    const tooLow = clampOrbit({ azimuth: -2, elevation: -2 });
    expect(tooLow.azimuth).toBeCloseTo(-MAX_AZIMUTH, 6);
    expect(tooLow.elevation).toBeCloseTo(
      BASE_ELEVATION - MAX_ELEVATION,
      6,
    );
  });

  it('ドラッグは右で +方位、下で視点が下がる', () => {
    const right = orbitFromDrag(DEFAULT_ORBIT, 100, 0);
    expect(right.azimuth).toBeGreaterThan(0);
    const left = orbitFromDrag(DEFAULT_ORBIT, -100, 0);
    expect(left.azimuth).toBeLessThan(0);

    const down = orbitFromDrag(DEFAULT_ORBIT, 0, 100);
    expect(down.elevation).toBeLessThan(BASE_ELEVATION);
    const up = orbitFromDrag(DEFAULT_ORBIT, 0, -100);
    expect(up.elevation).toBeGreaterThan(BASE_ELEVATION);
  });

  it('大きなドラッグでも範囲内に収まる', () => {
    const far = orbitFromDrag(DEFAULT_ORBIT, 100_000, 100_000);
    expect(Math.abs(far.azimuth)).toBeLessThanOrEqual(MAX_AZIMUTH + 1e-9);
    expect(far.elevation).toBeGreaterThanOrEqual(
      BASE_ELEVATION - MAX_ELEVATION - 1e-9,
    );
    expect(far.elevation).toBeLessThanOrEqual(
      BASE_ELEVATION + MAX_ELEVATION + 1e-9,
    );
  });
});
