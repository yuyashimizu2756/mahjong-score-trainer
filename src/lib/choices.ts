import type { Problem } from '../engine/types';
import { formatFu, formatHan, formatNumber, paymentView } from './format';
import {
  cellSignature,
  FU_ROWS,
  HAN_COLUMNS,
  scoreCell,
  type TableCell,
} from './score-table';

export interface PointChoice {
  id: string;
  label: string;
  value: number;
  detail: string;
  correct: boolean;
}

function hashString(input: string): number {
  let hash = 0x811c9dc5;
  for (let index = 0; index < input.length; index += 1) {
    hash ^= input.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function seededShuffle<T>(items: readonly T[], seed: string): T[] {
  const result = [...items];
  let state = hashString(seed) >>> 0;
  for (let i = result.length - 1; i > 0; i -= 1) {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    const random = ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    const j = Math.floor(random * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function isDealer(seatWind: number): boolean {
  return seatWind === 1;
}

function describeCell(cell: TableCell, fu: number, han: number): string {
  if (cell.yakumanCount > 0) {
    return cell.yakumanCount >= 2 ? `${cell.yakumanCount} 倍役満` : '役満';
  }
  return `${formatFu(fu)} ${formatHan(han)}`;
}

function labelFor(
  cell: TableCell,
  dealer: boolean,
): string {
  return paymentView({
    ron: cell.ron,
    tsumo: cell.tsumo,
    total: cell.total,
    dealer,
  }).label;
}

function correctCell(problem: Problem): TableCell {
  const { answer } = problem;
  return {
    valid: true,
    limit: answer.limit,
    yakumanCount: answer.yakumanCount,
    ron: answer.payments.ron,
    tsumo: answer.payments.tsumo,
    total: answer.payments.total,
  };
}

interface Candidate {
  fu: number;
  han: number;
  yakumanCount: number;
  cell: TableCell;
  label: string;
  detail: string;
  distance: number;
}

/**
 * 4 択の点数選択肢。正解 + 符違い/翻違い/満貫境界の近い誤答 3 つ。
 */
export function generatePointChoices(problem: Problem): PointChoice[] {
  const { answer, input } = problem;
  const dealer = isDealer(input.ctx.seatWind);
  const tsumo = input.ctx.tsumo;
  const correct = correctCell(problem);
  const correctSignature = cellSignature(correct);
  const correctLabel = labelFor(correct, dealer);

  const correctChoice: PointChoice = {
    id: 'correct',
    label: correctLabel,
    value: correct.total,
    detail:
      answer.yakumanCount > 0
        ? answer.yakumanCount >= 2
          ? `${answer.yakumanCount} 倍役満`
          : '役満'
        : `${formatFu(answer.fu)} ${formatHan(answer.han)}`,
    correct: true,
  };

  const used = new Set<string>([correctSignature]);
  const candidates: Candidate[] = [];

  const pushCandidate = (
    fu: number,
    han: number,
    yakumanCount: number,
  ): void => {
    const cell = scoreCell(fu, han, { dealer, tsumo, yakumanCount });
    if (!cell.valid) return;
    const signature = cellSignature(cell);
    if (used.has(signature)) return;
    used.add(signature);
    candidates.push({
      fu,
      han,
      yakumanCount,
      cell,
      label: labelFor(cell, dealer),
      detail: describeCell(cell, fu, han),
      distance: Math.abs(cell.total - correct.total),
    });
  };

  if (answer.yakumanCount > 0) {
    for (const count of [answer.yakumanCount + 1, answer.yakumanCount + 2, 3, 2, 1]) {
      if (count >= 1 && count !== answer.yakumanCount) pushCandidate(30, 0, count);
    }
  } else {
    const fuDeltas = [10, -10, 20, -20, 30, -30, 0];
    const hanDeltas = [0, 1, -1, 2, -2, 3, -3, 4];
    for (const fuDelta of fuDeltas) {
      const fu = answer.fu + fuDelta;
      if (!(FU_ROWS as readonly number[]).includes(fu)) continue;
      for (const hanDelta of hanDeltas) {
        const han = answer.han + hanDelta;
        if (han < 1 || han > 13) continue;
        pushCandidate(fu, han, 0);
      }
    }
    // 満貫の境界を必ず候補に含める。
    for (const han of [5, 6, 8, 11, 13]) {
      if (han !== answer.han) pushCandidate(answer.fu, han, 0);
    }
  }

  const chosen = [...candidates]
    .sort((a, b) => {
      if (a.distance !== b.distance) return a.distance - b.distance;
      return a.label.localeCompare(b.label, 'ja');
    })
    .slice(0, 3);

  // 候補が足りない場合の保険（通常は起こらない）。
  if (chosen.length < 3) {
    for (const fu of FU_ROWS) {
      for (const han of HAN_COLUMNS) {
        if (chosen.length >= 3) break;
        const cell = scoreCell(fu, han, { dealer, tsumo });
        if (!cell.valid) continue;
        const signature = cellSignature(cell);
        if (used.has(signature)) continue;
        used.add(signature);
        chosen.push({
          fu,
          han,
          yakumanCount: 0,
          cell,
          label: labelFor(cell, dealer),
          detail: describeCell(cell, fu, han),
          distance: Math.abs(cell.total - correct.total),
        });
      }
    }
  }

  const wrong: PointChoice[] = chosen.map((candidate, index) => ({
    id: `wrong-${index}`,
    label: candidate.label,
    value: candidate.cell.total,
    detail: candidate.detail,
    correct: false,
  }));

  return seededShuffle([correctChoice, ...wrong], `${problem.id}:points`);
}

/** ステップ回答の翻数選択肢。 */
export function generateHanChoices(
  problem: Problem,
): PointChoice[] {
  const { answer } = problem;
  if (answer.yakumanCount > 0) {
    const counts = new Set<number>([answer.yakumanCount]);
    for (const delta of [1, -1, 2, -2, 3]) {
      const candidate = answer.yakumanCount + delta;
      if (candidate >= 1) counts.add(candidate);
    }
    const sortedCounts = [...counts]
      .sort((a, b) => {
        const diff =
          Math.abs(a - answer.yakumanCount) - Math.abs(b - answer.yakumanCount);
        return diff !== 0 ? diff : a - b;
      })
      .slice(0, 4);
    return seededShuffle(
      sortedCounts.map((count) => ({
        id: `han-${count}`,
        label: count >= 2 ? `${count} 倍役満` : '役満',
        value: count,
        detail: '役満',
        correct: count === answer.yakumanCount,
      })),
      `${problem.id}:han`,
    );
  }

  const values = new Set<number>([answer.han]);
  for (const delta of [1, -1, 2, -2, 3, -3]) {
    const candidate = answer.han + delta;
    if (candidate >= 1 && candidate <= 13) values.add(candidate);
  }
  for (const boundary of [5, 6, 8, 11, 13]) values.add(boundary);

  const sorted = [...values]
    .sort((a, b) => {
      const diff = Math.abs(a - answer.han) - Math.abs(b - answer.han);
      return diff !== 0 ? diff : a - b;
    })
    .slice(0, 4);

  return seededShuffle(
    sorted.map((han) => ({
      id: `han-${han}`,
      label: formatHan(han),
      value: han,
      detail: han >= 13 ? '数え役満' : '',
      correct: han === answer.han,
    })),
    `${problem.id}:han`,
  );
}

/** ステップ回答の符選択肢。 */
export function generateFuChoices(problem: Problem): PointChoice[] {
  const { answer } = problem;
  const values = [...new Set<number>([answer.fu])];
  for (const fu of FU_ROWS) {
    if (!values.includes(fu)) values.push(fu);
  }
  const sorted = values
    .sort((a, b) => {
      const diff = Math.abs(a - answer.fu) - Math.abs(b - answer.fu);
      return diff !== 0 ? diff : a - b;
    })
    .slice(0, 4);

  return seededShuffle(
    sorted.map((fu) => ({
      id: `fu-${fu}`,
      label: formatFu(fu),
      value: fu,
      detail: '',
      correct: fu === answer.fu,
    })),
    `${problem.id}:fu`,
  );
}

export interface StepChoiceSet {
  han: PointChoice[];
  fu: PointChoice[];
  points: PointChoice[];
}

export function generateStepChoices(problem: Problem): StepChoiceSet {
  return {
    han: generateHanChoices(problem),
    fu: generateFuChoices(problem),
    points: generatePointChoices(problem),
  };
}

export function choiceSummary(choice: PointChoice): string {
  return choice.detail ? `${choice.label}（${choice.detail}）` : choice.label;
}

export function formatChoiceValue(value: number): string {
  return formatNumber(value);
}
