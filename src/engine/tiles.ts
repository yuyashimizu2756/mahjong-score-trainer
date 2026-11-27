import type { Suit, Tile } from './types';

export const SUITS: readonly Suit[] = ['m', 'p', 's', 'z'] as const;

export const SUIT_NAMES: Record<Suit, string> = {
  m: '萬子',
  p: '筒子',
  s: '索子',
  z: '字牌',
};

export const HONOR_NAMES: Record<number, string> = {
  1: '東',
  2: '南',
  3: '西',
  4: '北',
  5: '白',
  6: '發',
  7: '中',
};

export const SUIT_ORDER: Record<Suit, number> = { m: 0, p: 1, s: 2, z: 3 };

/** 赤 5 かどうか。 */
export function isRed(tile: Tile): boolean {
  return tile.red === true;
}

/** 数牌か（字牌でない）。 */
export function isNumberTile(tile: Tile): boolean {
  return tile.suit !== 'z';
}

export function isHonor(tile: Tile): boolean {
  return tile.suit === 'z';
}

export function isTerminal(tile: Tile): boolean {
  return tile.suit !== 'z' && (tile.rank === 1 || tile.rank === 9);
}

export function isTerminalOrHonor(tile: Tile): boolean {
  return isHonor(tile) || isTerminal(tile);
}

export function isSimple(tile: Tile): boolean {
  return !isTerminalOrHonor(tile);
}

/** スートと数字が同じ牌か（赤かどうかは無視）。 */
export function sameTile(a: Tile, b: Tile): boolean {
  return a.suit === b.suit && a.rank === b.rank;
}

/** 同種同牌で赤も一致するか。 */
export function identicalTile(a: Tile, b: Tile): boolean {
  return sameTile(a, b) && isRed(a) === isRed(b);
}

export function tileKey(tile: Tile): string {
  return `${tile.rank}${tile.suit}`;
}

export function tileId(tile: Tile): string {
  return `${tile.suit}${tile.rank}`;
}

export function makeTile(suit: Suit, rank: number, red = false): Tile {
  return red ? { suit, rank, red: true } : { suit, rank };
}

/** 牌 1 枚を `1m` / `0m` 形式にする。 */
export function tileToString(tile: Tile): string {
  const rank = isRed(tile) ? 0 : tile.rank;
  return `${rank}${tile.suit}`;
}

/** 牌を `1m` / `0m` 形式で読みやすい形（人間向け）にする。 */
export function tileToLabel(tile: Tile): string {
  if (tile.suit === 'z') return HONOR_NAMES[tile.rank] ?? `${tile.rank}z`;
  return `${isRed(tile) ? '赤' : ''}${tile.rank}${tile.suit}`;
}

function isValidShape(tile: Tile): boolean {
  if (!SUITS.includes(tile.suit)) return false;
  if (!Number.isInteger(tile.rank)) return false;
  if (tile.suit === 'z') return tile.rank >= 1 && tile.rank <= 7 && !tile.red;
  return tile.rank >= 1 && tile.rank <= 9;
}

/** 牌の並び順（スート → 数字）。赤 5 は通常の 5 の直前。 */
export function compareTiles(a: Tile, b: Tile): number {
  const suitDiff = SUIT_ORDER[a.suit] - SUIT_ORDER[b.suit];
  if (suitDiff !== 0) return suitDiff;
  if (a.rank !== b.rank) return a.rank - b.rank;
  if (isRed(a) === isRed(b)) return 0;
  return isRed(a) ? -1 : 1;
}

export function sortTiles(tiles: readonly Tile[]): Tile[] {
  return [...tiles].sort(compareTiles);
}

/** 牌の配列を `123m 456p 11z` 形式に整形する。 */
export function formatTiles(tiles: readonly Tile[]): string {
  const sorted = sortTiles(tiles);
  const groups: string[] = [];
  let currentSuit: Suit | null = null;
  let current = '';
  for (const tile of sorted) {
    if (tile.suit !== currentSuit) {
      if (current) groups.push(`${current}${currentSuit}`);
      currentSuit = tile.suit;
      current = '';
    }
    current += String(isRed(tile) ? 0 : tile.rank);
  }
  if (current && currentSuit) groups.push(`${current}${currentSuit}`);
  return groups.join(' ');
}

/**
 * `123m 456p 11z` 形式の文字列を牌の配列にする。
 * 不正な文字列は null を返す（例外は投げない）。
 */
export function parseTiles(input: string): Tile[] | null {
  const compact = input.replace(/[\s,、]+/g, '');
  if (compact.length === 0) return [];
  const tiles: Tile[] = [];
  let cursor = 0;
  while (cursor < compact.length) {
    const match = /^([0-9]+)([mpsz])/.exec(compact.slice(cursor));
    if (!match) return null;
    const digits = match[1];
    const suit = match[2] as Suit;
    for (const char of digits) {
      const rank = char === '0' ? 5 : Number(char);
      const red = char === '0';
      const tile = makeTile(suit, rank, red);
      if (!isValidShape(tile)) return null;
      tiles.push(tile);
    }
    cursor += match[0].length;
  }
  return tiles;
}

/** 単一の牌文字列（`5m` / `0p`）をパースする。 */
export function parseTile(input: string): Tile | null {
  const tiles = parseTiles(input);
  return tiles && tiles.length === 1 ? tiles[0] : null;
}

/** 牌が 1 枚もないことを確認するための合計枚数。 */
export function countTiles(tiles: readonly Tile[]): number {
  return tiles.length;
}

export function tileKindIndex(tile: Tile): number {
  const suitBase: Record<Suit, number> = { m: 0, p: 9, s: 18, z: 27 };
  return suitBase[tile.suit] + tile.rank - 1;
}

export function tileFromKindIndex(index: number): Tile {
  if (index < 9) return makeTile('m', index + 1);
  if (index < 18) return makeTile('p', index - 9 + 1);
  if (index < 27) return makeTile('s', index - 18 + 1);
  return makeTile('z', index - 27 + 1);
}

/** ドラ表示牌から実際のドラを返す（9→1、北→東、中→白）。 */
export function doraFromIndicator(indicator: Tile): Tile {
  if (indicator.suit === 'z') {
    if (indicator.rank <= 4) {
      return makeTile('z', indicator.rank === 4 ? 1 : indicator.rank + 1);
    }
    return makeTile('z', indicator.rank === 7 ? 5 : indicator.rank + 1);
  }
  return makeTile(indicator.suit, indicator.rank === 9 ? 1 : indicator.rank + 1);
}

/** ある牌が指定したスートで 1〜9 の範囲に収まるか。 */
export function inRange(suit: Suit, rank: number): boolean {
  if (suit === 'z') return rank >= 1 && rank <= 7;
  return rank >= 1 && rank <= 9;
}

/** 牌の検証。不正なら理由文字列を返す。 */
export function validateTile(tile: Tile): string | null {
  if (!tile || typeof tile !== 'object') return '牌が不正です';
  if (!SUITS.includes(tile.suit)) return `不正なスートです: ${String(tile.suit)}`;
  if (!Number.isInteger(tile.rank)) return `不正な牌です: ${String(tile.rank)}`;
  if (!inRange(tile.suit, tile.rank)) return `牌の範囲が不正です: ${tile.rank}${tile.suit}`;
  if (tile.red && (tile.suit === 'z' || tile.rank !== 5)) {
    return '赤ドラは 5 の数牌のみです';
  }
  return null;
}

export function windTile(wind: number): Tile {
  return makeTile('z', wind);
}

export function windName(wind: number): string {
  return HONOR_NAMES[wind] ?? `${wind}z`;
}
