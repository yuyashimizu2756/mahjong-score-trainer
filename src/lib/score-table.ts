import type { LimitName } from '../engine/types';

/** 点数表の行（20〜110 符。七対子の 25 符を含む）。 */
export const FU_ROWS = [
  20, 25, 30, 40, 50, 60, 70, 80, 90, 100, 110,
] as const;

export const HAN_COLUMNS = [
  1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13,
] as const;

export interface TableCell {
  valid: boolean;
  limit: LimitName;
  yakumanCount: number;
  ron?: number;
  tsumo?: { dealer: number; nonDealer: number };
  total: number;
}

export interface CellOptions {
  dealer: boolean;
  tsumo: boolean;
  /** 0 なら通常の翻数計算。1 以上なら役満。 */
  yakumanCount?: number;
}

function ceil100(value: number): number {
  return Math.ceil(value / 100) * 100;
}

export function limitOf(
  han: number,
  fu: number,
  yakumanCount = 0,
): { basePoints: number; limit: LimitName } {
  if (yakumanCount > 0) {
    return { basePoints: 8000 * yakumanCount, limit: 'yakuman' };
  }
  if (han >= 13) return { basePoints: 8000, limit: 'yakuman' };
  if (han >= 11) return { basePoints: 6000, limit: 'sanbaiman' };
  if (han >= 8) return { basePoints: 4000, limit: 'baiman' };
  if (han >= 6) return { basePoints: 3000, limit: 'haneman' };
  const raw = fu * 2 ** (han + 2);
  if (han >= 5 || raw >= 2000) return { basePoints: 2000, limit: 'mangan' };
  return { basePoints: raw, limit: 'none' };
}

/**
 * その符・翻が実際に成立しうるか。
 * 20 符は平和ツモのみ、25 符は七対子（2 翻以上）のみ。
 */
export function isCellValid(
  fu: number,
  han: number,
  tsumo: boolean,
  yakumanCount = 0,
): boolean {
  if (yakumanCount > 0) return true;
  if (fu === 20 && !tsumo) return false;
  if (fu === 20 && han < 2) return false;
  if (fu === 25 && han < 2) return false;
  return true;
}

const INVALID_CELL: TableCell = {
  valid: false,
  limit: 'none',
  yakumanCount: 0,
  total: 0,
};

/** 符 × 翻から支払いを求める。エンジンと同じ上限・切り上げ規則。 */
export function scoreCell(
  fu: number,
  han: number,
  options: CellOptions,
): TableCell {
  const yakumanCount = options.yakumanCount ?? 0;
  if (!isCellValid(fu, han, options.tsumo, yakumanCount)) {
    return { ...INVALID_CELL };
  }

  const { basePoints, limit } = limitOf(han, fu, yakumanCount);

  if (options.tsumo) {
    if (options.dealer) {
      const each = ceil100(basePoints * 2);
      return {
        valid: true,
        limit,
        yakumanCount,
        tsumo: { dealer: each, nonDealer: each },
        total: each * 3,
      };
    }
    const dealerPay = ceil100(basePoints * 2);
    const nonDealerPay = ceil100(basePoints);
    return {
      valid: true,
      limit,
      yakumanCount,
      tsumo: { dealer: dealerPay, nonDealer: nonDealerPay },
      total: dealerPay + nonDealerPay * 2,
    };
  }

  const ron = ceil100(basePoints * (options.dealer ? 6 : 4));
  return { valid: true, limit, yakumanCount, ron, total: ron };
}

/** 4 択の重複判定に使う支払いの署名。 */
export function cellSignature(cell: TableCell): string {
  if (!cell.valid) return 'invalid';
  if (cell.tsumo) {
    return `t:${cell.tsumo.dealer}:${cell.tsumo.nonDealer}`;
  }
  return `r:${cell.ron ?? 0}`;
}

export function isLimitCell(cell: TableCell): boolean {
  return cell.valid && cell.limit !== 'none';
}
