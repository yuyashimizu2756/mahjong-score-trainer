import type { Meld, Tile } from '../../../engine/types';
import { HONOR_NAMES } from '../../../engine/tiles';
import { findWinIndex } from './layout';

/** 牌を「二萬」「東」「赤五筒」のような読み上げ用の日本語にする。 */

const RANK_KANJI = ['一', '二', '三', '四', '五', '六', '七', '八', '九'];

const SUIT_NAME: Record<Tile['suit'], string> = {
  m: '萬',
  p: '筒',
  s: '索',
  z: '',
};

export function tileJaLabel(tile: Tile): string {
  if (tile.suit === 'z') return HONOR_NAMES[tile.rank] ?? `${tile.rank}字`;
  const rank = RANK_KANJI[tile.rank - 1] ?? String(tile.rank);
  return `${tile.red ? '赤' : ''}${rank}${SUIT_NAME[tile.suit]}`;
}

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
