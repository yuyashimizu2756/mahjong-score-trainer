import type {
  Tile,
  WinContext,
  YakuHit,
} from './types';
import type { HandSet, StandardDecomposition, WinPlacement } from './decompose';
import { isPinfuShape } from './fu';
import { isHonor, isSimple, isTerminal, isTerminalOrHonor } from './tiles';

export interface YakuEvaluation {
  hits: YakuHit[];
  /** 役のみの翻（役満時は 0）。 */
  yakuHan: number;
  /** 役満の倍数（ダブル役満は 2）。 */
  yakumanCount: number;
}

function isTripletLike(set: HandSet): boolean {
  return set.kind === 'triplet' || set.kind === 'kan';
}

function allTiles(sets: readonly HandSet[], pair: readonly Tile[]): Tile[] {
  return [...sets.flatMap((set) => set.tiles), ...pair];
}

function isConcealedSetForYaku(
  set: HandSet,
  index: number,
  placement: WinPlacement,
  tsumo: boolean,
): boolean {
  if (set.open) return false;
  if (set.kind === 'kan') return true;
  if (!tsumo && placement.winSet === index && set.kind === 'triplet') {
    return false;
  }
  return true;
}

function countConcealedTriplets(
  sets: readonly HandSet[],
  placement: WinPlacement,
  tsumo: boolean,
): number {
  return sets.filter(
    (set, index) =>
      isTripletLike(set) &&
      isConcealedSetForYaku(set, index, placement, tsumo),
  ).length;
}

function runKey(set: HandSet): string {
  return `${set.tiles[0].suit}:${set.tiles[0].rank}`;
}

function isClosed(sets: readonly HandSet[]): boolean {
  return sets.every((set) => !set.open);
}

function isAllHonors(tiles: readonly Tile[]): boolean {
  return tiles.every(isHonor);
}

function isAllTerminals(tiles: readonly Tile[]): boolean {
  return tiles.every(isTerminal);
}

function isAllTerminalOrHonor(tiles: readonly Tile[]): boolean {
  return tiles.every(isTerminalOrHonor);
}

function isAllSimple(tiles: readonly Tile[]): boolean {
  return tiles.every(isSimple);
}

function countSuitKinds(tiles: readonly Tile[]): Set<string> {
  const suits = new Set<string>();
  for (const tile of tiles) {
    if (tile.suit !== 'z') suits.add(tile.suit);
  }
  return suits;
}

function isRyuuiisou(tiles: readonly Tile[]): boolean {
  return tiles.every((tile) => {
    if (tile.suit === 'z') return tile.rank === 6;
    return tile.suit === 's' && [2, 3, 4, 6, 8].includes(tile.rank);
  });
}

/** 九蓮宝燈の判定。純正なら 2（ダブル役満）。 */
function chuurenCount(
  tiles: readonly Tile[],
  winTile: Tile,
  closed: boolean,
): number {
  if (!closed || tiles.length !== 14) return 0;
  if (tiles.some((tile) => tile.suit === 'z')) return 0;
  const suit = tiles[0].suit;
  if (!tiles.every((tile) => tile.suit === suit)) return 0;
  const counts = new Map<number, number>();
  for (const tile of tiles) counts.set(tile.rank, (counts.get(tile.rank) ?? 0) + 1);
  const base = [3, 1, 1, 1, 1, 1, 1, 1, 3];
  let extras = 0;
  for (let rank = 1; rank <= 9; rank += 1) {
    const count = counts.get(rank) ?? 0;
    if (count < base[rank - 1]) return 0;
    extras += count - base[rank - 1];
  }
  if (extras !== 1) return 0;
  // 和了牌を除いた 13 枚が 1112345678999 なら純正九蓮。
  const remaining = new Map(counts);
  remaining.set(winTile.rank, (remaining.get(winTile.rank) ?? 0) - 1);
  const isPure = base.every((count, index) => remaining.get(index + 1) === count);
  return isPure ? 2 : 1;
}

function chiitoitsuYakuman(
  pairTiles: readonly Tile[],
): YakuHit[] {
  if (isAllHonors(pairTiles)) {
    return [{ id: 'tsuuiisou', name: '字一色', han: 0, yakuman: 1 }];
  }
  return [];
}

export interface StandardYakuOptions {
  /** 和了牌（九蓮宝燈の純正判定に使う）。 */
  winTile: Tile;
}

/** 標準形の役を判定する。 */
export function evaluateStandardYaku(
  hand: StandardDecomposition,
  placement: WinPlacement,
  ctx: WinContext,
  options: StandardYakuOptions,
): YakuEvaluation {
  const closed = isClosed(hand.sets);
  const tiles = allTiles(hand.sets, hand.pair);

  const yakuman: YakuHit[] = [];
  const addYakuman = (id: string, name: string, count: 1 | 2 = 1): void => {
    yakuman.push({ id, name, han: 0, yakuman: count });
  };

  const concealedTriplets = countConcealedTriplets(hand.sets, placement, ctx.tsumo);
  if (closed && concealedTriplets === 4) {
    if (placement.wait === 'tanki') addYakuman('suuankouTanki', '四暗刻単騎', 2);
    else addYakuman('suuankou', '四暗刻');
  }

  const dragonTriplets = hand.sets.filter(
    (set) =>
      isTripletLike(set) && isHonor(set.tiles[0]) && set.tiles[0].rank >= 5,
  ).length;
  if (dragonTriplets === 3) addYakuman('daisangen', '大三元');

  if (isAllHonors(tiles)) addYakuman('tsuuiisou', '字一色');
  if (isRyuuiisou(tiles)) addYakuman('ryuuiisou', '緑一色');
  if (isAllTerminals(tiles)) addYakuman('chinroutou', '清老頭');

  const windTriplets = hand.sets.filter(
    (set) =>
      isTripletLike(set) && isHonor(set.tiles[0]) && set.tiles[0].rank <= 4,
  ).length;
  const pairIsWind = isHonor(hand.pair[0]) && hand.pair[0].rank <= 4;
  if (windTriplets === 4) addYakuman('daisuushii', '大四喜', 2);
  else if (windTriplets === 3 && pairIsWind) addYakuman('shousuushii', '小四喜');

  const kanCount = hand.sets.filter((set) => set.kind === 'kan').length;
  if (kanCount === 4) addYakuman('suukantsu', '四槓子');

  const chuuren = chuurenCount(tiles, options.winTile, closed);
  if (chuuren === 2) addYakuman('chuurenPure', '純正九蓮宝燈', 2);
  else if (chuuren === 1) addYakuman('chuuren', '九蓮宝燈');

  if (yakuman.length > 0) {
    const yakumanCount = yakuman.reduce((sum, hit) => sum + (hit.yakuman ?? 0), 0);
    return { hits: yakuman, yakuHan: 0, yakumanCount };
  }

  const hits: YakuHit[] = [];
  const add = (id: string, name: string, han: number): void => {
    hits.push({ id, name, han });
  };

  if (closed && ctx.doubleRiichi) add('doubleRiichi', 'ダブル立直', 2);
  else if (closed && ctx.riichi) add('riichi', '立直', 1);

  const hasRiichi = closed && (ctx.riichi || ctx.doubleRiichi);
  if (hasRiichi && ctx.ippatsu) add('ippatsu', '一発', 1);
  if (closed && ctx.tsumo) add('menzenTsumo', '門前清自摸和', 1);

  const pinfu = isPinfuShape(hand, placement.wait, closed, ctx);
  if (pinfu) add('pinfu', '平和', 1);

  if (isAllSimple(tiles)) add('tanyao', '断幺九', 1);

  if (closed) {
    const runCounts = new Map<string, number>();
    for (const set of hand.sets) {
      if (set.kind !== 'run') continue;
      const key = runKey(set);
      runCounts.set(key, (runCounts.get(key) ?? 0) + 1);
    }
    let pairs = 0;
    for (const count of runCounts.values()) pairs += Math.floor(count / 2);
    if (pairs >= 2) add('ryanpeikou', '二盃口', 3);
    else if (pairs >= 1) add('iipeikou', '一盃口', 1);
  }

  for (const set of hand.sets) {
    if (!isTripletLike(set)) continue;
    const tile = set.tiles[0];
    if (!isHonor(tile)) continue;
    if (tile.rank === 5) add('yakuhaiHaku', '役牌 白', 1);
    if (tile.rank === 6) add('yakuhaiHatsu', '役牌 發', 1);
    if (tile.rank === 7) add('yakuhaiChun', '役牌 中', 1);
    if (tile.rank === ctx.seatWind) add('yakuhaiSeat', '役牌 自風', 1);
    if (tile.rank === ctx.roundWind) add('yakuhaiRound', '役牌 場風', 1);
  }

  if (ctx.rinshan && ctx.tsumo) add('rinshan', '嶺上開花', 1);
  if (ctx.haitei && ctx.tsumo) add('haitei', '海底摸月', 1);
  if (ctx.houtei && !ctx.tsumo) add('houtei', '河底撈魚', 1);
  if (ctx.chankan && !ctx.tsumo) add('chankan', '搶槓', 1);

  // 三色同順
  const runStarts = new Map<string, Set<string>>();
  for (const set of hand.sets) {
    if (set.kind !== 'run') continue;
    const suit = set.tiles[0].suit;
    const rank = set.tiles[0].rank;
    const key = String(rank);
    const suits = runStarts.get(key) ?? new Set<string>();
    suits.add(suit);
    runStarts.set(key, suits);
  }
  for (const suits of runStarts.values()) {
    if (suits.has('m') && suits.has('p') && suits.has('s')) {
      add('sanshokuDoujun', '三色同順', closed ? 2 : 1);
      break;
    }
  }

  // 一気通貫
  for (const suit of ['m', 'p', 's'] as const) {
    const starts = new Set<number>();
    for (const set of hand.sets) {
      if (set.kind === 'run' && set.tiles[0].suit === suit) {
        starts.add(set.tiles[0].rank);
      }
    }
    if (starts.has(1) && starts.has(4) && starts.has(7)) {
      add('ittsu', '一気通貫', closed ? 2 : 1);
      break;
    }
  }

  const groupsTerminal = [...hand.sets.map((set) => set.tiles), hand.pair].every(
    (group) => group.some(isTerminalOrHonor),
  );
  const hasRun = hand.sets.some((set) => set.kind === 'run');
  const hasHonor = tiles.some(isHonor);
  if (groupsTerminal && hasRun) {
    if (hasHonor) add('chanta', '混全帯幺九', closed ? 2 : 1);
    else add('junchan', '純全帯幺九', closed ? 3 : 2);
  }

  if (hand.sets.every((set) => set.kind !== 'run')) add('toitoi', '対々和', 2);

  if (concealedTriplets >= 3) add('sanankou', '三暗刻', 2);
  if (kanCount >= 3) add('sankantsu', '三槓子', 2);

  const pairIsDragon = isHonor(hand.pair[0]) && hand.pair[0].rank >= 5;
  if (dragonTriplets === 2 && pairIsDragon) add('shousangen', '小三元', 2);

  if (isAllTerminalOrHonor(tiles)) add('honroutou', '混老頭', 2);

  const numberSuits = countSuitKinds(tiles);
  if (numberSuits.size === 1) {
    if (hasHonor) add('honitsu', '混一色', closed ? 3 : 2);
    else add('chinitsu', '清一色', closed ? 6 : 5);
  }

  const yakuHan = hits.reduce((sum, hit) => sum + hit.han, 0);
  return { hits, yakuHan, yakumanCount: 0 };
}

/** 七対子の役を判定する。 */
export function evaluateChiitoitsuYaku(
  pairs: readonly Tile[][],
  ctx: WinContext,
): YakuEvaluation {
  const tiles = pairs.flat();
  const yakuman = chiitoitsuYakuman(tiles);
  if (yakuman.length > 0) {
    const yakumanCount = yakuman.reduce(
      (sum, hit) => sum + (hit.yakuman ?? 0),
      0,
    );
    return { hits: yakuman, yakuHan: 0, yakumanCount };
  }

  const hits: YakuHit[] = [];
  const add = (id: string, name: string, han: number): void => {
    hits.push({ id, name, han });
  };

  add('chiitoitsu', '七対子', 2);
  if (ctx.doubleRiichi) add('doubleRiichi', 'ダブル立直', 2);
  else if (ctx.riichi) add('riichi', '立直', 1);
  if ((ctx.riichi || ctx.doubleRiichi) && ctx.ippatsu) add('ippatsu', '一発', 1);
  if (ctx.tsumo) add('menzenTsumo', '門前清自摸和', 1);
  if (isAllSimple(tiles)) add('tanyao', '断幺九', 1);
  if (isAllTerminalOrHonor(tiles)) add('honroutou', '混老頭', 2);

  const numberSuits = countSuitKinds(tiles);
  if (numberSuits.size === 1) {
    if (tiles.some(isHonor)) add('honitsu', '混一色', 3);
    else add('chinitsu', '清一色', 6);
  }

  if (ctx.rinshan && ctx.tsumo) add('rinshan', '嶺上開花', 1);
  if (ctx.haitei && ctx.tsumo) add('haitei', '海底摸月', 1);
  if (ctx.houtei && !ctx.tsumo) add('houtei', '河底撈魚', 1);
  if (ctx.chankan && !ctx.tsumo) add('chankan', '搶槓', 1);

  const yakuHan = hits.reduce((sum, hit) => sum + hit.han, 0);
  return { hits, yakuHan, yakumanCount: 0 };
}

/** 国士無双の役。 */
export function evaluateKokushiYaku(): YakuEvaluation {
  return {
    hits: [{ id: 'kokushi', name: '国士無双', han: 0, yakuman: 1 }],
    yakuHan: 0,
    yakumanCount: 1,
  };
}

