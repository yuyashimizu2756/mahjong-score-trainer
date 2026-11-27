import { describe, expect, it } from 'vitest';
import {
  DRILL_KIND_META,
  allDrillQuestions,
  allQuestions,
  buildDrillSession,
  drillQuestionById,
  drillQuestionForSeed,
} from '../../src/features/memorize/drills';
import { DRILL_KINDS, defaultDrillState } from '../../src/lib/srs';
import { paymentView } from '../../src/lib/format';
import { scoreCell } from '../../src/lib/score-table';
import { yakuById } from '../../src/data/yaku';

const KINDS = [...DRILL_KINDS];

describe('暗記ドリル生成', () => {
  it('4 種類 × 100 シードで選択肢・正解・説明が成立する', () => {
    for (const kind of KINDS) {
      for (let seed = 0; seed < 100; seed += 1) {
        const question = drillQuestionForSeed(kind, seed);
        expect(question.kind).toBe(kind);
        expect(question.id.startsWith(`${kind}:`)).toBe(true);
        expect(question.choices).toHaveLength(4);
        expect(new Set(question.choices.map((choice) => choice.label)).size).toBe(
          4,
        );
        expect(question.correctIndex).toBeGreaterThanOrEqual(0);
        expect(question.correctIndex).toBeLessThan(4);
        expect(
          question.choices[question.correctIndex].label.length,
        ).toBeGreaterThan(0);
        expect(question.explanation.length).toBeGreaterThan(10);
        expect(question.prompt.length).toBeGreaterThan(0);
      }
    }
  });

  it('id は種類ごとに一意で、id から問題を引ける', () => {
    const questions = allQuestions();
    expect(new Set(questions.map((question) => question.id)).size).toBe(
      questions.length,
    );
    const sample = questions[Math.floor(questions.length / 2)];
    expect(drillQuestionById(sample.id)?.id).toBe(sample.id);
    expect(drillQuestionById('unknown:0')).toBeNull();
  });

  it('点数表穴埋めと支払いクイズの正解は score-table と一致する', () => {
    for (const kind of ['score', 'payment'] as const) {
      const questions = allDrillQuestions(kind);
      expect(questions.length).toBeGreaterThan(50);
      for (const question of questions) {
        const { fu, han, dealer, tsumo } = question.meta;
        expect(fu).toBeDefined();
        expect(han).toBeDefined();
        const cell = scoreCell(fu!, han!, {
          dealer: Boolean(dealer),
          tsumo: Boolean(tsumo),
        });
        expect(cell.valid).toBe(true);
        const label = paymentView({
          ron: cell.ron,
          tsumo: cell.tsumo,
          total: cell.total,
          dealer: Boolean(dealer),
        }).label;
        expect(question.choices[question.correctIndex].label).toBe(label);
      }
    }
  });

  it('翻数カードの正解は YAKU_CATALOG と一致する', () => {
    const questions = allDrillQuestions('han');
    expect(questions.length).toBeGreaterThan(20);
    for (const question of questions) {
      const id = question.meta.yakuId;
      expect(id).toBeDefined();
      const entry = yakuById(id!);
      expect(entry).toBeDefined();
      const expected = question.meta.open ? entry?.openHan : entry?.closedHan;
      expect(expected).toBeDefined();
      expect(question.choices[question.correctIndex].label).toBe(
        `${expected} 翻`,
      );
      expect(question.explanation).toContain(entry!.name);
    }
  });

  it('符カウントの面子問題は 2 / 4 / 8 / 16 / 32 のいずれか', () => {
    const melds = allDrillQuestions('fu').filter((question) =>
      question.key.startsWith('meld:'),
    );
    expect(melds.length).toBeGreaterThanOrEqual(8);
    for (const question of melds) {
      expect([2, 4, 8, 16, 32]).toContain(question.meta.expectedFu);
    }
  });

  it('合計符は 10 符切り上げ（平和ツモ 20・喰い平和形ロン 30 を除く）', () => {
    const totals = allDrillQuestions('fu').filter((question) =>
      question.key.startsWith('total:'),
    );
    expect(totals.length).toBeGreaterThanOrEqual(4);
    for (const question of totals) {
      const raw = question.meta.rawFu!;
      const expected = question.meta.expectedFu!;
      if (question.key === 'total:pinfu-tsumo') {
        expect(raw).toBe(20);
        expect(expected).toBe(20);
      } else if (question.key === 'total:kuipinfu-ron') {
        expect(raw).toBe(20);
        expect(expected).toBe(30);
      } else {
        expect(expected).toBe(Math.ceil(raw / 10) * 10);
      }
      expect(question.choices[question.correctIndex].label).toBe(
        `${expected} 符`,
      );
    }
  });

  it('全種類のメタ情報を持つ', () => {
    for (const kind of KINDS) {
      expect(DRILL_KIND_META[kind].name.length).toBeGreaterThan(0);
      expect(DRILL_KIND_META[kind].description.length).toBeGreaterThan(0);
    }
  });

  it('セッションは 10 問で、同じ問題を含まない', () => {
    const state = defaultDrillState();
    const session = buildDrillSession(state, undefined, Date.now(), 42);
    expect(session).toHaveLength(10);
    expect(new Set(session.map((question) => question.id)).size).toBe(10);
  });

  it('既習カードは期限が来ていれば新しい問題より先に出る', () => {
    const now = Date.now();
    const state = defaultDrillState();
    const seen = allDrillQuestions('fu')[0];
    state.cards[seen.id] = {
      id: seen.id,
      kind: 'fu',
      level: 0,
      dueAt: now - 1,
      correct: 0,
      total: 1,
    };
    const session = buildDrillSession(state, undefined, now, 7);
    expect(session[0].id).toBe(seen.id);
  });
});
