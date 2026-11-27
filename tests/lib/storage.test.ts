import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_SETTINGS,
  STORAGE_KEYS,
  clearAllStorage,
  getStorage,
  initStorage,
  loadLearn,
  loadReview,
  loadSettings,
  loadStats,
  resetStatsStorage,
  saveLearn,
  saveReview,
  saveSettings,
  saveStats,
  type ReviewItem,
} from '../../src/lib/storage';
import { generateProblem } from '../../src/engine/problem';
import {
  defaultDrillState,
  loadDrill,
  saveDrill,
} from '../../src/lib/srs';

function seedStorage(): void {
  window.localStorage.clear();
  initStorage();
}

function makeReviewItem(): ReviewItem {
  const problem = generateProblem({ difficulty: 'beginner', seed: 42 });
  return {
    id: problem.id,
    input: problem.input,
    answer: problem.answer,
    tags: problem.tags,
    misses: 2,
    addedAt: 1234,
  };
}

describe('storage', () => {
  beforeEach(() => {
    seedStorage();
  });

  it('設定を保存して復元する', () => {
    const next = {
      ...DEFAULT_SETTINGS,
      answerMode: 'step' as const,
      defaultDifficulty: 'advanced' as const,
      tileSize: 'lg' as const,
      colorBlindSuits: false,
      reduceMotion: true,
      displayMode: 'three' as const,
    };
    expect(saveSettings(next)).toBe(true);
    expect(loadSettings()).toEqual(next);
  });

  it('displayMode の既定は css3d', () => {
    expect(DEFAULT_SETTINGS.displayMode).toBe('css3d');
    expect(loadSettings()).toEqual(
      expect.objectContaining({ displayMode: 'css3d' }),
    );
  });

  it('displayMode を持たない古い保存データは css3d として読む（後方互換）', () => {
    const legacy = {
      answerMode: 'step',
      defaultDifficulty: 'standard',
      tileSize: 'sm',
      colorBlindSuits: false,
      reduceMotion: true,
    };
    window.localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify(legacy),
    );
    expect(loadSettings()).toEqual({ ...legacy, displayMode: 'css3d' });
    // 有効なデータなので消さない。
    expect(window.localStorage.getItem(STORAGE_KEYS.settings)).not.toBeNull();
  });

  it('displayMode が不正なら設定ごと初期化する', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ ...DEFAULT_SETTINGS, displayMode: 'webgl' }),
    );
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(window.localStorage.getItem(STORAGE_KEYS.settings)).toBeNull();
  });

  it('3 モードをすべて保存・復元できる', () => {
    for (const displayMode of ['2d', 'css3d', 'three'] as const) {
      saveSettings({ ...DEFAULT_SETTINGS, displayMode });
      expect(loadSettings().displayMode).toBe(displayMode);
    }
  });

  it('成績を保存して復元する', () => {
    expect(
      saveStats({
        total: 3,
        correct: 2,
        streak: 1,
        bestStreak: 2,
        byYaku: { pinfu: { total: 2, correct: 1 } },
        byDay: { '2026-11-27': { total: 3, correct: 2 } },
      }),
    ).toBe(true);
    const loaded = loadStats();
    expect(loaded.total).toBe(3);
    expect(loaded.byYaku.pinfu).toEqual({ total: 2, correct: 1 });
    expect(loaded.byDay['2026-11-27']).toEqual({ total: 3, correct: 2 });
  });

  it('復習キューを保存して復元する', () => {
    const item = makeReviewItem();
    expect(saveReview([item])).toBe(true);
    expect(loadReview()).toEqual([item]);
  });

  it('学習進捗を保存して復元する', () => {
    expect(
      saveLearn({
        lessons: { basics: { completed: true, quizCorrect: 3, quizTotal: 3 } },
      }),
    ).toBe(true);
    expect(loadLearn().lessons.basics).toEqual({
      completed: true,
      quizCorrect: 3,
      quizTotal: 3,
    });
  });

  it('ドリル状態を保存して復元する', () => {
    const state = defaultDrillState();
    state.cards['score:abc'] = {
      id: 'score:abc',
      kind: 'score',
      level: 2,
      dueAt: 1_700_000_000_000,
      correct: 3,
      total: 4,
    };
    state.stats.total = 4;
    state.stats.correct = 3;
    state.stats.bestStreak = 3;
    state.stats.byDay['2026-11-27'] = { total: 4, correct: 3 };
    expect(saveDrill(state)).toBe(true);
    expect(loadDrill()).toEqual(state);
  });

  it('壊れたドリル JSON は初期化する', () => {
    window.localStorage.setItem(STORAGE_KEYS.drill, '{broken');
    expect(() => loadDrill()).not.toThrow();
    expect(loadDrill()).toEqual(defaultDrillState());
    expect(window.localStorage.getItem(STORAGE_KEYS.drill)).toBeNull();
  });

  it('型が違うドリル状態は初期化する', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.drill,
      JSON.stringify({ cards: { a: { level: 99 } }, stats: {} }),
    );
    expect(loadDrill()).toEqual(defaultDrillState());
  });

  it('壊れた JSON は初期化して継続する', () => {    window.localStorage.setItem(STORAGE_KEYS.settings, '{not json');
    expect(() => loadSettings()).not.toThrow();
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(window.localStorage.getItem(STORAGE_KEYS.settings)).toBeNull();
  });

  it('型が一致しない値は初期化する', () => {
    window.localStorage.setItem(
      STORAGE_KEYS.settings,
      JSON.stringify({ answerMode: 'unknown', defaultDifficulty: 1 }),
    );
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(loadStats().total).toBe(0);
  });

  it('スキーマ版が違えば名前空間を初期化する', () => {
    saveSettings({ ...DEFAULT_SETTINGS, answerMode: 'step' });
    saveStats({
      total: 1,
      correct: 0,
      streak: 0,
      bestStreak: 0,
      byYaku: {},
      byDay: {},
    });
    window.localStorage.setItem(STORAGE_KEYS.schema, '0');
    initStorage();
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(loadStats().total).toBe(0);
    expect(window.localStorage.getItem(STORAGE_KEYS.schema)).toBe('1');
  });

  it('容量例外でも例外を投げず false を返す', () => {
    const spy = vi
      .spyOn(Storage.prototype, 'setItem')
      .mockImplementation(() => {
        throw new Error('QuotaExceededError');
      });
    expect(() => saveSettings(DEFAULT_SETTINGS)).not.toThrow();
    expect(saveSettings(DEFAULT_SETTINGS)).toBe(false);
    spy.mockRestore();
  });

  it('window がなくても安全に動く', () => {
    vi.stubGlobal('window', undefined);
    expect(getStorage()).toBeNull();
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(saveSettings(DEFAULT_SETTINGS)).toBe(false);
    expect(loadReview()).toEqual([]);
    vi.unstubAllGlobals();
  });

  it('全データ削除で設定・成績・復習・学習が消える', () => {
    saveSettings(DEFAULT_SETTINGS);
    saveLearn({
      lessons: { basics: { completed: true, quizCorrect: 3, quizTotal: 3 } },
    });
    const drill = defaultDrillState();
    drill.stats.total = 5;
    saveDrill(drill);
    clearAllStorage();
    expect(loadSettings()).toEqual(DEFAULT_SETTINGS);
    expect(loadReview()).toEqual([]);
    expect(loadLearn().lessons).toEqual({});
    expect(loadDrill()).toEqual(defaultDrillState());
  });

  it('成績リセットでドリル状態も消える', () => {
    const drill = defaultDrillState();
    drill.cards['fu:a'] = {
      id: 'fu:a',
      kind: 'fu',
      level: 3,
      dueAt: 1,
      correct: 1,
      total: 1,
    };
    saveDrill(drill);
    resetStatsStorage();
    expect(loadDrill()).toEqual(defaultDrillState());
  });
});
