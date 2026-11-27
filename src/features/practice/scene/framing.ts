import { TILE_GAP, TILE_WIDTH, TWO_ROW_MAX } from './layout';

/**
 * 3D ステージの段数と読みやすさの判定。Three.js に依存しない。
 * HandStage（フォールバック判定）と ThreeHand（段数）の両方から使う。
 */

/** これ未満の幅では 2 段に折り返す。 */
export const MOBILE_WIDTH = 640;
/** 幅 / 高さがこれ未満でも 2 段に折り返す。 */
export const NARROW_ASPECT = 2.2;
/** フィット後に確保したい牌 1 枚の最小幅（px）。既存の sm 牌 32px より少し小さい。 */
export const MIN_TILE_WIDTH = 28;
/** カメラのフィットで手牌が占める割合（fit.ts の 1 - 2 * margin）。 */
export const SCENE_FILL = 0.88;

/** ステージの幅・アスペクトから 1 段に並べる枚数を決める。 */
export function columnsFor(width: number, height: number): number {
  if (!Number.isFinite(width) || width <= 0) return 14;
  const aspect = width / Math.max(1, height);
  return width < MOBILE_WIDTH || aspect < NARROW_ASPECT ? TWO_ROW_MAX : 14;
}

/** フィット後の牌 1 枚あたりの幅（px）の見積もり。 */
export function estimatedTileWidth(
  stageWidth: number,
  columns: number,
): number {
  if (!Number.isFinite(stageWidth) || stageWidth <= 0) {
    return Number.POSITIVE_INFINITY;
  }
  const perRow = columns > 0 ? columns : 14;
  return (stageWidth * SCENE_FILL) / (perRow * (TILE_WIDTH + TILE_GAP));
}

/** 2 段にしても牌が小さすぎる場合だけ CSS 3D へ戻す。 */
export function shouldFallbackToCss3d(
  stageWidth: number,
  stageHeight = 200,
): boolean {
  const columns = columnsFor(stageWidth, stageHeight);
  return estimatedTileWidth(stageWidth, columns) < MIN_TILE_WIDTH;
}
