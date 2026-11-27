/**
 * 3D 牌卓のカメラ軌道。Three.js に依存しない純粋関数。
 * 基準位置 (0, 7.5, 9.5)・注視点 (0, 0, 0) を中心に、ドラッグで ±25° / ±10° だけ動かす。
 */

export const CAMERA_RADIUS = Math.hypot(7.5, 9.5);
export const BASE_ELEVATION = Math.atan2(7.5, 9.5);
export const BASE_AZIMUTH = 0;
export const MAX_AZIMUTH = (25 * Math.PI) / 180;
export const MAX_ELEVATION = (10 * Math.PI) / 180;

export interface Orbit {
  /** 水平方向の回転（ラジアン、+Z から見て右回り）。 */
  azimuth: number;
  /** 水平面からの仰角（ラジアン）。 */
  elevation: number;
}

export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

export const DEFAULT_ORBIT: Orbit = {
  azimuth: BASE_AZIMUTH,
  elevation: BASE_ELEVATION,
};

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** ドラッグ量を加えた軌道を、許容範囲に収める。 */
export function clampOrbit(orbit: Orbit): Orbit {
  return {
    azimuth: clamp(orbit.azimuth, -MAX_AZIMUTH, MAX_AZIMUTH),
    elevation: clamp(
      orbit.elevation,
      BASE_ELEVATION - MAX_ELEVATION,
      BASE_ELEVATION + MAX_ELEVATION,
    ),
  };
}

/** 軌道からカメラ位置を求める。基準では (0, 7.5, 9.5) になる。 */
export function orbitPosition(orbit: Orbit): Vec3 {
  const safe = clampOrbit(orbit);
  const horizontal = Math.cos(safe.elevation) * CAMERA_RADIUS;
  return {
    x: horizontal * Math.sin(safe.azimuth),
    y: Math.sin(safe.elevation) * CAMERA_RADIUS,
    z: horizontal * Math.cos(safe.azimuth),
  };
}

/** ピクセルのドラッグ量を軌道の変化に変換する。 */
export function orbitFromDrag(
  start: Orbit,
  deltaX: number,
  deltaY: number,
): Orbit {
  return clampOrbit({
    azimuth: start.azimuth + deltaX * 0.004,
    elevation: start.elevation - deltaY * 0.003,
  });
}
