import { generateProblem } from '../../src/engine/problem';
import { computeScore } from '../../src/engine/score';
import type { Difficulty } from '../../src/engine/types';

const difficulties: Difficulty[] = ['beginner', 'standard', 'advanced'];

function openMeldCount(problem: ReturnType<typeof generateProblem>): number {
  return problem.input.melds.filter((meld) => meld.open).length;
}

function kanCount(problem: ReturnType<typeof generateProblem>): number {
  return problem.input.melds.filter((meld) => meld.type === 'kan').length;
}

describe('出題生成', () => {
  it('3 難易度 × 1000 問がすべて和了形で役 1 以上', () => {
    for (const difficulty of difficulties) {
      for (let seed = 1; seed <= 1000; seed += 1) {
        const problem = generateProblem({ difficulty, seed });
        expect(problem.answer.ok).toBe(true);
        expect(problem.answer.yaku.length).toBeGreaterThanOrEqual(1);
        expect(
          problem.answer.yakuHan >= 1 || problem.answer.yakumanCount > 0,
        ).toBe(true);
        const recomputed = computeScore(problem.input);
        expect(recomputed).toEqual(problem.answer);
        expect(problem.tags.length).toBeGreaterThan(0);
        expect(problem.hint.yaku.length).toBeGreaterThan(0);
      }
    }
  }, 120_000);

  it('難易度ごとの制約を満たす', () => {
    for (const difficulty of difficulties) {
      for (let seed = 1; seed <= 200; seed += 1) {
        const problem = generateProblem({ difficulty, seed });
        const { answer, input } = problem;
        expect(answer.doraHan).toBeGreaterThanOrEqual(0);

        if (difficulty === 'beginner') {
          expect(input.melds).toHaveLength(0);
          expect(answer.doraHan).toBe(0);
          expect(answer.yakumanCount).toBe(0);
          expect(answer.yakuHan).toBeGreaterThanOrEqual(1);
          expect(answer.yakuHan).toBeLessThanOrEqual(2);
          expect(input.ctx.riichi).toBe(false);
          expect(input.ctx.doubleRiichi).toBeFalsy();
          expect(input.ctx.riichiSticks).toBe(0);
          expect(input.ctx.honba).toBe(0);
          expect(input.ctx.doraIndicators).toHaveLength(0);
        }

        if (difficulty === 'standard') {
          expect(openMeldCount(problem)).toBeLessThanOrEqual(1);
          expect(kanCount(problem)).toBe(0);
          expect(answer.yakumanCount).toBe(0);
          expect(answer.yakuHan).toBeGreaterThanOrEqual(1);
          expect(answer.yakuHan).toBeLessThanOrEqual(3);
          expect(answer.doraHan).toBeLessThanOrEqual(1);
          expect(input.ctx.honba).toBe(0);
          expect(input.ctx.riichiSticks).toBe(0);
        }

        if (difficulty === 'advanced') {
          expect(openMeldCount(problem)).toBeLessThanOrEqual(2);
          expect(kanCount(problem)).toBeLessThanOrEqual(1);
          if (answer.yakumanCount === 0) {
            expect(answer.yakuHan).toBeGreaterThanOrEqual(1);
            expect(answer.yakuHan).toBeLessThanOrEqual(6);
          }
          expect(answer.doraHan).toBeLessThanOrEqual(3);
          expect(input.ctx.honba).toBeLessThanOrEqual(3);
          expect(input.ctx.riichiSticks).toBeLessThanOrEqual(2);
        }
      }
    }
  }, 60_000);

  it('七対子と国士無双が難易度に応じて混ざる', () => {
    let standardChiitoitsu = 0;
    let advancedChiitoitsu = 0;
    let advancedKokushi = 0;
    for (let seed = 1; seed <= 1000; seed += 1) {
      const standard = generateProblem({ difficulty: 'standard', seed });
      if (standard.tags.includes('chiitoitsu')) standardChiitoitsu += 1;

      const advanced = generateProblem({ difficulty: 'advanced', seed });
      if (advanced.tags.includes('chiitoitsu')) advancedChiitoitsu += 1;
      if (advanced.tags.includes('kokushi')) {
        advancedKokushi += 1;
        expect(advanced.answer.yakumanCount).toBe(1);
      }
    }
    expect(standardChiitoitsu).toBeGreaterThanOrEqual(40);
    expect(advancedChiitoitsu).toBeGreaterThanOrEqual(40);
    expect(advancedKokushi).toBeGreaterThanOrEqual(5);
  }, 120_000);

  it('同じ seed と同じオプションは常に同じ問題', () => {
    for (const difficulty of difficulties) {
      const first = generateProblem({ difficulty, seed: 12345 });
      const second = generateProblem({ difficulty, seed: 12345 });
      expect(second).toEqual(first);
    }
  });

  it('avoidTags に指定した役を避ける', () => {
    for (const difficulty of difficulties) {
      for (let seed = 1; seed <= 30; seed += 1) {
        const problem = generateProblem({
          difficulty,
          seed,
          avoidTags: ['tanyao'],
        });
        expect(problem.tags).not.toContain('tanyao');
      }
    }
  });

  it('tags は成立役の id、hint は役名と符の内訳', () => {
    const problem = generateProblem({ difficulty: 'standard', seed: 99 });
    const ids = problem.answer.yaku.map((yaku) => yaku.id);
    expect(problem.tags).toEqual(ids);
    expect(problem.hint.yaku).toEqual(problem.answer.yaku.map((yaku) => yaku.name));
    expect(problem.hint.fu.length).toBeGreaterThan(0);
  });

  it('問題 ID は難易度と seed から決まる', () => {
    const problem = generateProblem({ difficulty: 'beginner', seed: 1 });
    expect(problem.id.startsWith('mst-beginner-1-')).toBe(true);
    expect(problem.difficulty).toBe('beginner');
  });

  it('全問、副露と手牌の枚数が整合する', () => {
    for (const difficulty of difficulties) {
      for (let seed = 1; seed <= 100; seed += 1) {
        const problem = generateProblem({ difficulty, seed });
        const logical =
          problem.input.concealed.length + problem.input.melds.length * 3;
        expect(logical).toBe(14);
        expect(
          problem.input.concealed.some(
            (tile) =>
              tile.suit === problem.input.winTile.suit &&
              tile.rank === problem.input.winTile.rank,
          ),
        ).toBe(true);
      }
    }
  });
});
