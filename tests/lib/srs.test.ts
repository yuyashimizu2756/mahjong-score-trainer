import { describe, expect, it } from 'vitest';
import {
  DAY_MS,
  MAX_SRS_LEVEL,
  applyDrillAnswer,
  createDrillCard,
  defaultDrillState,
  intervalDays,
  isDue,
  pickDrillSession,
  reviewDrillCard,
  type DrillCard,
  type DrillPoolItem,
} from '../../src/lib/srs';

const NOW = 1_700_000_000_000;

function card(
  id: string,
  level: number,
  dueAt: number,
  overrides: Partial<DrillCard> = {},
): DrillCard {
  return {
    id,
    kind: 'score',
    level,
    dueAt,
    correct: 3,
    total: 4,
    ...overrides,
  };
}

describe('SRS', () => {
  it('level ごとの間隔は 1 / 1 / 3 / 7 / 14 / 30 日', () => {
    expect([0, 1, 2, 3, 4, 5].map(intervalDays)).toEqual([
      1, 1, 3, 7, 14, 30,
    ]);
    expect(intervalDays(-1)).toBe(1);
    expect(intervalDays(99)).toBe(30);
  });

  it('正解で level が上がり、次の期限が間隔どおりになる', () => {
    let current = createDrillCard('card-1', 'score', NOW);
    const dueDays: number[] = [];
    for (let step = 0; step < 5; step += 1) {
      current = reviewDrillCard(current, true, NOW);
      expect(current.level).toBe(step + 1);
      dueDays.push(Math.round((current.dueAt - NOW) / DAY_MS));
    }
    expect(dueDays).toEqual([1, 3, 7, 14, 30]);
    expect(current.total).toBe(5);
    expect(current.correct).toBe(5);

    const capped = reviewDrillCard(current, true, NOW);
    expect(capped.level).toBe(MAX_SRS_LEVEL);
    expect(Math.round((capped.dueAt - NOW) / DAY_MS)).toBe(30);
  });

  it('誤答で level 0・翌日・不正解数が増える', () => {
    const previous = card('card-2', 4, NOW + 10 * DAY_MS, {
      correct: 2,
      total: 5,
    });
    const next = reviewDrillCard(previous, false, NOW);
    expect(next.level).toBe(0);
    expect(next.dueAt).toBe(NOW + DAY_MS);
    expect(next.total).toBe(6);
    expect(next.correct).toBe(2);
    expect(isDue(next, NOW)).toBe(false);
    expect(isDue(next, NOW + DAY_MS)).toBe(true);
  });

  it('期限が来たカード → level の低い既習 → 新規 の順に選ぶ', () => {
    const cards: Record<string, DrillCard> = {
      a: card('a', 4, NOW - 1_000),
      b: card('b', 1, NOW - 2_000),
      c: card('c', 0, NOW + DAY_MS),
      d: card('d', 3, NOW + 2 * DAY_MS),
    };
    const pool: DrillPoolItem[] = [
      { id: 'a', kind: 'score' },
      { id: 'b', kind: 'score' },
      { id: 'c', kind: 'score' },
      { id: 'd', kind: 'score' },
      { id: 'e', kind: 'fu' },
      { id: 'f', kind: 'fu' },
    ];
    const picks = pickDrillSession({
      cards,
      pool,
      now: NOW,
      size: 5,
      random: () => 0.5,
    });
    expect(picks.map((pick) => pick.id)).toEqual(['b', 'a', 'c', 'd', 'e']);
    expect(picks.map((pick) => pick.source)).toEqual([
      'due',
      'due',
      'review',
      'review',
      'new',
    ]);
  });

  it('同じ問題を連続で出さず、size を超えない', () => {
    const pool: DrillPoolItem[] = Array.from({ length: 20 }, (_, index) => ({
      id: `q-${index}`,
      kind: 'han' as const,
    }));
    const picks = pickDrillSession({
      cards: {},
      pool,
      now: NOW,
      size: 10,
      excludeId: 'q-3',
      random: () => 0.25,
    });
    expect(picks).toHaveLength(10);
    expect(picks.some((pick) => pick.id === 'q-3')).toBe(false);
    expect(new Set(picks.map((pick) => pick.id)).size).toBe(10);
  });

  it('既習カードだけが残っていても新規が 7 問は入る', () => {
    const cards: Record<string, DrillCard> = {};
    const pool: DrillPoolItem[] = [];
    for (let index = 0; index < 10; index += 1) {
      const id = `seen-${index}`;
      cards[id] = card(id, 1, NOW + DAY_MS);
      pool.push({ id, kind: 'han' });
    }
    for (let index = 0; index < 50; index += 1) {
      pool.push({ id: `new-${index}`, kind: 'han' });
    }
    const picks = pickDrillSession({
      cards,
      pool,
      now: NOW,
      size: 10,
      random: () => 0.5,
    });
    expect(picks).toHaveLength(10);
    expect(picks.filter((pick) => pick.source === 'review')).toHaveLength(3);
    expect(picks.filter((pick) => pick.source === 'new')).toHaveLength(7);
  });

  it('回答を状態へ反映すると成績と連続が更新される', () => {
    let state = defaultDrillState();
    state = applyDrillAnswer(state, {
      id: 'q-1',
      kind: 'fu',
      correct: true,
      now: NOW,
      day: '2026-11-27',
    });
    state = applyDrillAnswer(state, {
      id: 'q-2',
      kind: 'fu',
      correct: true,
      now: NOW,
      day: '2026-11-27',
    });
    expect(state.stats.total).toBe(2);
    expect(state.stats.correct).toBe(2);
    expect(state.stats.streak).toBe(2);
    expect(state.stats.bestStreak).toBe(2);
    expect(state.stats.byDay['2026-11-27']).toEqual({ total: 2, correct: 2 });

    state = applyDrillAnswer(state, {
      id: 'q-1',
      kind: 'fu',
      correct: false,
      now: NOW,
      day: '2026-11-27',
    });
    expect(state.stats.streak).toBe(0);
    expect(state.stats.bestStreak).toBe(2);
    expect(state.cards['q-1']).toMatchObject({
      level: 0,
      correct: 1,
      total: 2,
    });
  });
});
