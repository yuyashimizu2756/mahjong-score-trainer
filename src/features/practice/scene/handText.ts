import type { Meld, Tile } from '../../../engine/types';
import { findWinIndex } from './layout';

import { tileJaLabel } from '../../../lib/tile-label';

export { tileJaLabel };

const MELD_LABEL: Record<Meld['type'], string> = {
  chi: 'チー',
  pon: 'ポン',
  kan: 'カン',
};

/**
 * 3D キャンバスの代わりに読み上げる手牌のテキスト。
 * canvas を aria-hidden にしているので、同じ内容を DOM でも提供する。
 */
export function describeHand(
  concealed: readonly Tile[],
  melds: readonly Meld[] = [],
  winTile?: Tile,
): string {
  const winIndex = findWinIndex(concealed, winTile);
  const concealedText = concealed
    .map((tile, index) =>
      index === winIndex ? `${tileJaLabel(tile)}（和了牌）` : tileJaLabel(tile),
    )
    .join(' ');
  const meldText = melds
    .map(
      (meld) =>
        `${MELD_LABEL[meld.type]} ${meld.tiles.map(tileJaLabel).join(' ')}`,
    )
    .join(' / ');
  const prefix = concealed.length > 0 ? `手牌 ${concealedText}` : '手牌なし';
  return meldText ? `${prefix} / 副露 ${meldText}` : prefix;
}
