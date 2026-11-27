import { BASE_ELEVATION } from './camera';
import type { HandSceneBounds } from './layout';

/**
 * OrthographicCamera のフラストムを手牌の bounding box にフィットさせる。
 * カメラは注視点 (0, 0, 0) のまま、left/right/top/bottom を非対称にして
 * 手牌がステージの中央に来るようにする。
 */

/** 画面座標に投影した bounds。u が横、v が縦（上が正）。 */
export interface ProjectedBounds {
  minU: number;
  maxU: number;
  minV: number;
  maxV: number;
}

/** 各辺の余白。0.06 なら内容が 88% を占める。 */
export const FIT_MARGIN = 0.06;

/** フィット結果。camera.left などにそのまま渡す。 */
export interface FrustumFit {
  left: number;
  right: number;
  top: number;
  bottom: number;
  width: number;
  height: number;
  /** 横幅・高さに対する手牌の占有率（0〜1）。 */
  fillX: number;
  fillY: number;
}

/**
 * カメラ（方位 0・仰角 elevation）から見た bounds の投影。
 * 縦方向は y * cos(elevation) - z * sin(elevation)。
 */
export function projectBounds(
  bounds: HandSceneBounds,
  elevation: number = BASE_ELEVATION,
): ProjectedBounds {
  const cos = Math.cos(elevation);
  const sin = Math.sin(elevation);
  return {
    minU: bounds.minX,
    maxU: bounds.maxX,
    minV: bounds.minY * cos - bounds.maxZ * sin,
    maxV: bounds.maxY * cos - bounds.minZ * sin,
  };
}

export interface FitOptions {
  /** 各辺の余白（0〜0.45）。 */
  margin?: number;
  elevation?: number;
}

/**
 * bounds を 10% 前後の余白付きでステージに収める。
 * アスペクト比が合わない方向には余白が増えるが、少なくとも片方は
 * `1 - 2 * margin` を占有する。
 */
export function fitFrustum(
  bounds: HandSceneBounds,
  aspect: number,
  options: FitOptions = {},
): FrustumFit {
  const margin = Math.min(
    0.45,
    Math.max(0, options.margin ?? FIT_MARGIN),
  );
  const projected = projectBounds(bounds, options.elevation);
  const fill = Math.max(0.1, 1 - 2 * margin);

  const contentWidth = Math.max(projected.maxU - projected.minU, 1e-4);
  const contentHeight = Math.max(projected.maxV - projected.minV, 1e-4);

  let width = contentWidth / fill;
  let height = contentHeight / fill;

  const safeAspect =
    Number.isFinite(aspect) && aspect > 0 ? aspect : 1;
  if (width / height < safeAspect) {
    width = height * safeAspect;
  } else {
    height = width / safeAspect;
  }

  const centerU = (projected.minU + projected.maxU) / 2;
  const centerV = (projected.minV + projected.maxV) / 2;

  return {
    left: centerU - width / 2,
    right: centerU + width / 2,
    top: centerV + height / 2,
    bottom: centerV - height / 2,
    width,
    height,
    fillX: contentWidth / width,
    fillY: contentHeight / height,
  };
}
