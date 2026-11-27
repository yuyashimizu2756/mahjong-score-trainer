import type {
  Difficulty,
  Meld,
  Problem,
  ScoreInput,
  ScoreResult,
  Suit,
  Tile,
  WinContext,
} from './types';
import { computeScore } from './score';
import { makeTile, sortTiles } from './tiles';

export type Rng = () => number;

/** mulberry32。同じ seed から常に同じ乱数列を返す。 */
export function mulberry32(seed: number): Rng {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function randInt(rng: Rng, min: number, max: number): number {
  return min + Math.floor(rng() * (max - min + 1));
}

function pick<T>(rng: Rng, items: readonly T[]): T {
  return items[randInt(rng, 0, items.length - 1)];
}

function chance(rng: Rng, probability: number): boolean {
  return rng() < probability;
}

function shuffle<T>(rng: Rng, items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = randInt(rng, 0, i);
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

interface DifficultyConfig {
  minYakuHan: number;
  maxYakuHan: number;
  minDora: number;
  maxDora: number;
  maxOpen: number;
  allowKan: boolean;
  allowRiichi: boolean;
  allowSpecial: boolean;
  maxHonba: number;
  maxRiichiSticks: number;
  maxDoraIndicators: number;
}

const DIFFICULTY_CONFIG: Record<Difficulty, DifficultyConfig> = {
  beginner: {
    minYakuHan: 1,
    maxYakuHan: 2,
    minDora: 0,
    maxDora: 0,
    maxOpen: 0,
    allowKan: false,
    allowRiichi: false,
    allowSpecial: false,
    maxHonba: 0,
    maxRiichiSticks: 0,
    maxDoraIndicators: 0,
  },
  standard: {
    minYakuHan: 1,
    maxYakuHan: 3,
    minDora: 0,
    maxDora: 1,
    maxOpen: 1,
    allowKan: false,
    allowRiichi: true,
    allowSpecial: false,
    maxHonba: 0,
    maxRiichiSticks: 0,
    maxDoraIndicators: 1,
  },
  advanced: {
    minYakuHan: 1,
    maxYakuHan: 6,
    minDora: 0,
    maxDora: 3,
    maxOpen: 2,
    allowKan: true,
    allowRiichi: true,
    allowSpecial: true,
    maxHonba: 3,
    maxRiichiSticks: 2,
    maxDoraIndicators: 3,
  },
};

type SetKind = 'run' | 'triplet' | 'kan';

interface PlannedSet {
  kind: SetKind;
  tiles: Tile[];
  open: boolean;
}

interface PlannedHand {
  sets: PlannedSet[];
  pair: Tile[];
}

function randomNumericTile(rng: Rng, suit?: Suit): Tile {
  const chosenSuit = suit ?? pick(rng, ['m', 'p', 's'] as const);
  let rank: number;
  if (chance(rng, 0.2)) rank = chance(rng, 0.5) ? 1 : 9;
  else rank = randInt(rng, 2, 8);
  return makeTile(chosenSuit, rank);
}

function randomPairTile(rng: Rng, flushSuit: Suit | null): Tile {
  if (!flushSuit && chance(rng, 0.25)) {
    if (chance(rng, 0.55)) return makeTile('z', randInt(rng, 5, 7));
    return makeTile('z', randInt(rng, 1, 4));
  }
  return randomNumericTile(rng, flushSuit ?? undefined);
}

function randomTripletTile(rng: Rng, flushSuit: Suit | null): Tile {
  if (!flushSuit && chance(rng, 0.22)) {
    if (chance(rng, 0.55)) return makeTile('z', randInt(rng, 5, 7));
    return makeTile('z', randInt(rng, 1, 4));
  }
  return randomNumericTile(rng, flushSuit ?? undefined);
}

function countKey(tile: Tile): string {
  return `${tile.suit}${tile.rank}`;
}

function canAdd(tiles: readonly Tile[], counts: Map<string, number>): boolean {
  const needed = new Map<string, number>();
  for (const tile of tiles) {
    const key = countKey(tile);
    needed.set(key, (needed.get(key) ?? 0) + 1);
  }
  for (const [key, count] of needed) {
    if ((counts.get(key) ?? 0) + count > 4) return false;
  }
  return true;
}

function addCounts(tiles: readonly Tile[], counts: Map<string, number>): void {
  for (const tile of tiles) {
    counts.set(countKey(tile), (counts.get(countKey(tile)) ?? 0) + 1);
  }
}

function planStandardHand(
  rng: Rng,
  difficulty: Difficulty,
): PlannedHand | null {
  const config = DIFFICULTY_CONFIG[difficulty];
  const flushSuit = chance(rng, 0.14)
    ? pick(rng, ['m', 'p', 's'] as const)
    : null;
  const counts = new Map<string, number>();
  const sets: PlannedSet[] = [];
  let usedKan = false;

  for (let i = 0; i < 4; i += 1) {
    const wantKan =
      config.allowKan && !usedKan && chance(rng, 0.14);
    if (wantKan) {
      const tile = randomTripletTile(rng, flushSuit);
      const tiles = [tile, { ...tile }, { ...tile }, { ...tile }];
      if (!canAdd(tiles, counts)) return null;
      addCounts(tiles, counts);
      sets.push({ kind: 'kan', tiles, open: false });
      usedKan = true;
      continue;
    }

    const wantRun = chance(rng, 0.52);
    if (wantRun) {
      const suit = flushSuit ?? pick(rng, ['m', 'p', 's'] as const);
      const start = randInt(rng, 1, 7);
      const tiles = [
        makeTile(suit, start),
        makeTile(suit, start + 1),
        makeTile(suit, start + 2),
      ];
      if (!canAdd(tiles, counts)) return null;
      addCounts(tiles, counts);
      sets.push({ kind: 'run', tiles, open: false });
    } else {
      const tile = randomTripletTile(rng, flushSuit);
      const tiles = [tile, { ...tile }, { ...tile }];
      if (!canAdd(tiles, counts)) return null;
      addCounts(tiles, counts);
      sets.push({ kind: 'triplet', tiles, open: false });
    }
  }

  const pairTile = randomPairTile(rng, flushSuit);
  const pair = [pairTile, { ...pairTile }];
  if (!canAdd(pair, counts)) return null;
  addCounts(pair, counts);

  return { sets, pair };
}

function planChiitoitsu(rng: Rng): Tile[] {
  const used = new Set<string>();
  const pairs: Tile[][] = [];
  let guard = 0;
  while (pairs.length < 7 && guard < 200) {
    guard += 1;
    const tile = randomPairTile(rng, null);
    const key = countKey(tile);
    if (used.has(key)) continue;
    used.add(key);
    pairs.push([tile, { ...tile }]);
  }
  if (pairs.length !== 7) return [];
  const tiles = pairs.flat();
  const redSuits = new Set<Suit>();
  for (const tile of tiles) {
    if (tile.suit === 'z' || tile.rank !== 5) continue;
    if (redSuits.has(tile.suit)) continue;
    if (chance(rng, 0.07)) {
      tile.red = true;
      redSuits.add(tile.suit);
    }
  }
  return tiles;
}

const ORPHAN_KINDS: Array<[Suit, number]> = [
  ['m', 1],
  ['m', 9],
  ['p', 1],
  ['p', 9],
  ['s', 1],
  ['s', 9],
  ['z', 1],
  ['z', 2],
  ['z', 3],
  ['z', 4],
  ['z', 5],
  ['z', 6],
  ['z', 7],
];

function planKokushi(rng: Rng): Tile[] {
  const tiles = ORPHAN_KINDS.map(([suit, rank]) => makeTile(suit, rank));
  const duplicate = pick(rng, ORPHAN_KINDS);
  tiles.push(makeTile(duplicate[0], duplicate[1]));
  return shuffle(rng, tiles);
}

function buildSpecialCandidate(
  rng: Rng,
  difficulty: Difficulty,
  tiles: readonly Tile[],
): ScoreInput | null {
  if (tiles.length !== 14) return null;
  const winTile = pick(rng, tiles);
  const ctx = buildContext(rng, difficulty, true, false);
  return {
    concealed: sortTiles(tiles),
    melds: [],
    winTile,
    ctx,
  };
}

function applyRedFives(
  rng: Rng,
  sets: PlannedSet[],
  pair: Tile[],
  allowRed: boolean,
): void {
  if (!allowRed) return;
  const allTiles = [...sets.flatMap((set) => set.tiles), ...pair];
  const seenSuits = new Set<Suit>();
  for (const tile of allTiles) {
    if (tile.suit === 'z' || tile.rank !== 5) continue;
    if (seenSuits.has(tile.suit)) continue;
    if (chance(rng, 0.07)) {
      tile.red = true;
      seenSuits.add(tile.suit);
    }
  }
}

function buildMeldsAndConcealed(hand: PlannedHand): {
  melds: Meld[];
  concealed: Tile[];
} {
  const melds: Meld[] = [];
  const concealedTiles: Tile[] = [];

  for (const set of hand.sets) {
    if (set.kind === 'kan') {
      melds.push({
        type: 'kan',
        tiles: set.tiles,
        open: set.open,
        kanKind: set.open ? 'open' : 'closed',
      });
      continue;
    }
    if (set.open) {
      melds.push({
        type: set.kind === 'run' ? 'chi' : 'pon',
        tiles: set.tiles,
        open: true,
      });
    } else {
      concealedTiles.push(...set.tiles);
    }
  }
  concealedTiles.push(...hand.pair);
  return { melds, concealed: concealedTiles };
}

function chooseOpenSets(rng: Rng, hand: PlannedHand, maxOpen: number): void {
  if (maxOpen <= 0) return;
  let openCount: number;
  if (maxOpen === 1) openCount = chance(rng, 0.4) ? 1 : 0;
  else openCount = pick(rng, [0, 1, 1, 2, 2]);

  const candidates = shuffle(
    rng,
    hand.sets.map((_, index) => index),
  );
  for (const index of candidates.slice(0, openCount)) {
    hand.sets[index].open = true;
  }
}

function randomIndicator(rng: Rng): Tile {
  if (chance(rng, 0.2)) return makeTile('z', randInt(rng, 1, 7));
  return randomNumericTile(rng);
}

function buildContext(
  rng: Rng,
  difficulty: Difficulty,
  closed: boolean,
  hasKan: boolean,
): WinContext {
  const config = DIFFICULTY_CONFIG[difficulty];
  const seatWind = randInt(rng, 1, 4) as 1 | 2 | 3 | 4;
  const roundWind = randInt(rng, 1, 4) as 1 | 2 | 3 | 4;
  let tsumo = chance(rng, 0.5);

  const riichiAllowed = config.allowRiichi && closed;
  let riichi = riichiAllowed && chance(rng, difficulty === 'advanced' ? 0.5 : 0.4);
  let doubleRiichi = false;
  if (riichi && difficulty === 'advanced' && chance(rng, 0.12)) {
    riichi = false;
    doubleRiichi = true;
  }

  let ippatsu = false;
  let haitei = false;
  let houtei = false;
  let rinshan = false;
  let chankan = false;

  if (config.allowSpecial) {
    if ((riichi || doubleRiichi) && chance(rng, 0.25)) ippatsu = true;

    if (hasKan && tsumo && chance(rng, 0.25)) {
      rinshan = true;
    } else if (!tsumo && chance(rng, 0.08)) {
      chankan = true;
    } else if (tsumo && chance(rng, 0.06)) {
      haitei = true;
    } else if (!tsumo && chance(rng, 0.06)) {
      houtei = true;
    }
  }

  const doraCount =
    difficulty === 'beginner'
      ? 0
      : difficulty === 'standard'
        ? 1
        : randInt(rng, 1, config.maxDoraIndicators);
  const doraIndicators = Array.from({ length: doraCount }, () =>
    randomIndicator(rng),
  );

  let uraIndicators: Tile[] | undefined;
  if ((riichi || doubleRiichi) && chance(rng, difficulty === 'advanced' ? 0.5 : 0.3)) {
    const count = difficulty === 'advanced' ? randInt(rng, 1, 2) : 1;
    uraIndicators = Array.from({ length: count }, () => randomIndicator(rng));
  }

  return {
    tsumo,
    seatWind,
    roundWind,
    riichi,
    doubleRiichi,
    ippatsu,
    haitei,
    houtei,
    rinshan,
    chankan,
    doraIndicators,
    uraIndicators,
    honba:
      difficulty === 'advanced' && chance(rng, 0.35)
        ? randInt(rng, 1, config.maxHonba)
        : 0,
    riichiSticks:
      difficulty === 'advanced' && chance(rng, 0.25)
        ? randInt(rng, 1, config.maxRiichiSticks)
        : 0,
  };
}

function buildCandidate(
  rng: Rng,
  difficulty: Difficulty,
): ScoreInput | null {
  const config = DIFFICULTY_CONFIG[difficulty];
  const roll = rng();
  if (difficulty === 'advanced' && roll < 0.02) {
    const candidates = planKokushi(rng);
    return buildSpecialCandidate(rng, difficulty, candidates);
  }
  if (
    difficulty !== 'beginner' &&
    roll < (difficulty === 'advanced' ? 0.1 : 0.08)
  ) {
    const candidates = planChiitoitsu(rng);
    return buildSpecialCandidate(rng, difficulty, candidates);
  }

  const planned = planStandardHand(rng, difficulty);
  if (!planned) return null;

  applyRedFives(rng, planned.sets, planned.pair, difficulty !== 'beginner');

  chooseOpenSets(rng, planned, config.maxOpen);
  const { melds, concealed } = buildMeldsAndConcealed(planned);

  if (concealed.length === 0) return null;
  const winTile = pick(rng, concealed);
  const hasKan = melds.some((meld) => meld.type === 'kan');
  const closed = melds.every((meld) => !meld.open);
  const ctx = buildContext(rng, difficulty, closed, hasKan);

  return {
    concealed: sortTiles(concealed),
    melds,
    winTile,
    ctx,
  };
}

function tagsOf(answer: ScoreResult): string[] {
  const ids: string[] = [];
  for (const hit of answer.yaku) {
    if (!ids.includes(hit.id)) ids.push(hit.id);
  }
  return ids;
}

function hintOf(answer: ScoreResult): { yaku: string[]; fu: string } {
  return {
    yaku: answer.yaku.map((hit) => hit.name),
    fu: answer.fuItems.map((item) => `${item.label} +${item.fu}`).join(' / '),
  };
}

function isAcceptable(
  answer: ScoreResult,
  difficulty: Difficulty,
  avoidTags: readonly string[],
): boolean {
  const config = DIFFICULTY_CONFIG[difficulty];
  const tags = tagsOf(answer);
  if (avoidTags.some((tag) => tags.includes(tag))) return false;
  if (answer.yakumanCount > 0) {
    // 国士無双（上級のみ）は役満として許可する。
    return difficulty === 'advanced';
  }
  if (answer.yakuHan < config.minYakuHan) return false;
  if (answer.yakuHan > config.maxYakuHan) return false;
  if (answer.doraHan < config.minDora) return false;
  if (answer.doraHan > config.maxDora) return false;
  return true;
}

function fallbackInput(difficulty: Difficulty, seed: number): ScoreInput {
  const tsumo = difficulty === 'beginner';
  const riichi = difficulty !== 'beginner';
  return {
    concealed: [
      makeTile('m', 1),
      makeTile('m', 2),
      makeTile('m', 3),
      makeTile('p', 4),
      makeTile('p', 5),
      makeTile('p', 6),
      makeTile('p', 7),
      makeTile('p', 8),
      makeTile('p', 9),
      makeTile('s', 2),
      makeTile('s', 3),
      makeTile('s', 4),
      makeTile('s', 5),
      makeTile('s', 5),
    ],
    melds: [],
    winTile: makeTile('s', 2),
    ctx: {
      tsumo,
      seatWind: ((seed % 4) + 1) as 1 | 2 | 3 | 4,
      roundWind: 1,
      riichi,
      doraIndicators: [],
      honba: 0,
      riichiSticks: 0,
    },
  };
}

/** 難易度と seed から決定的に問題を生成する。 */
export function generateProblem(opts: {
  difficulty: Difficulty;
  seed?: number;
  avoidTags?: string[];
}): Problem {
  const difficulty = opts.difficulty;
  const seed = opts.seed ?? Date.now();
  const avoidTags = opts.avoidTags ?? [];
  const maxAttempts = 2000;

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const rng = mulberry32((seed + attempt * 0x9e3779b9) >>> 0);
    const input = buildCandidate(rng, difficulty);
    if (!input) continue;
    const answer = computeScore(input);
    if (!answer.ok) continue;
    if (!isAcceptable(answer, difficulty, avoidTags)) continue;
    return {
      id: `mst-${difficulty}-${seed}-${attempt}`,
      difficulty,
      input,
      answer,
      tags: tagsOf(answer),
      hint: hintOf(answer),
    };
  }

  const fallback = fallbackInput(difficulty, seed);
  const answer = computeScore(fallback);
  if (!answer.ok) {
    throw new Error('fallback problem generation failed');
  }
  return {
    id: `mst-${difficulty}-${seed}-fallback`,
    difficulty,
    input: fallback,
    answer,
    tags: tagsOf(answer),
    hint: hintOf(answer),
  };
}
