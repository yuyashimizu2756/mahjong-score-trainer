import type {
  Difficulty,
  ScoreInput,
  ScoreResult,
} from '../engine/types';

export const SCHEMA_VERSION = 1;
export const STORAGE_PREFIX = 'mst:v1:';

export const STORAGE_KEYS = {
  schema: `${STORAGE_PREFIX}schema`,
  settings: `${STORAGE_PREFIX}settings`,
  stats: `${STORAGE_PREFIX}stats`,
  review: `${STORAGE_PREFIX}review`,
  learn: `${STORAGE_PREFIX}learn`,
} as const;

export interface Settings {
  answerMode: 'choice' | 'step';
  defaultDifficulty: Difficulty;
  tileSize: 'sm' | 'md' | 'lg';
  colorBlindSuits: boolean;
  reduceMotion: boolean;
}

export interface DayRecord {
  total: number;
  correct: number;
}

export interface Stats {
  total: number;
  correct: number;
  streak: number;
  bestStreak: number;
  byYaku: Record<string, DayRecord>;
  byDay: Record<string, DayRecord>;
}

export interface ReviewItem {
  id: string;
  input: ScoreInput;
  answer: ScoreResult;
  tags: string[];
  misses: number;
  addedAt: number;
}

export interface LessonProgress {
  completed: boolean;
  quizCorrect: number;
  quizTotal: number;
}

export interface LearnProgress {
  lessons: Record<string, LessonProgress>;
}

export const DEFAULT_SETTINGS: Settings = {
  answerMode: 'choice',
  defaultDifficulty: 'beginner',
  tileSize: 'md',
  colorBlindSuits: true,
  reduceMotion: false,
};

export const DEFAULT_STATS: Stats = {
  total: 0,
  correct: 0,
  streak: 0,
  bestStreak: 0,
  byYaku: {},
  byDay: {},
};

export const DEFAULT_LEARN: LearnProgress = { lessons: {} };

export const MAX_REVIEW_ITEMS = 100;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 'beginner' || value === 'standard' || value === 'advanced';
}

function isDayRecord(value: unknown): value is DayRecord {
  return (
    isRecord(value) &&
    typeof value.total === 'number' &&
    Number.isFinite(value.total) &&
    typeof value.correct === 'number' &&
    Number.isFinite(value.correct)
  );
}

function isSettings(value: unknown): value is Settings {
  if (!isRecord(value)) return false;
  const mode = value.answerMode;
  const size = value.tileSize;
  return (
    (mode === 'choice' || mode === 'step') &&
    isDifficulty(value.defaultDifficulty) &&
    (size === 'sm' || size === 'md' || size === 'lg') &&
    typeof value.colorBlindSuits === 'boolean' &&
    typeof value.reduceMotion === 'boolean'
  );
}

function isStats(value: unknown): value is Stats {
  if (!isRecord(value)) return false;
  if (
    typeof value.total !== 'number' ||
    typeof value.correct !== 'number' ||
    typeof value.streak !== 'number' ||
    typeof value.bestStreak !== 'number'
  ) {
    return false;
  }
  if (value.total < 0 || value.correct < 0 || value.correct > value.total) {
    return false;
  }
  if (!isRecord(value.byYaku) || !isRecord(value.byDay)) return false;
  return (
    Object.values(value.byYaku).every(isDayRecord) &&
    Object.values(value.byDay).every(isDayRecord)
  );
}

function isScoreInput(value: unknown): value is ScoreInput {
  return (
    isRecord(value) &&
    Array.isArray(value.concealed) &&
    Array.isArray(value.melds) &&
    isRecord(value.winTile) &&
    isRecord(value.ctx)
  );
}

function isScoreResult(value: unknown): value is ScoreResult {
  return (
    isRecord(value) &&
    value.ok === true &&
    typeof value.han === 'number' &&
    typeof value.fu === 'number' &&
    Array.isArray(value.yaku) &&
    Array.isArray(value.fuItems) &&
    isRecord(value.payments)
  );
}

function isReviewItem(value: unknown): value is ReviewItem {
  return (
    isRecord(value) &&
    typeof value.id === 'string' &&
    isScoreInput(value.input) &&
    isScoreResult(value.answer) &&
    Array.isArray(value.tags) &&
    value.tags.every((tag) => typeof tag === 'string') &&
    typeof value.misses === 'number' &&
    typeof value.addedAt === 'number'
  );
}

function isReview(value: unknown): value is ReviewItem[] {
  return Array.isArray(value) && value.every(isReviewItem);
}

function isLearnProgress(value: unknown): value is LearnProgress {
  if (!isRecord(value) || !isRecord(value.lessons)) return false;
  return Object.values(value.lessons).every(
    (lesson) =>
      isRecord(lesson) &&
      typeof lesson.completed === 'boolean' &&
      typeof lesson.quizCorrect === 'number' &&
      typeof lesson.quizTotal === 'number',
  );
}

/** テストや SSR でも安全に使える storage 取得。 */
export function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined') return null;
    const storage = window.localStorage;
    if (!storage) return null;
    return storage;
  } catch {
    return null;
  }
}

function readJson(key: string): unknown {
  const storage = getStorage();
  if (!storage) return undefined;
  let raw: string | null = null;
  try {
    raw = storage.getItem(key);
  } catch {
    return undefined;
  }
  if (raw === null) return undefined;
  try {
    return JSON.parse(raw) as unknown;
  } catch {
    // 壊れた JSON は初期化して継続する。
    removeKey(key);
    return undefined;
  }
}

function removeKey(key: string): void {
  const storage = getStorage();
  if (!storage) return;
  try {
    storage.removeItem(key);
  } catch {
    // 失敗しても例外は投げない。
  }
}

export function writeJson(key: string, value: unknown): boolean {
  const storage = getStorage();
  if (!storage) return false;
  try {
    storage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    // 容量超過・プライベートブラウズ等でも落とさない。
    return false;
  }
}

/** スキーマ版を確認し、不一致なら名前空間を初期化する。 */
export function initStorage(): void {
  const storage = getStorage();
  if (!storage) return;
  let version: number | null = null;
  try {
    const raw = storage.getItem(STORAGE_KEYS.schema);
    version = raw === null ? null : Number(raw);
  } catch {
    version = null;
  }
  if (version === SCHEMA_VERSION) return;

  // 旧版・未初期化。壊れた残骸を掃除してから版を書き込む。
  try {
    const keys: string[] = [];
    for (let i = 0; i < storage.length; i += 1) {
      const key = storage.key(i);
      if (key && key.startsWith(STORAGE_PREFIX)) keys.push(key);
    }
    for (const key of keys) storage.removeItem(key);
  } catch {
    // 掃除に失敗しても続行する。
  }
  try {
    storage.setItem(STORAGE_KEYS.schema, String(SCHEMA_VERSION));
  } catch {
    // 書き込めなくてもメモリ上で動き続ける。
  }
}

export function loadSettings(): Settings {
  const value = readJson(STORAGE_KEYS.settings);
  if (isSettings(value)) return { ...DEFAULT_SETTINGS, ...value };
  if (value !== undefined) removeKey(STORAGE_KEYS.settings);
  return { ...DEFAULT_SETTINGS };
}

export function saveSettings(settings: Settings): boolean {
  return writeJson(STORAGE_KEYS.settings, settings);
}

export function loadStats(): Stats {
  const value = readJson(STORAGE_KEYS.stats);
  if (isStats(value)) {
    return {
      ...DEFAULT_STATS,
      ...value,
      byYaku: { ...value.byYaku },
      byDay: { ...value.byDay },
    };
  }
  if (value !== undefined) removeKey(STORAGE_KEYS.stats);
  return { ...DEFAULT_STATS, byYaku: {}, byDay: {} };
}

export function saveStats(stats: Stats): boolean {
  return writeJson(STORAGE_KEYS.stats, stats);
}

export function loadReview(): ReviewItem[] {
  const value = readJson(STORAGE_KEYS.review);
  if (isReview(value)) {
    return value.slice(0, MAX_REVIEW_ITEMS);
  }
  if (value !== undefined) removeKey(STORAGE_KEYS.review);
  return [];
}

export function saveReview(items: ReviewItem[]): boolean {
  return writeJson(STORAGE_KEYS.review, items.slice(0, MAX_REVIEW_ITEMS));
}

export function loadLearn(): LearnProgress {
  const value = readJson(STORAGE_KEYS.learn);
  if (isLearnProgress(value)) {
    return { lessons: { ...value.lessons } };
  }
  if (value !== undefined) removeKey(STORAGE_KEYS.learn);
  return { lessons: {} };
}

export function saveLearn(learn: LearnProgress): boolean {
  return writeJson(STORAGE_KEYS.learn, learn);
}

/** 設定以外の学習データを消す。 */
export function resetStatsStorage(): void {
  removeKey(STORAGE_KEYS.stats);
  removeKey(STORAGE_KEYS.review);
}

/** 設定を含む全データを消す（スキーマ版は残す）。 */
export function clearAllStorage(): void {
  removeKey(STORAGE_KEYS.settings);
  removeKey(STORAGE_KEYS.stats);
  removeKey(STORAGE_KEYS.review);
  removeKey(STORAGE_KEYS.learn);
}
