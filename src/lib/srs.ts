import { STORAGE_KEYS, getStorage, writeJson } from './storage';

/** 暗記ドリルの種類。 */
export type DrillKind = 'score' | 'fu' | 'han' | 'payment';

export const DRILL_KINDS: readonly DrillKind[] = [
  'score',
  'fu',
  'han',
  'payment',
] as const;

export const DRILL_SESSION_SIZE = 10;
export const MAX_SRS_LEVEL = 5;
export const DAY_MS = 86_400_000;

/**
 * 1 セッションで期限前の既習カードから補充する上限。
 * 期限が来ていないカードだけで 10 問を埋めると、新規カードが
 * いつまでも出題されないため、既習の補充は少数に留める。
 */
export const REVIEW_QUOTA = 3;

/**
 * 復習間隔（日）。level 1 以上は「その level に到達した直後の間隔」を表す。
 * level 0（新規）と level 1 は翌日、以後 3 / 7 / 14 / 30 日。
 */
export const SRS_INTERVALS = [1, 3, 7, 14, 30] as const;

export interface DrillCard {
  id: string;
  kind: DrillKind;
  /** 0〜5。正解で +1、誤答で 0。 */
  level: number;
  /** 次回出題時刻（epoch ms）。 */
  dueAt: number;
  correct: number;
  total: number;
}

export interface DrillDayRecord {
  total: number;
  correct: number;
}

export interface DrillStats {
  total: number;
  correct: number;
  streak: number;
  bestStreak: number;
  byDay: Record<string, DrillDayRecord>;
}

export interface DrillState {
  cards: Record<string, DrillCard>;
  stats: DrillStats;
}

export const DEFAULT_DRILL_STATS: DrillStats = {
  total: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  byDay: {},
};

export function defaultDrillState(): DrillState {
  return { cards: {}, stats: { ...DEFAULT_DRILL_STATS, byDay: {} } };
}

/**
 * level に対応する復習間隔（日）。
 * level 0（新規）と 1 は 1 日、2 は 3 日、3 は 7 日、4 は 14 日、5 は 30 日。
 */
export function intervalDays(level: number): number {
  const clamped = Math.min(Math.max(Math.trunc(level), 0), MAX_SRS_LEVEL);
  if (clamped <= 1) return SRS_INTERVALS[0];
  return SRS_INTERVALS[clamped - 1];
}

export function createDrillCard(
  id: string,
  kind: DrillKind,
  now = Date.now(),
): DrillCard {
  return { id, kind, level: 0, dueAt: now, correct: 0, total: 0 };
}

/** 1 回の回答を反映する。正解で level+1（最大 5）、誤答で 0。 */
export function reviewDrillCard(
  card: DrillCard,
  correct: boolean,
  now = Date.now(),
): DrillCard {
  const level = correct
    ? Math.min(MAX_SRS_LEVEL, card.level + 1)
    : 0;
  return {
    ...card,
    level,
    dueAt: now + intervalDays(level) * DAY_MS,
    correct: card.correct + (correct ? 1 : 0),
    total: card.total + 1,
  };
}

export function isDue(card: DrillCard, now = Date.now()): boolean {
  return card.dueAt <= now;
}

export interface DrillPoolItem {
  id: string;
  kind: DrillKind;
}

export interface DrillSessionPick extends DrillPoolItem {
  /** due: 期限到来 / review: 未到来の既習 / new: 未学習。 */
  source: 'due' | 'review' | 'new';
  level: number;
}

export interface PickSessionOptions {
  cards: Record<string, DrillCard>;
  pool: readonly DrillPoolItem[];
  now: number;
  size?: number;
  excludeId?: string;
  random?: () => number;
}

function shuffleWith<T>(items: readonly T[], random: () => number): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

/**
 * 1 セッション分の出題を選ぶ。
 * 期限が来たカード → 期限前の既習カード（level が低い順・最大 REVIEW_QUOTA 問）
 * → 未学習、の順。既習だけで 10 問を埋めず、新規が必ず混ざるようにする。
 */
export function pickDrillSession({
  cards,
  pool,
  now,
  size = DRILL_SESSION_SIZE,
  excludeId,
  random = Math.random,
}: PickSessionOptions): DrillSessionPick[] {
  const seen = new Set<string>();
  const unique: DrillPoolItem[] = [];
  for (const item of pool) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    if (item.id === excludeId) continue;
    unique.push(item);
  }

  const due: DrillSessionPick[] = [];
  const review: DrillSessionPick[] = [];
  const fresh: DrillPoolItem[] = [];

  for (const item of unique) {
    const card = cards[item.id];
    if (!card) {
      fresh.push(item);
      continue;
    }
    const pick: DrillSessionPick = {
      ...item,
      source: isDue(card, now) ? 'due' : 'review',
      level: card.level,
    };
    if (pick.source === 'due') due.push(pick);
    else review.push(pick);
  }

  due.sort((a, b) => {
    const cardA = cards[a.id];
    const cardB = cards[b.id];
    if (cardA.dueAt !== cardB.dueAt) return cardA.dueAt - cardB.dueAt;
    if (a.level !== b.level) return a.level - b.level;
    return a.id.localeCompare(b.id);
  });

  review.sort((a, b) => {
    if (a.level !== b.level) return a.level - b.level;
    const cardA = cards[a.id];
    const cardB = cards[b.id];
    if (cardA.dueAt !== cardB.dueAt) return cardA.dueAt - cardB.dueAt;
    return a.id.localeCompare(b.id);
  });

  const freshPicks: DrillSessionPick[] = shuffleWith(fresh, random).map(
    (item) => ({ ...item, source: 'new', level: 0 }),
  );

  const selected: DrillSessionPick[] = [];
  const limit = Math.max(0, size);
  for (const pick of due) {
    if (selected.length >= limit) break;
    selected.push(pick);
  }

  // 期限前の既習は少数だけ。残りは新規カードで埋める。
  const reviewQuota = Math.min(REVIEW_QUOTA, Math.max(0, limit - selected.length));
  selected.push(...review.slice(0, reviewQuota));
  selected.push(...freshPicks.slice(0, Math.max(0, limit - selected.length)));

  // 新規を使い切っても足りない場合は、残りの既習で補充する。
  if (selected.length < limit) {
    selected.push(
      ...review.slice(reviewQuota, reviewQuota + (limit - selected.length)),
    );
  }

  return selected;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDrillKind(value: unknown): value is DrillKind {
  return (
    value === 'score' ||
    value === 'fu' ||
    value === 'han' ||
    value === 'payment'
  );
}

function isCount(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0;
}

function isDrillCard(value: unknown): value is DrillCard {
  if (!isRecord(value)) return false;
  if (typeof value.id !== 'string' || !isDrillKind(value.kind)) return false;
  if (!isCount(value.level) || value.level > MAX_SRS_LEVEL) return false;
  if (value.level !== Math.trunc(value.level)) return false;
  if (!isCount(value.dueAt)) return false;
  if (!isCount(value.correct) || !isCount(value.total)) return false;
  return value.correct <= value.total;
}

function isDrillDayRecord(value: unknown): value is DrillDayRecord {
  return (
    isRecord(value) &&
    isCount(value.total) &&
    isCount(value.correct) &&
    value.correct <= value.total
  );
}

export function isDrillState(value: unknown): value is DrillState {
  if (!isRecord(value) || !isRecord(value.cards)) return false;
  if (!Object.values(value.cards).every(isDrillCard)) return false;
  const stats = value.stats;
  if (!isRecord(stats)) return false;
  if (
    !isCount(stats.total) ||
    !isCount(stats.correct) ||
    !isCount(stats.streak) ||
    !isCount(stats.bestStreak)
  ) {
    return false;
  }
  if (stats.correct > stats.total) return false;
  if (!isRecord(stats.byDay)) return false;
  return Object.values(stats.byDay).every(isDrillDayRecord);
}

/** `mst:v1:drill` を読む。壊れていれば初期化する。 */
export function loadDrill(): DrillState {
  const storage = getStorage();
  if (!storage) return defaultDrillState();
  let raw: string | null = null;
  try {
    raw = storage.getItem(STORAGE_KEYS.drill);
  } catch {
    return defaultDrillState();
  }
  if (raw === null) return defaultDrillState();
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw) as unknown;
  } catch {
    try {
      storage.removeItem(STORAGE_KEYS.drill);
    } catch {
      // 失敗しても初期値で続行する。
    }
    return defaultDrillState();
  }
  if (!isDrillState(parsed)) {
    try {
      storage.removeItem(STORAGE_KEYS.drill);
    } catch {
      // 失敗しても初期値で続行する。
    }
    return defaultDrillState();
  }
  return {
    cards: { ...parsed.cards },
    stats: {
      ...parsed.stats,
      byDay: { ...parsed.stats.byDay },
    },
  };
}

export function saveDrill(state: DrillState): boolean {
  return writeJson(STORAGE_KEYS.drill, state);
}

/** 1 問の回答を状態へ反映する（純粋関数）。 */
export function applyDrillAnswer(
  state: DrillState,
  params: {
    id: string;
    kind: DrillKind;
    correct: boolean;
    now?: number;
    day?: string;
  },
): DrillState {
  const now = params.now ?? Date.now();
  const day = params.day ?? '';
  const existing =
    state.cards[params.id] ?? createDrillCard(params.id, params.kind, now);
  const card = reviewDrillCard(existing, params.correct, now);
  const streak = params.correct ? state.stats.streak + 1 : 0;
  const dayRecord = state.stats.byDay[day] ?? { total: 0, correct: 0 };
  return {
    cards: { ...state.cards, [card.id]: card },
    stats: {
      total: state.stats.total + 1,
      correct: state.stats.correct + (params.correct ? 1 : 0),
      streak,
      bestStreak: Math.max(state.stats.bestStreak, streak),
      byDay: {
        ...state.stats.byDay,
        [day]: {
          total: dayRecord.total + 1,
          correct: dayRecord.correct + (params.correct ? 1 : 0),
        },
      },
    },
  };
}
