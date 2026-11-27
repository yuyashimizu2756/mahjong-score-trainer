import type { Tile } from '../engine/types';
import { HONOR_NAMES } from '../engine/tiles';

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
