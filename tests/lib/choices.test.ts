import { describe, expect, it } from 'vitest';
import { generateProblem } from '../../src/engine/problem';
import type { Difficulty } from '../../src/engine/types';
import {
  generateFuChoices,
  generateHanChoices,
  generatePointChoices,
  generateStepChoices,
} from '../../src/lib/choices';
import { paymentView } from '../../src/lib/format';

const DIFFICULTIES: Difficulty[] = ['beginner', 'standard', 'advanced'];

function expectedLabel(problem: ReturnType<typeof generateProblem>): string {
  return paymentView({
    ron: problem.answer.payments.ron,
    tsumo: problem.answer.payments.tsumo,
    total: problem.answer.payments.total,
    dealer: problem.input.ctx.seatWind === 1,
  }).label;
}

describe('choices', () => {
  it('4 択は重複がなく、正解を 1 つ含み、正解の表示が支払いと一致する', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= 12; seed += 1) {
        const problem = generateProblem({ difficulty, seed });
        const choices = generatePointChoices(problem);
        expect(choices).toHaveLength(4);
        expect(new Set(choices.map((choice) => choice.label)).size).toBe(4);
        expect(choices.filter((choice) => choice.correct)).toHaveLength(1);
        const correct = choices.find((choice) => choice.correct);
        expect(correct?.label).toBe(expectedLabel(problem));
      }
    }
  });

  it('誤答は正解と近い（符か翻が 1 項目だけ違う候補を含む）', () => {
    for (const difficulty of DIFFICULTIES) {
      for (let seed = 1; seed <= 12; seed += 1) {
        const problem = generateProblem({ difficulty, seed });
        if (problem.answer.yakumanCount > 0) continue;
        const choices = generatePointChoices(problem);
        const correct = choices.find((choice) => choice.correct);
        const wrong = choices.filter((choice) => !choice.correct);
        expect(correct).toBeDefined();
        const correctDetail = correct?.detail ?? '';
        const close = wrong.some((choice) => {
          const [fu, han] = choice.detail.split(' ');
          const [correctFu, correctHan] = correctDetail.split(' ');
          return fu === correctFu || han === correctHan;
        });
        expect(close).toBe(true);
        for (const choice of wrong) {
          expect(choice.value).toBeGreaterThan(0);
          expect(choice.value).toBeLessThan(200000);
        }
      }
    }
  });

  it('同じ問題には同じ選択肢を返す（決定的）', () => {
    const problem = generateProblem({ difficulty: 'standard', seed: 99 });
    expect(generatePointChoices(problem)).toEqual(generatePointChoices(problem));
  });

  it('ステップの翻・符・点数は各 4 択で正解を 1 つ含む', () => {
    for (const difficulty of DIFFICULTIES) {
      const problem = generateProblem({ difficulty, seed: 7 });
      const step = generateStepChoices(problem);
      for (const choices of [step.han, step.fu, step.points]) {
        expect(choices).toHaveLength(4);
        expect(new Set(choices.map((choice) => choice.label)).size).toBe(4);
        expect(choices.filter((choice) => choice.correct)).toHaveLength(1);
      }
      expect(generateHanChoices(problem).find((c) => c.correct)?.value).toBe(
        problem.answer.yakumanCount > 0
          ? problem.answer.yakumanCount
          : problem.answer.han,
      );
      expect(generateFuChoices(problem).find((c) => c.correct)?.value).toBe(
        problem.answer.fu,
      );
    }
  });

  it('役満でも 4 択が成立する', () => {
    let yakumanProblem;
    for (const difficulty of ['advanced'] as const) {
      for (let seed = 1; seed <= 400; seed += 1) {
        const problem = generateProblem({ difficulty, seed });
        if (problem.answer.yakumanCount > 0) {
          yakumanProblem = problem;
          break;
        }
      }
    }
    expect(yakumanProblem).toBeDefined();
    if (!yakumanProblem) return;
    const choices = generatePointChoices(yakumanProblem);
    expect(choices).toHaveLength(4);
    expect(choices.filter((choice) => choice.correct)).toHaveLength(1);
  });
});
