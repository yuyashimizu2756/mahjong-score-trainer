import { memo, useMemo } from 'react';
import type { Tile } from '../../engine/types';
import { tileFaceSvg } from './tileFaceSvg';

export interface TileFaceProps {
  tile: Tile;
  /** 牌面の下端にスート記号を添える。 */
  showSuitMark?: boolean;
}

/**
 * 牌面の SVG。CSS 変数や currentColor に依存しないため、
 * 同じマークアップを 3D のテクスチャにも流用できる。
 */
export const TileFace = memo(function TileFace({
  tile,
  showSuitMark = false,
}: TileFaceProps) {
  const svg = useMemo(
    () => tileFaceSvg(tile, { showSuitMark }),
    // 同じ牌・同じ設定なら SVG 文字列を作り直さない。
    [tile.suit, tile.rank, tile.red, showSuitMark],
  );

  return (
    <span
      aria-hidden="true"
      className="tile-face-content"
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
});
