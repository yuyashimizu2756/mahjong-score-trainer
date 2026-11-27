import type { Meld, Tile, WaitType } from './types';
import {
  sameTile,
  sortTiles,
  tileKindIndex,
} from './tiles';

/** 分解後の面子。槓子も 1 面子として扱う。 */
export interface HandSet {
  kind: 'run' | 'triplet' | 'kan';
  tiles: Tile[];
  /** 副露なら true（暗槓は false）。 */
  open: boolean;
  kanKind?: 'open' | 'closed' | 'added';
}

export interface StandardDecomposition {
  type: 'standard';
  sets: HandSet[];
  pair: Tile[];
}

export interface ChiitoitsuDecomposition {
  type: 'chiitoitsu';
  pairs: Tile[][];
}

export interface KokushiDecomposition {
  type: 'kokushi';
  tiles: Tile[];
}

export type Decomposition =
  | StandardDecomposition
  | ChiitoitsuDecomposition
  | KokushiDecomposition;

export interface WinPlacement {
  /** sets のインデックス。雀頭で和了した場合は 'pair'。 */
  winSet: number | 'pair';
  wait: WaitType;
}

interface RawSet {
  kind: 'run' | 'triplet';
  /** 先頭の牌種インデックス。 */
  idx: number;
}

function isSuitedIndex(index: number): boolean {
  return index >= 0 && index < 27;
}

function countsFromTiles(tiles: readonly Tile[]): number[] {
  const counts = new Array<number>(34).fill(0);
  for (const tile of tiles) counts[tileKindIndex(tile)] += 1;
  return counts;
}

function enumerateRawSets(
  counts: number[],
  from: number,
  acc: RawSet[],
  out: RawSet[][],
): void {
  let index = from;
  while (index < 34 && counts[index] === 0) index += 1;
  if (index === 34) {
    out.push([...acc]);
    return;
  }

  if (counts[index] >= 3) {
    counts[index] -= 3;
    acc.push({ kind: 'triplet', idx: index });
    enumerateRawSets(counts, index, acc, out);
    acc.pop();
    counts[index] += 3;
  }

  if (
    isSuitedIndex(index) &&
    index % 9 <= 6 &&
    counts[index + 1] > 0 &&
    counts[index + 2] > 0
  ) {
    counts[index] -= 1;
    counts[index + 1] -= 1;
    counts[index + 2] -= 1;
    acc.push({ kind: 'run', idx: index });
    enumerateRawSets(counts, index, acc, out);
    acc.pop();
    counts[index] += 1;
    counts[index + 1] += 1;
    counts[index + 2] += 1;
  }
}

/**
 * 標準形（4 面子 + 1 雀頭）の候補をすべて列挙する。
 * 手牌は副露を除いた（和了牌を含む）枚数であること。
 */
export function enumerateStandardShapes(
  tiles: readonly Tile[],
): Array<{ sets: RawSet[]; pairIndex: number }> {
  const counts = countsFromTiles(tiles);
  const results: Array<{ sets: RawSet[]; pairIndex: number }> = [];
  const seen = new Set<string>();

  for (let pairIndex = 0; pairIndex < 34; pairIndex += 1) {
    if (counts[pairIndex] < 2) continue;
    counts[pairIndex] -= 2;
    const rawSets: RawSet[][] = [];
    enumerateRawSets(counts, 0, [], rawSets);
    counts[pairIndex] += 2;

    for (const sets of rawSets) {
      const key = `${pairIndex}|${sets
        .map((set) => `${set.kind}${set.idx}`)
        .sort()
        .join(',')}`;
      if (seen.has(key)) continue;
      seen.add(key);
      results.push({ sets, pairIndex });
    }
  }
  return results;
}

function takeTiles(
  pool: Map<number, Tile[]>,
  index: number,
  count: number,
): Tile[] {
  const stack = pool.get(index);
  if (!stack || stack.length < count) return [];
  return stack.splice(0, count);
}

function materializeStandard(
  raw: { sets: RawSet[]; pairIndex: number },
  tiles: readonly Tile[],
): { sets: HandSet[]; pair: Tile[] } | null {
  const sorted = sortTiles(tiles);
  const pool = new Map<number, Tile[]>();
  for (const tile of sorted) {
    const index = tileKindIndex(tile);
    const stack = pool.get(index);
    if (stack) stack.push(tile);
    else pool.set(index, [tile]);
  }

  const sets: HandSet[] = [];
  for (const set of raw.sets) {
    const indices =
      set.kind === 'run' ? [set.idx, set.idx + 1, set.idx + 2] : [set.idx, set.idx, set.idx];
    const setTiles: Tile[] = [];
    for (const index of indices) {
      const [tile] = takeTiles(pool, index, 1);
      if (!tile) return null;
      setTiles.push(tile);
    }
    sets.push({
      kind: set.kind,
      tiles: sortTiles(setTiles),
      open: false,
    });
  }

  const pair = takeTiles(pool, raw.pairIndex, 2);
  if (pair.length !== 2) return null;

  return { sets, pair: sortTiles(pair) };
}

/** 標準形の分解をすべて返す（面子は閉じた状態）。 */
export function decomposeStandard(
  tiles: readonly Tile[],
): StandardDecomposition[] {
  const results: StandardDecomposition[] = [];
  for (const raw of enumerateStandardShapes(tiles)) {
    const materialized = materializeStandard(raw, tiles);
    if (!materialized) continue;
    results.push({
      type: 'standard',
      sets: materialized.sets,
      pair: materialized.pair,
    });
  }
  return results;
}

/** 七対子として成立するか。同じ牌 4 枚を 2 対子に使う形は認めない。 */
export function decomposeChiitoitsu(
  tiles: readonly Tile[],
): ChiitoitsuDecomposition | null {
  if (tiles.length !== 14) return null;
  const counts = new Map<number, Tile[]>();
  for (const tile of sortTiles(tiles)) {
    const index = tileKindIndex(tile);
    const list = counts.get(index);
    if (list) list.push(tile);
    else counts.set(index, [tile]);
  }
  if (counts.size !== 7) return null;
  const pairs: Tile[][] = [];
  for (const list of counts.values()) {
    if (list.length !== 2) return null;
    pairs.push(list);
  }
  return { type: 'chiitoitsu', pairs };
}

const KOKUSHI_INDICES = [
  0, 8, 9, 17, 18, 26, 27, 28, 29, 30, 31, 32, 33,
];

/** 国士無双として成立するか。 */
export function decomposeKokushi(
  tiles: readonly Tile[],
): KokushiDecomposition | null {
  if (tiles.length !== 14) return null;
  const sorted = sortTiles(tiles);
  const counts = countsFromTiles(sorted);
  for (const index of KOKUSHI_INDICES) {
    if (counts[index] < 1) return null;
  }
  let duplicate = 0;
  for (let index = 0; index < 34; index += 1) {
    if (!KOKUSHI_INDICES.includes(index) && counts[index] > 0) return null;
    const extra = counts[index] - (KOKUSHI_INDICES.includes(index) ? 1 : 0);
    if (extra > 0) duplicate += extra;
  }
  if (duplicate !== 1) return null;
  return { type: 'kokushi', tiles: sorted };
}

export function meldToSet(meld: Meld): HandSet {
  const kind: HandSet['kind'] =
    meld.type === 'chi' ? 'run' : meld.type === 'pon' ? 'triplet' : 'kan';
  const added = meld.kanKind === 'added' || meld.kanKind === 'open';
  return {
    kind,
    tiles: sortTiles(meld.tiles),
    open: meld.open || added,
    ...(meld.kanKind ? { kanKind: meld.kanKind } : {}),
  };
}

/** 和了牌がどの面子/雀頭に入るかをすべて列挙する。 */
export function placementsForStandard(
  decomp: StandardDecomposition,
  winTile: Tile,
): WinPlacement[] {
  const placements: WinPlacement[] = [];
  decomp.sets.forEach((set, index) => {
    if (!set.tiles.some((tile) => sameTile(tile, winTile))) return;
    if (set.kind === 'run') {
      placements.push({
        winSet: index,
        wait: classifyRunWait(set.tiles, winTile),
      });
    } else {
      placements.push({ winSet: index, wait: 'shanpon' });
    }
  });
  if (decomp.pair.some((tile) => sameTile(tile, winTile))) {
    placements.push({ winSet: 'pair', wait: 'tanki' });
  }
  const seen = new Set<string>();
  return placements.filter((placement) => {
    const key = `${String(placement.winSet)}:${placement.wait}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/** 順子に和了牌が入るときの待ち形。 */
export function classifyRunWait(
  runTiles: readonly Tile[],
  winTile: Tile,
): WaitType {
  const ranks = [...runTiles.map((tile) => tile.rank)].sort((a, b) => a - b);
  const position = ranks.indexOf(winTile.rank);
  if (position === -1) return 'none';
  if (ranks.length === 3 && position === 1) return 'kanchan';
  const remaining = ranks.filter((_, index) => index !== position);
  if (remaining.length !== 2) return 'none';
  const [low, high] = remaining;
  if (high - low === 1) {
    // 1-2 待ち 3 / 8-9 待ち 7 は辺張、それ以外（2-3 や 7-8）は両面。
    if (low === 1 || high === 9) return 'penchan';
    return 'ryanmen';
  }
  return 'kanchan';
}

/** 手牌（副露含む）から和了形の候補をすべて返す。 */
export function decomposeHand(
  concealed: readonly Tile[],
  melds: readonly Meld[],
): Decomposition[] {
  const results: Decomposition[] = [];
  if (melds.length === 0) {
    const kokushi = decomposeKokushi(concealed);
    if (kokushi) results.push(kokushi);
    const chiitoitsu = decomposeChiitoitsu(concealed);
    if (chiitoitsu) results.push(chiitoitsu);
  }

  const meldSets = melds.map(meldToSet);
  for (const decomp of decomposeStandard(concealed)) {
    results.push({
      type: 'standard',
      sets: [...meldSets, ...decomp.sets],
      pair: decomp.pair,
    });
  }
  return results;
}
